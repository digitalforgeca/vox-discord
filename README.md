# dforge-voice

**Discord AI voice bot** — real-time voice conversations in Discord voice channels, powered by the OpenAI Realtime API.

Built by [Digital Forge Studios](https://dforge.ca). Free and open source.

## Features

- 🎤 **Full bidirectional voice** — speak naturally, hear AI responses in real-time
- 🔒 **DAVE E2EE** — Discord's mandatory end-to-end encryption, handled transparently
- 🗣️ **Barge-in** — interrupt the AI mid-sentence, it stops and listens
- 🎯 **Server-side VAD** — voice activity detection with tunable sensitivity
- 🧠 **Semantic VAD** — OpenAI's context-aware turn detection (knows when you're done talking vs pausing)
- 🛠️ **Agentic tools** — web search, weather, file reading, shell commands, Discord messaging
- ⚙️ **Fully configurable** — voice, personality, VAD type, eagerness, temperature — all via env vars

## Architecture

```
You speak → Discord Opus → decode → downsample 48kHz stereo → 24kHz mono
  → base64 PCM16 → OpenAI Realtime API (WebSocket)

AI responds → base64 PCM16 24kHz mono → upsample → 48kHz stereo
  → PlaybackStream → AudioPlayer → Discord voice channel
```

~300 lines of code. No frameworks, no magic.

## Quick Start

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** → create a bot → copy the token
4. Enable **Privileged Gateway Intents**: Server Members, Message Content
5. Invite to your server with permissions: `36700160` (Connect + Speak + Use Voice Activity)

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot&permissions=36700160
```

### 2. Get OpenAI Realtime API Access

You need access to the OpenAI Realtime API — either through:
- **Azure AI Foundry** (recommended) — deploy `gpt-realtime-mini` or `gpt-realtime-1.5`
- **OpenAI directly** — use the Realtime API endpoint

### 3. Install & Configure

```bash
git clone https://github.com/digitalforgeca/dforge-voice.git
cd dforge-voice
npm install
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run

```bash
npm start
```

The bot joins the configured voice channel automatically. Start talking.

## Configuration

All configuration is via environment variables (`.env` file):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ | — | Discord bot token |
| `DISCORD_GUILD_ID` | ✅ | — | Server ID |
| `DISCORD_CHANNEL_ID` | ✅ | — | Voice channel ID |
| `OPENAI_REALTIME_ENDPOINT` | ✅ | — | WebSocket endpoint URL |
| `OPENAI_REALTIME_API_KEY` | ✅ | — | API key |
| `OPENAI_REALTIME_MODEL` | | `gpt-realtime-mini` | Model deployment name |
| `VOICE_SYSTEM_PROMPT` | | Generic assistant | Personality/instructions |
| `VOX_VAD_TYPE` | | `semantic_vad` | `server_vad`, `semantic_vad`, or `off` |
| `VOX_EAGERNESS` | | `medium` | `low`, `medium`, `high` (semantic VAD) |
| `VOX_THRESHOLD` | | `0.6` | VAD sensitivity 0.0-1.0 (server VAD) |
| `VOX_SILENCE_DURATION` | | `500` | Silence ms before turn ends (server VAD) |
| `VOX_VOICE` | | `alloy` | Voice: alloy, echo, shimmer, ash, ballad, coral, sage, verse |
| `VOX_TEMPERATURE` | | `0.8` | Response randomness 0.0-1.0 |

## Agentic Tools

The bot can use tools during conversation:

- 🔍 **web_search** — search the web for current information
- 🕐 **get_time** — current date/time
- 🌤️ **get_weather** — weather for any location
- 📄 **read_file** — read project files
- 💻 **run_command** — execute shell commands (read-only, sandboxed)
- 📨 **send_discord_message** — post to Discord channels

Tools are defined in `tools.js` — add your own by following the pattern.

## Cost

Using `gpt-realtime-mini` on Azure:
- ~$0.03-0.10/min depending on conversation density
- A 10-minute chat costs roughly $0.30-$1.00

Using `gpt-realtime-1.5`:
- ~$0.10-0.30/min
- Better reasoning, 3x the cost

**Tips to reduce cost:**
- Use `semantic_vad` (smarter turn detection, fewer false triggers)
- Increase `VOX_THRESHOLD` in noisy environments
- Use `gpt-realtime-mini` for casual conversation
- Keep system prompts concise (they're charged as input every turn)

## How It Works

1. **Discord connection** — `discord.js` + `@discordjs/voice` handles gateway, voice connection, and DAVE E2EE (via `@snazzah/davey` + `sodium-native`)
2. **Audio receive** — subscribes to each user's Opus stream individually (Discord sends per-user streams, not a mix)
3. **Downsampling** — Discord sends 48kHz stereo Opus → we decode to PCM → downsample to 24kHz mono (what OpenAI expects)
4. **OpenAI Realtime API** — persistent WebSocket connection, streams audio in both directions, handles VAD/turn detection server-side
5. **Upsampling** — OpenAI sends 24kHz mono PCM16 → we upsample to 48kHz stereo → push to a Readable stream → Discord plays it
6. **Tool calling** — model can invoke functions mid-conversation, we execute and feed results back, model speaks the answer

## License

MIT — do whatever you want with it.

Built with 🪽 by [Digital Forge Studios](https://dforge.ca)
