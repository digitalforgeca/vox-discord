#!/usr/bin/env node
// Vox Control Panel — live-tweak voice parameters via terminal UI
// Sends session.update to the running bridge's OpenAI Realtime WS

const readline = require('readline');

// Default config — mirrors what index.js uses
const config = {
  // Turn detection
  vad_type: process.env.VOX_VAD_TYPE || 'semantic_vad',  // server_vad | semantic_vad | off
  threshold: parseFloat(process.env.VOX_THRESHOLD || '0.6'),
  prefix_padding_ms: parseInt(process.env.VOX_PREFIX_PADDING || '300'),
  silence_duration_ms: parseInt(process.env.VOX_SILENCE_DURATION || '500'),
  eagerness: process.env.VOX_EAGERNESS || 'medium',  // low | medium | high (semantic_vad only)
  create_response: process.env.VOX_CREATE_RESPONSE !== 'false',

  // Voice
  voice: process.env.VOX_VOICE || 'alloy',
  temperature: parseFloat(process.env.VOX_TEMPERATURE || '0.8'),

  // Transcription
  transcription_prompt: process.env.VOX_TRANSCRIPTION_PROMPT || '',
};

function buildSessionUpdate() {
  const session = {
    temperature: config.temperature,
  };

  if (config.vad_type === 'off') {
    session.turn_detection = null;
  } else if (config.vad_type === 'semantic_vad') {
    session.turn_detection = {
      type: 'semantic_vad',
      eagerness: config.eagerness,
      create_response: config.create_response,
    };
  } else {
    session.turn_detection = {
      type: 'server_vad',
      threshold: config.threshold,
      prefix_padding_ms: config.prefix_padding_ms,
      silence_duration_ms: config.silence_duration_ms,
      create_response: config.create_response,
    };
  }

  if (config.transcription_prompt) {
    session.input_audio_transcription = {
      model: 'whisper-1',
      prompt: config.transcription_prompt,
    };
  }

  return { type: 'session.update', session };
}

function printConfig() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       🎤 VOX CONTROL PANEL               ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  VAD Type:          ${config.vad_type.padEnd(20)}║`);
  if (config.vad_type === 'server_vad') {
    console.log(`║  Threshold:         ${String(config.threshold).padEnd(20)}║`);
    console.log(`║  Prefix Padding:    ${(config.prefix_padding_ms + 'ms').padEnd(20)}║`);
    console.log(`║  Silence Duration:  ${(config.silence_duration_ms + 'ms').padEnd(20)}║`);
  }
  if (config.vad_type === 'semantic_vad') {
    console.log(`║  Eagerness:         ${config.eagerness.padEnd(20)}║`);
  }
  console.log(`║  Auto-respond:      ${String(config.create_response).padEnd(20)}║`);
  console.log(`║  Voice:             ${config.voice.padEnd(20)}║`);
  console.log(`║  Temperature:       ${String(config.temperature).padEnd(20)}║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Commands:                               ║');
  console.log('║  vad <server|semantic|off>               ║');
  console.log('║  threshold <0.0-1.0>                     ║');
  console.log('║  silence <ms>                            ║');
  console.log('║  prefix <ms>                             ║');
  console.log('║  eagerness <low|medium|high>             ║');
  console.log('║  voice <alloy|echo|shimmer|ash|...>      ║');
  console.log('║  temp <0.6-1.2>                          ║');
  console.log('║  autorespond <on|off>                    ║');
  console.log('║  apply  — push config to running bridge  ║');
  console.log('║  show   — show current config            ║');
  console.log('║  json   — show raw session.update JSON   ║');
  console.log('║  env    — show as env vars for .env      ║');
  console.log('║  quit                                    ║');
  console.log('╚══════════════════════════════════════════╝\n');
}

function handleCommand(line) {
  const parts = line.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const val = parts[1];

  switch (cmd) {
    case 'vad':
      if (['server_vad', 'server', 'semantic_vad', 'semantic', 'off'].includes(val)) {
        config.vad_type = val === 'server' ? 'server_vad' : val === 'semantic' ? 'semantic_vad' : val;
        console.log(`✓ VAD type → ${config.vad_type}`);
      } else {
        console.log('Usage: vad <server|semantic|off>');
      }
      break;
    case 'threshold':
      config.threshold = Math.max(0, Math.min(1, parseFloat(val) || 0.5));
      console.log(`✓ Threshold → ${config.threshold}`);
      break;
    case 'silence':
      config.silence_duration_ms = parseInt(val) || 500;
      console.log(`✓ Silence duration → ${config.silence_duration_ms}ms`);
      break;
    case 'prefix':
      config.prefix_padding_ms = parseInt(val) || 300;
      console.log(`✓ Prefix padding → ${config.prefix_padding_ms}ms`);
      break;
    case 'eagerness':
      if (['low', 'medium', 'high'].includes(val)) {
        config.eagerness = val;
        console.log(`✓ Eagerness → ${config.eagerness}`);
      } else {
        console.log('Usage: eagerness <low|medium|high>');
      }
      break;
    case 'voice':
      config.voice = val || 'alloy';
      console.log(`✓ Voice → ${config.voice} (note: can only change before first audio response)`);
      break;
    case 'temp':
    case 'temperature':
      config.temperature = Math.max(0.6, Math.min(1.2, parseFloat(val) || 0.8));
      console.log(`✓ Temperature → ${config.temperature}`);
      break;
    case 'autorespond':
      config.create_response = val === 'on' || val === 'true';
      console.log(`✓ Auto-respond → ${config.create_response}`);
      break;
    case 'apply':
      const update = buildSessionUpdate();
      console.log('\n📡 Session update payload:');
      console.log(JSON.stringify(update, null, 2));
      console.log('\n→ Copy this and send via the bridge WebSocket, or restart with env vars below.');
      break;
    case 'show':
      printConfig();
      break;
    case 'json':
      console.log(JSON.stringify(buildSessionUpdate(), null, 2));
      break;
    case 'env':
      console.log(`\n# Vox env vars — paste into .env`);
      console.log(`VOX_VAD_TYPE=${config.vad_type}`);
      console.log(`VOX_THRESHOLD=${config.threshold}`);
      console.log(`VOX_PREFIX_PADDING=${config.prefix_padding_ms}`);
      console.log(`VOX_SILENCE_DURATION=${config.silence_duration_ms}`);
      console.log(`VOX_EAGERNESS=${config.eagerness}`);
      console.log(`VOX_CREATE_RESPONSE=${config.create_response}`);
      console.log(`VOX_VOICE=${config.voice}`);
      console.log(`VOX_TEMPERATURE=${config.temperature}`);
      console.log('');
      break;
    case 'quit':
    case 'exit':
      process.exit(0);
    default:
      console.log('Unknown command. Type "show" for help.');
  }
}

// --- Main ---
printConfig();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'vox> ' });
rl.prompt();
rl.on('line', (line) => {
  handleCommand(line);
  rl.prompt();
});
