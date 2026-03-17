FROM node:22-slim

# Install Playwright system dependencies
RUN npx playwright install-deps chromium

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Install Playwright Chromium
RUN npx playwright install chromium

# Copy source
COPY tsconfig.json ./
COPY record.ts wallet-setup.ts playwright.config.ts ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Copy config files and skill
COPY demo-config.json demo-config.yaml octant-flows.json ./
COPY configs/ ./configs/
COPY SKILL.md ./

# Default: dry-run to verify config
ENTRYPOINT ["node", "dist/record.js"]
CMD ["--config", "demo-config.yaml", "--output", "./recordings/", "--no-ffmpeg", "--dry-run"]
