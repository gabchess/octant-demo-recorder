# Aria Plugin

**ARIA** -- Record video demos of any web page or dApp. Wallet-free pages use local headless Playwright. Wallet-required dApps connect to Chrome via CDP.

## Components

### Agents

| Agent | Model | Description |
|-------|-------|-------------|
| `aria-navigator` | sonnet | Previews a URL, reports page structure and wallet requirements before recording starts |

### Skills

| Skill | Description |
|-------|-------------|
| `/aria:record` | Guided demo recording -- asks 3 questions (Web2/Web3, wallet, token lock), then records |
| `/aria:design` | Design a recording session interactively |
| `/aria:status` | Health check -- Chrome reachable, build current, last recording |

## Usage

```bash
# Launch Claude Code with the aria plugin
alias aria='claude --plugin-dir ~/projects/octant-demo-recorder'
aria

# Inside a session:
/aria:record https://glm.octant.app/projects
/aria:record https://example.com --steps "scroll down 500px, wait 3 seconds"
/aria:status
```

## Install

1. Clone and build:
   ```bash
   git clone https://github.com/gabchess/octant-demo-recorder.git ~/projects/octant-demo-recorder
   cd ~/projects/octant-demo-recorder
   npm install && npm run build
   npx playwright install chromium
   ```

2. Add shell alias:
   ```bash
   echo 'alias aria="claude --plugin-dir ~/projects/octant-demo-recorder"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Start a session:
   ```bash
   aria
   ```

## Requirements

- Claude Code CLI
- Node.js 18+
- Google Chrome (for wallet-required dApps only)

## Author

Gabriel Abreu (gabe@octantlabs.io)

## Version

3.0.0
