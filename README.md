# dappsnap

Headless MetaMask automation and video recording pipeline for Web3 dapps. Config-driven, CI-invocable, agent-callable from a YAML file.

Built for the [Synthesis Hackathon 2026](https://synthesis.md) by a human PM and an AI agent pair-programming across two machines.

## The browser problem

Headless MetaMask automation has been unsolved since 2018.

Every team building autonomous dapp tooling hits the same wall: MetaMask is a browser extension, and browser extensions require `--load-extension` and `--disable-extensions-except` flags to load in headless mode. Google Chrome and Microsoft Edge removed these flags from headless mode. This is a deliberate product decision by Chromium-based browsers to prevent extensions from running without a visible window.

The result: eight years of workarounds. [r/ethdev threads going back to 2018](https://www.reddit.com/r/ethdev/comments/sicgsw/) document the frustration -- "e2e testing still doesn't make the priority list for wallet libraries... hard for Synpress and dappeteer to keep up with wallet HTML without a stable API." The solutions that exist are either:

- Virtual displays (Xvfb, VNC): fragile, heavy, breaks in CI
- Wallet emulators (headless-web3-provider, headless-wallet): not real MetaMask, can't test extension popups, missing signature flows
- MCP bridges (Synpress+MCP): requires an active display session and Claude in the loop at execution time
- Manual testing: a human at a browser, which is not agentic

Playwright-bundled Chromium is the only browser channel that retained `--load-extension` and `--disable-extensions-except` in headless mode. Not stock Chrome. Not Chrome Canary. Not Edge. The Chromium build that Playwright downloads and manages independently of Google's release channel kept the flags.

This is a one-line configuration change:

```typescript
// playwright.config.ts
channel: 'chromium'  // NOT 'chrome', NOT 'msedge'
```

Finding it required testing three separate browser builds, reading Chromium source changelogs, and confirming that Playwright's build diverged from Google's on extension flag support. No documentation covers this, no Synpress tutorial mentions it, and no Stack Overflow answer explains it.

dappsnap packages Playwright Chromium + Synpress v4 + MetaMask extension sideloading into a config-driven pipeline. You write a YAML file describing the dapp flows you want recorded. dappsnap navigates the dapp, connects MetaMask, signs transactions, and exports video recordings, all headlessly from an SSH session with no display server.

Synpress+MCP lets Claude drive MetaMask interactively. dappsnap packages MetaMask interactions as headless, recordable, CI-invocable skills, so agents run them autonomously and repeatedly.

## Quick Start

```bash
# Install
npm install
npx playwright install chromium

# Build
npm run build

# Record any dapp (no wallet needed)
node dist/record.js --config demo-config.yaml --output ./recordings/ --no-ffmpeg

# Check output
cat recordings/manifest.json
```

## Config Format (YAML or JSON)

```yaml
# demo-config.yaml -- works for ANY dapp
baseUrl: https://app.uniswap.org
viewport:
  width: 1920
  height: 1080
walletAction: none   # 'connect' for MetaMask, 'none' for public pages

flows:
  - name: swap-page
    path: /swap
    description: Record the swap interface
    waitForSelector: body
    duration: 10
    actions:
      - type: wait
        duration: 3
      - type: scroll
        direction: down
        amount: 400
        delay: 2
      - type: screenshot
        name: after-scroll
```

### Action Types

| Type | Fields | What it does |
|------|--------|-------------|
| `scroll` | direction (up/down), amount (px), delay? (s) | Scroll the page |
| `click` | selector, delay? (s) | Click an element |
| `wait` | duration (s) | Pause |
| `navigate` | path, waitForSelector?, delay? (s) | Go to another page |
| `type` | selector, text, delay? (s) | Fill a form field |
| `screenshot` | name | Capture a named screenshot |

## MetaMask Flows (Mac Mini)

```bash
# 1. Set up wallet credentials
cp .env.example .env
# Edit .env: WALLET_SEED_PHRASE and WALLET_PASSWORD (TEST WALLET ONLY, ZERO FUNDS)

# 2. Cache MetaMask state
npx synpress

# 3. Record with wallet
node dist/record.js --config octant-flows.json --output ./recordings/ --no-ffmpeg
```

## Output

```
recordings/
  mp4/                 # Final output (MP4 if system ffmpeg, WebM otherwise)
  playwright/          # Raw Playwright WebM + traces + screenshots
  screenshots/         # Named screenshots from screenshot actions
  manifest.json        # Metadata: flow names, paths, timestamps, video locations
```

## Architecture

```
YAML/JSON config
      |
      v
  config.ts         -- Parse + validate (YAML via js-yaml, JSON native)
      |
      v
  flow-runner.ts     -- Generate Playwright test per flow, execute via CLI
      |
      v
  Playwright         -- Headless Chromium + MetaMask extension (Synpress v4)
      |
      v
  recorder.ts        -- Optional ffmpeg display capture (Mac Mini 4K)
      |
      v
  mp4-converter.ts   -- WebM -> MP4 post-processing (system ffmpeg preferred)
      |
      v
  manifest.json      -- Structured output metadata
```

Key technical decisions:
- `channel: 'chromium'` -- the only browser that supports headless extensions
- Synpress v4 alpha -- handles MetaMask sideloading and wallet fixture caching
- Test generation at runtime -- flows create `.spec.ts` files dynamically from config
- Graceful degradation -- failed flows don't abort the run, missing ffmpeg falls back to WebM

## OpenClaw Skill

dappsnap ships as an OpenClaw skill. See [SKILL.md](./SKILL.md) for the complete agent-readable specification.

Any agent can invoke dappsnap by writing a config file and running the CLI. The skill format is self-contained -- it includes installation, execution, and output parsing instructions.

## Test Wallet Policy

- Test wallet must contain ZERO real funds
- Seed phrase lives in `.env` only -- never in config files, never in git
- Generate a fresh mnemonic: https://iancoleman.io/bip39/
- Verify before commit: `git grep -i "seed\|mnemonic\|private"` should return zero matches

## License

MIT
