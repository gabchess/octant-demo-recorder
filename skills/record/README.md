# Aria Record -- Install Instructions

## Prerequisites

- Node.js 18+
- Claude Code CLI

## Install

1. Clone the repo:
   ```bash
   git clone <repo-url> ~/projects/octant-demo-recorder
   cd ~/projects/octant-demo-recorder
   ```

2. Install dependencies and build:
   ```bash
   npm install && npm run build
   ```

3. Install Playwright's Chromium browser (required for wallet-free mode):
   ```bash
   npx playwright install chromium
   ```

4. Add a shell alias so Claude Code can find the plugin:
   ```bash
   alias aria='claude --plugin-dir ~/projects/octant-demo-recorder'
   ```
   Add this to your `~/.zshrc` or `~/.bashrc` to persist it.

## Usage

Launch Claude Code with the plugin:
```bash
aria
```

Then inside the session:
```
/aria:record https://glm.octant.app/projects
```

The skill runs a 3-question guided flow to determine the right recording path:

1. **Web2 or Web3?** -- determines if any wallet is needed
2. **Wallet needed?** -- determines if CDP mode is required
3. **Token lock needed?** -- triggers mandatory financial risk warnings

### Three recording modes

| Mode | When | What happens |
|------|------|-------------|
| **Web2 (Playwright)** | Regular websites, no wallet | Headless Chromium records locally. No setup needed. |
| **Wallet-only (CDP)** | dApps needing MetaMask, no token lock | Chrome with remote debugging + MetaMask. Lower risk. |
| **Token-lock (CDP)** | dApps requiring locked tokens (e.g. Octant) | Full financial risk warning, confirmation gate, and post-recording recovery steps. |

### Direct URL recording (provides URL upfront, guided flow still runs)

```
/aria:record https://example.com --steps "scroll down 500px, wait 3 seconds"
```

## Wallet-required mode (CDP)

For dApps that need MetaMask, the guided flow will prompt you to:

1. Launch Chrome with remote debugging:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.chrome-cdp-profile"
   ```

2. Configure `.env`:
   ```
   CDP_HOST=localhost
   CDP_PORT=9222
   ```

## Token-lock mode -- important

For dApps like Octant that require locking tokens:
- The skill displays a mandatory financial risk warning before recording
- You must explicitly confirm before proceeding
- After recording, the skill shows token recovery steps
- Never close Chrome without unlocking your tokens or exporting your private key

## Output

Recordings are saved as `.webm` files in `./recordings/` by default.
Use `--output <dir>` to change the output directory.
