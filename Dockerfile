FROM node:22-slim

# sodium-native and @discordjs/opus need build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libopus-dev libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Health check — process stays alive as long as Discord WS is connected
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node -e "process.exit(0)"

CMD ["node", "index.js"]
