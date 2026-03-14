#!/usr/bin/env node
/**
 * dforge-voice — Headless Discord voice worker
 * 
 * Spawned by OpenClaw to join a voice channel and bridge audio
 * to/from the OpenAI Realtime API.
 * 
 * Usage:
 *   node index.js --guild <id> --channel <id>
 *   node index.js --guild <id> --leave
 * 
 * Env vars:
 *   DISCORD_TOKEN          - Bot token
 *   OPENAI_REALTIME_ENDPOINT - WebSocket URL for OpenAI Realtime
 *   OPENAI_REALTIME_API_KEY  - API key
 *   OPENAI_REALTIME_MODEL    - Model name (default: gpt-realtime-1.5)
 *   VOICE_SYSTEM_PROMPT      - System prompt for the AI
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioReceiveStream,
  EndBehaviorType,
  StreamType,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { WebSocket } from 'ws';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import prism from 'prism-media';

// --- CLI arg parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { guildId: null, channelId: null, leave: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--guild': case '-g': config.guildId = args[++i]; break;
      case '--channel': case '-c': config.channelId = args[++i]; break;
      case '--leave': case '-l': config.leave = true; break;
    }
  }
  if (!config.guildId) {
    console.error('Usage: node index.js --guild <id> --channel <id>');
    process.exit(1);
  }
  if (!config.leave && !config.channelId) {
    console.error('Error: --channel required unless --leave');
    process.exit(1);
  }
  return config;
}

const config = parseArgs();
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error('DISCORD_TOKEN required'); process.exit(1); }

const WS_ENDPOINT = process.env.OPENAI_REALTIME_ENDPOINT || '';
const WS_API_KEY = process.env.OPENAI_REALTIME_API_KEY || '';
const WS_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-1.5';
const SYSTEM_PROMPT = process.env.VOICE_SYSTEM_PROMPT || 'You are Icarus, a creative AI operator. Keep responses concise for voice.';

// --- OpenAI Realtime bridge ---
class RealtimeBridge {
  constructor() {
    this.ws = null;
    this.onAudioDelta = null; // callback: (pcm16Buffer) => void
  }

  async connect() {
    const url = `${WS_ENDPOINT}?api-version=2025-04-01-preview&deployment=${WS_MODEL}`;
    console.log(`[realtime] Connecting to ${url}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: { 'api-key': WS_API_KEY },
      });

      this.ws.on('open', () => {
        console.log('[realtime] WebSocket connected');
        // Configure session
        this.ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: SYSTEM_PROMPT,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this._handleEvent(event);
        } catch (e) {
          console.error('[realtime] Parse error:', e.message);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[realtime] WebSocket error:', err.message);
        reject(err);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[realtime] WebSocket closed: ${code} ${reason}`);
      });

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 15000);
    });
  }

  _handleEvent(event) {
    switch (event.type) {
      case 'session.created':
        console.log('[realtime] Session created');
        break;
      case 'session.updated':
        console.log('[realtime] Session configured');
        break;
      case 'response.audio.delta':
        if (event.delta && this.onAudioDelta) {
          const pcmBuf = Buffer.from(event.delta, 'base64');
          this.onAudioDelta(pcmBuf);
        }
        break;
      case 'response.audio_transcript.delta':
        if (event.delta) {
          process.stdout.write(`[AI] ${event.delta}`);
        }
        break;
      case 'response.audio_transcript.done':
        console.log(''); // newline after transcript
        break;
      case 'input_audio_buffer.speech_started':
        console.log('[vad] Speech started');
        break;
      case 'input_audio_buffer.speech_stopped':
        console.log('[vad] Speech stopped');
        break;
      case 'response.done':
        console.log('[realtime] Response complete');
        break;
      case 'error':
        console.error('[realtime] API error:', event.error?.message || event);
        break;
      default:
        // console.log('[realtime] Event:', event.type);
        break;
    }
  }

  /** Send PCM16 24kHz mono audio to OpenAI */
  sendAudio(pcm16Buffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: pcm16Buffer.toString('base64'),
      }));
    }
  }

  close() {
    this.ws?.close();
  }
}

// --- Audio format conversions ---

/**
 * Downsample 48kHz stereo i16 PCM → 24kHz mono i16 PCM
 * Input: Buffer of interleaved L/R i16 samples at 48kHz
 * Output: Buffer of mono i16 samples at 24kHz
 */
function downsample48kStereoTo24kMono(buf) {
  // 48kHz stereo = 4 bytes per frame (2 bytes L + 2 bytes R)
  // Take every other frame → 24kHz, average L+R → mono
  const frameCount = Math.floor(buf.length / 4);
  const out = Buffer.alloc(Math.floor(frameCount / 2) * 2);
  let outIdx = 0;
  for (let i = 0; i < frameCount; i += 2) {
    const offset = i * 4;
    const l = buf.readInt16LE(offset);
    const r = buf.readInt16LE(offset + 2);
    const mono = Math.round((l + r) / 2);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, mono)), outIdx);
    outIdx += 2;
  }
  return out.subarray(0, outIdx);
}

/**
 * Upsample 24kHz mono i16 PCM → 48kHz stereo i16 PCM
 * Input: Buffer of mono i16 samples at 24kHz
 * Output: Buffer of interleaved L/R i16 samples at 48kHz
 */
function upsample24kMonoTo48kStereo(buf) {
  const sampleCount = Math.floor(buf.length / 2);
  // Each sample becomes 2 frames (upsample) × 2 channels (stereo) = 4 output samples
  const out = Buffer.alloc(sampleCount * 2 * 4);
  let outIdx = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sample = buf.readInt16LE(i * 2);
    // Write twice (24k→48k) with L=R (mono→stereo)
    for (let j = 0; j < 2; j++) {
      out.writeInt16LE(sample, outIdx); outIdx += 2; // L
      out.writeInt16LE(sample, outIdx); outIdx += 2; // R
    }
  }
  return out;
}

// --- Main ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', async () => {
  console.log(`[discord] ${client.user.tag} voice worker ready`);

  if (config.leave) {
    const conn = getVoiceConnection(config.guildId);
    if (conn) {
      conn.destroy();
      console.log('[discord] Left voice channel');
    } else {
      console.log('[discord] Not in a voice channel');
    }
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  // Join the voice channel
  console.log(`[discord] Joining guild=${config.guildId} channel=${config.channelId}`);
  const connection = joinVoiceChannel({
    channelId: config.channelId,
    guildId: config.guildId,
    adapterCreator: client.guilds.cache.get(config.guildId)?.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log('[discord] Voice connection ready (DAVE encrypted)');
  } catch (err) {
    console.error('[discord] Failed to connect to voice:', err.message);
    connection.destroy();
    process.exit(1);
  }

  // Set up the OpenAI bridge
  const bridge = new RealtimeBridge();
  try {
    await bridge.connect();
  } catch (err) {
    console.error('[bridge] Failed to connect to OpenAI:', err.message);
    connection.destroy();
    process.exit(1);
  }

  // --- Playback: AI audio → Discord ---
  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
  connection.subscribe(player);

  // Buffer AI audio chunks and stream them to the player
  let playbackQueue = [];
  let isPlaying = false;

  function playNextChunk() {
    if (playbackQueue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;

    // Merge queued chunks into one buffer
    const merged = Buffer.concat(playbackQueue.splice(0));
    // Upsample 24kHz mono → 48kHz stereo for Discord
    const pcm48kStereo = upsample24kMonoTo48kStereo(merged);

    const readable = Readable.from([pcm48kStereo]);
    const resource = createAudioResource(readable, {
      inputType: StreamType.Raw,
    });

    player.play(resource);
  }

  // When AI produces audio, queue it
  bridge.onAudioDelta = (pcm16Buf24kMono) => {
    playbackQueue.push(pcm16Buf24kMono);
    // Batch: play every ~200ms of audio (4800 samples at 24kHz = 200ms)
    const totalBytes = playbackQueue.reduce((a, b) => a + b.length, 0);
    if (!isPlaying && totalBytes >= 9600) { // 4800 samples × 2 bytes
      playNextChunk();
    }
  };

  player.on('stateChange', (oldState, newState) => {
    if (newState.status === 'idle' && playbackQueue.length > 0) {
      playNextChunk();
    }
  });

  // --- Receive: Discord user audio → OpenAI ---
  connection.receiver.speaking.on('start', (userId) => {
    // Don't listen to ourselves
    if (userId === client.user.id) return;

    console.log(`[receive] User ${userId} started speaking`);

    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 300,
      },
    });

    // Opus stream → PCM via prism
    const opusDecoder = new prism.opus.Decoder({
      frameSize: 960,
      channels: 2,
      rate: 48000,
    });

    audioStream.pipe(opusDecoder).on('data', (pcm48kStereo) => {
      // Downsample to 24kHz mono for OpenAI
      const pcm24kMono = downsample48kStereoTo24kMono(pcm48kStereo);
      if (pcm24kMono.length > 0) {
        bridge.sendAudio(pcm24kMono);
      }
    });

    opusDecoder.on('error', (err) => {
      console.error('[decode] Opus error:', err.message);
    });
  });

  // Keep alive signal
  console.log('[voice] 🎤 Bridge active — listening and speaking');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[voice] SIGTERM received, disconnecting...');
    bridge.close();
    connection.destroy();
    setTimeout(() => process.exit(0), 1000);
  });

  process.on('SIGINT', () => {
    console.log('[voice] SIGINT received, disconnecting...');
    bridge.close();
    connection.destroy();
    setTimeout(() => process.exit(0), 1000);
  });
});

client.login(TOKEN);
