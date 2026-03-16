<p align="center">
  <h1 align="center">🎤 vox-discord</h1>
  <p align="center">
    <strong>Open source voice AI for Discord — real-time bidirectional conversation with DAVE E2EE</strong>
  </p>
  <p align="center">
    <a href="https://github.com/digitalforgeca/vox-discord/blob/master/LICENSE"><img src="https://img.shields.io/github/license/digitalforgeca/vox-discord?style=flat-square&color=blue" alt="MIT License"></a>
    <a href="https://github.com/digitalforgeca/vox-discord"><img src="https://img.shields.io/github/stars/digitalforgeca/vox-discord?style=flat-square&color=yellow" alt="GitHub Stars"></a>
    <a href="https://www.npmjs.com/package/@digitalforgestudios/vox-discord"><img src="https://img.shields.io/npm/v/@digitalforgestudios/vox-discord?style=flat-square&color=red" alt="npm version"></a>
    <br/>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" alt="discord.js"></a>
    <a href="https://platform.openai.com/docs/guides/realtime"><img src="https://img.shields.io/badge/OpenAI-Realtime_API-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI Realtime API"></a>
    <a href="https://learn.microsoft.com/en-us/azure/ai-services/openai/"><img src="https://img.shields.io/badge/Azure-AI_Foundry-0078D4?style=flat-square&logo=microsoftazure&logoColor=white" alt="Azure AI Foundry"></a>
    <br/>
    <a href="https://img.shields.io/badge/DAVE-E2EE_Ready-00C853?style=flat-square"><img src="https://img.shields.io/badge/DAVE-E2EE_Ready-00C853?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDFMMyA1djZjMCA1LjU1IDMuODQgMTAuNzQgOSAxMiA1LjE2LTEuMjYgOS02LjQ1IDktMTJWNWwtOS00eiIvPjwvc3ZnPg==" alt="DAVE E2EE"></a>
    <a href="https://img.shields.io/badge/Semantic_VAD-Enabled-FF6D00?style=flat-square"><img src="https://img.shields.io/badge/Semantic_VAD-Enabled-FF6D00?style=flat-square" alt="Semantic VAD"></a>
    <a href="https://img.shields.io/badge/Lines_of_Code-~300-lightgrey?style=flat-square"><img src="https://img.shields.io/badge/Lines_of_Code-~300-lightgrey?style=flat-square" alt="~300 LoC"></a>
  </p>
</p>

---

Talk to an AI in Discord. It listens, thinks, and talks back — in real time. Built in a night. ~300 lines. MIT licensed.

**Discord made [DAVE (end-to-end encryption)](https://discord.com/blog/dave-e2ee-for-audio-video) mandatory for voice in 2026. Every existing voice bot broke. This one works.**

Built by [Digital Forge Studios](https://dforge.ca).

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Bidirectional voice** | Speak naturally, hear AI responses in real-time — not TTS over a bot |
| 🔒 **DAVE E2EE** | Discord's mandatory end-to-end encryption, handled transparently |
| 🧠 **Semantic VAD** | AI understands when you're done talking vs. pausing to think |
| 🗣️ **Barge-in** | Interrupt the AI mid-sentence — it stops and listens |
| 🛠️ **Agentic tools** | Web search, weather, file reading, shell commands mid-conversation |
| 🎚️ **Fully configurable** | Voice, personality, VAD type, eagerness, temperature — all via env vars |
| 🎭 **Multiple voices** | 8 voices: alloy, echo, shimmer, ash, ballad, coral, sage, verse |
| 📝 **Live transcription** | Every conversation logged with timestamps |

## 🏗️ Architecture

```
You speak
  → Discord captures Opus audio
  → Decrypt via DAVE E2EE
  → Decode Opus → PCM (48kHz stereo)
  → Downsample to 24kHz mono
  → Base64 encode → OpenAI Realtime API (WebSocket)

AI responds
  → PCM audio (24kHz mono)
  → Upsample to 48kHz stereo
  → Encrypt via DAVE E2EE
  → Discord audio player → you hear the AI speak
```

~300 lines of JavaScript. No frameworks. No magic.

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** (`node --version`)
- **Discord Bot** with voice permissions
- **OpenAI Realtime API access** (Azure AI Foundry or OpenAI direct)

### 1. Clone & Install

```bash
git clone https://github.com/digitalforgeca/vox-discord.git
cd vox-discord
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DISCORD_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-server-id
DISCORD_CHANNEL_ID=your-voice-channel-id
OPENAI_REALTIME_ENDPOINT=wss://your-endpoint.openai.azure.com/openai/realtime
OPENAI_REALTIME_API_KEY=your-api-key

# Optional — tune the experience
VOX_VAD_TYPE=semantic_vad
VOX_EAGERNESS=medium
VOX_VOICE=alloy
VOX_TEMPERATURE=0.8
```

### 3. Run

```bash
npm start
```

The bot joins your voice channel. Start talking.

### Discord Bot Setup

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. **Bot** → Create → Copy token
3. Enable **Privileged Gateway Intents**: Server Members, Message Content
4. Invite with permissions `36700160` (Connect + Speak + Use Voice Activity):

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot&permissions=36700160
```

## ⚙️ Configuration Reference

### Core Settings

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DISCORD_TOKEN` | ✅ | — | Discord bot token |
| `DISCORD_GUILD_ID` | ✅ | — | Server (guild) ID |
| `DISCORD_CHANNEL_ID` | ✅ | — | Voice channel ID |
| `OPENAI_REALTIME_ENDPOINT` | ✅ | — | Realtime API WebSocket URL |
| `OPENAI_REALTIME_API_KEY` | ✅ | — | API key |
| `OPENAI_REALTIME_MODEL` | | `gpt-realtime-mini` | Model deployment name |
| `VOICE_SYSTEM_PROMPT` | | Generic assistant | AI personality & instructions |

### Voice & Conversation Tuning

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `VOX_VAD_TYPE` | `semantic_vad` | `semantic_vad` · `server_vad` · `off` | Turn detection mode |
| `VOX_EAGERNESS` | `medium` | `low` · `medium` · `high` | How quick AI responds (semantic VAD) |
| `VOX_THRESHOLD` | `0.6` | `0.0` – `1.0` | Noise gate sensitivity (server VAD) |
| `VOX_SILENCE_DURATION` | `500` | ms | Pause before turn ends (server VAD) |
| `VOX_PREFIX_PADDING` | `300` | ms | Audio captured before speech detected |
| `VOX_VOICE` | `alloy` | `alloy` · `echo` · `shimmer` · `ash` · `ballad` · `coral` · `sage` · `verse` | AI voice |
| `VOX_TEMPERATURE` | `0.8` | `0.6` – `1.2` | Response creativity |
| `VOX_CREATE_RESPONSE` | `true` | `true` · `false` | Auto-respond on turn detection |

### Understanding VAD Modes

**Semantic VAD** (recommended) — The AI model decides when you've finished speaking. It understands sentence structure, trailing thoughts, and conversational pauses. Use `eagerness` to control responsiveness:

- `low` — Patient. Lets you think out loud, ramble, trail off. Great for brainstorming.
- `medium` — Natural conversational pace. Good default.
- `high` — Snappy back-and-forth. Good for quick Q&A.

**Server VAD** — Simple silence detection. Triggers when you stop making sound for `silence_duration_ms`. Faster but dumber — will interrupt your pauses.

**Off** — No automatic turn detection. You control when the AI responds programmatically.

## 🛠️ Agentic Tools

The AI can take actions mid-conversation:

| Tool | What it does |
|------|-------------|
| 🔍 `web_search` | Search the web for current information |
| 🌤️ `get_weather` | Weather for any location |
| 🕐 `get_time` | Current date and time |
| 📄 `read_file` | Read files from the project directory |
| 💻 `run_command` | Execute shell commands (sandboxed) |
| 📨 `send_discord_message` | Post messages to Discord channels |

Tools are defined in `tools.js`. Add your own by following the pattern — the AI will automatically discover and use them.

## 💰 Cost Guide

| Model | Cost/min | 10-min chat | Best for |
|-------|----------|-------------|----------|
| `gpt-realtime-mini` | ~$0.03–0.10 | ~$0.30–1.00 | Casual conversation, demos |
| `gpt-realtime-1.5` | ~$0.10–0.30 | ~$1.00–3.00 | Complex reasoning, agentic tasks |

**Cost optimization tips:**
- Use `semantic_vad` — fewer false triggers = fewer API calls
- Increase `VOX_THRESHOLD` in noisy environments
- Keep system prompts concise (charged as input every turn)
- Use `gpt-realtime-mini` for most use cases

## 🔒 How DAVE E2EE Works

Discord's DAVE protocol encrypts all voice audio end-to-end. Since March 2026, bots must participate in the DAVE handshake or they can't join voice channels.

This project handles DAVE via:
- [`@snazzah/davey`](https://github.com/Snazzah/davey) — DAVE protocol implementation for Node.js
- [`sodium-native`](https://github.com/sodium-friends/sodium-native) — libsodium bindings for cryptographic operations

You don't write any encryption code. The libraries handle the handshake, key exchange, and frame encryption/decryption transparently.

> **Note for Rust developers:** Songbird's DAVE integration (via the `davey` crate) currently has a session lifecycle bug. See [serenity-rs/songbird#291](https://github.com/serenity-rs/songbird/pull/291). The JavaScript ecosystem is the reliable path for now.

## 🐳 Docker

```bash
docker build -t vox-discord .
docker run --env-file .env vox-discord
```

> **⚠️ Hosting note:** Discord voice requires UDP for audio transport. Azure Container Apps blocks UDP. Use Azure Container Instances (ACI), a VM, or run locally.

## 🔧 How It Works (Technical)

1. **Discord gateway** — `discord.js` connects via WebSocket, handles presence, guild events
2. **Voice connection** — `@discordjs/voice` manages the voice WebSocket + UDP socket, DAVE handshake via `@snazzah/davey`
3. **Per-user audio** — Discord sends separate Opus streams per user (identified by SSRC). We subscribe per-user, not to a mixed stream
4. **Downsampling** — Discord: 48kHz stereo Opus → decode → PCM16 → downsample to 24kHz mono (OpenAI format)
5. **Realtime API** — Persistent WebSocket to OpenAI. Audio streamed in both directions. Server-side VAD handles turn detection
6. **Upsampling** — OpenAI: 24kHz mono PCM16 → upsample to 48kHz stereo → push to `Readable` stream → `AudioPlayer`
7. **Tool execution** — Model invokes functions mid-conversation → we execute → feed results back → model speaks the answer

## 📁 Project Structure

```
vox-discord/
├── index.js          # Main bridge — Discord ↔ OpenAI Realtime (~300 lines)
├── tools.js          # Agentic tool definitions
├── control.js        # Local control panel for live-tweaking parameters
├── .env.example      # All configuration options documented
├── Dockerfile        # Container deployment
├── package.json      # Dependencies
└── README.md         # You are here
```

## 🤝 Contributing

PRs welcome. The codebase is intentionally small — please keep it that way.

**Areas where help is appreciated:**
- Additional transport adapters (WebRTC, SIP)
- Better noise resilience strategies
- More agentic tools
- Multi-user conversation management
- Performance profiling for concurrent streams

## 📄 License

[MIT](LICENSE) — do whatever you want with it.

---

<p align="center">
  Built with 🪽 by <a href="https://dforge.ca">Digital Forge Studios</a>
  <br/>
  <sub>We build AI tools and ship them fast. Sometimes too close to the sun.</sub>
</p>
