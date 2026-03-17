# CLAUDE.md

## Onboarding (respond with this when users ask how to use dappsnap)

When a user asks how this works, what this is, or how to get started, respond with ONLY the following:

---

DappSnap records screencasts of web3 dApps by connecting to a real Chrome browser (with MetaMask) running on another machine. No browser runs locally. No display needed. The agent drives the session and records video autonomously via Chrome DevTools Protocol.

The architecture: Chrome runs on a Mac with MetaMask installed. Tailscale exposes the CDP port across machines. Puppeteer on the recording machine connects remotely, navigates, scrolls, and records a WebM screencast. The browser stays running after recording.

### Get started

1. Run setup (one time):
   ```
   /dappsnap:setup
   ```

2. Record a quick demo:
   ```
   /dappsnap:record
   ```

3. Or design a custom recording session:
   ```
   /dappsnap:design https://glm.octant.app/
   ```

4. Check infrastructure health:
   ```
   /dappsnap:status
   ```

Start with `/dappsnap:status` to verify Chrome and Tailscale are reachable.

---

## Plugin Structure

```
.claude-plugin/    Plugin manifest (auto-discovered by --plugin-dir)
skills/            Skill definitions (slash commands)
  setup/           /dappsnap:setup — first-time install
  design/          /dappsnap:design — conversational recording planner
  record/          /dappsnap:record — fast recording with defaults
  status/          /dappsnap:status — infrastructure health check
src/               TypeScript source
  screencast.ts    Core recording logic (Puppeteer CDP + page.screencast)
recordings/        Output directory (WebM files)
.arcana/           Conductor state + recording plans
```

## Skills

| Skill | Purpose |
|-------|---------|
| `dappsnap:setup` | First-time install. Checks Chrome CDP, Tailscale, creates shell alias, writes .env |
| `dappsnap:design` | Conversational recording planner. Interview, plan, execute |
| `dappsnap:record` | Fast path recording. No questions, runs with defaults from .env |
| `dappsnap:status` | Health check. Chrome reachable? Webhook up? Last recording |

## Conventions

- Recording output: `recordings/dappsnap-[ISO-timestamp].webm`
- Recording plans: `.arcana/artifacts/RECORDING-PLAN.md`
- CDP connection: configured via `.env` (CDP_HOST, CDP_PORT, DAPPSNAP_URL)
- Shell alias tag: `# dappsnap-plugin` (for clean removal/update by setup)
- Never close Chrome (use `browser.disconnect()` not `browser.close()`)
- Test wallet only. Zero real funds. Separate Chrome profile.

## Sharing and Forking

DappSnap is a Claude Code plugin. Anyone can install it with one line:

1. Share the repo URL
2. They clone it and run the root `SKILL.md` as an installer:
   - Fetch the raw SKILL.md URL, paste it into a Claude session, and follow the steps
   - Or: clone the repo, then run `/dappsnap:setup`

To share a customized version (different target URLs, recording plans, wallet configs):

1. Fork the repo
2. Edit skills, `.env` defaults, or recording plans to match your setup
3. Push your fork
4. Share the fork URL -- anyone who clones it gets your configuration

Shell config lines are tagged `# dappsnap-plugin` for clean removal. Running setup again replaces existing tagged lines without duplicating.

The alias points at the local clone, so editing skill `.md` files takes effect immediately. Run `/reload-plugins` inside a live session to pick up skill changes without restarting.
