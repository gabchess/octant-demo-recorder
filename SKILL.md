Record screencasts of any web3 dApp. Connects to a real Chrome instance (with MetaMask) running on another machine via CDP over Tailscale. No browser needed locally. No display needed. The agent drives the browser and records video autonomously.

Built for dev teams: when a PR ships, dappsnap records the full app experience and outputs a production-ready MP4. No screen recorder needed. No human at the keyboard.

## Prerequisites

- Chrome running on a Mac with `--remote-debugging-port=9222` and a dedicated profile
- MetaMask installed in that Chrome profile (test wallet, zero real funds)
- Tailscale TCP forward: `tailscale serve --bg --tcp 9222 tcp://localhost:9222`
- Node 18+ and `npm run build` completed in this repo

## Commands

| Command | What it does |
|---------|-------------|
| `/dappsnap:setup` | First-time install. Checks Chrome CDP, Tailscale, creates shell alias, writes .env |
| `/dappsnap:design` | Conversational recording planner. Interview: which URL, pages, duration, interactions. Writes a recording plan, executes on confirmation |
| `/dappsnap:record` | Fast path. Records with defaults from .env. No questions asked |
| `/dappsnap:status` | Health check. Chrome reachable? Webhook up? Last recording file + size |

## Quick start

```
/dappsnap:setup
/dappsnap:record
```

Or design a custom recording session:

```
/dappsnap:design https://glm.octant.app/
```
