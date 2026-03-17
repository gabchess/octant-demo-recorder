# DAPPSNAP Build Plan

**Locked: 2026-03-14**
**Track: Osobotai/MetaMask ($10K primary)**
**Deadline: March 22 (building closes)**

---

## Phase 1: Working MP4 Demo (March 14-16)

**Goal:** Produce one actual MP4 video artifact of a headless Web3 dapp interaction.

### What exists (from 5-hour pair build)
- CLI scaffolding: `record.ts` entry point, config reader, flow runner, ffmpeg recorder
- Synpress v4 + MetaMask integration: `wallet-setup.ts`, `metaMaskFixtures`
- Playwright config with `channel: 'chromium'`, `video: 'on'`, headless mode
- Flow config: `octant-flows.json` (5 flows, JSON format)
- Test generation: flow-runner creates `.spec.ts` files dynamically from config
- Two recording layers: Playwright WebM (always) + ffmpeg MP4 (optional)
- Basic test: `test/basic.test.ts` (no MetaMask required)

### Phase 1 deliverables
1. **Rename project** from `octant-demo-recorder` to `dappsnap` (package.json, README, CLI bin name)
2. **Produce a working Playwright WebM** on Mac Air (no MetaMask needed, any public webpage)
3. **Add WebM-to-MP4 conversion** via ffmpeg post-processing (not display capture)
4. **Verify MetaMask headless loading** on Mac Mini (Gabe runs via SSH, reports output)
5. **Produce a working MP4** of a MetaMask-connected dapp flow on Mac Mini
6. **Initial git commit** with working codebase

### Build constraints
- Forge builds on Mac Air. Gabe transfers files to Mac Mini via SSH manually.
- Forge cannot SCP to Mac Mini autonomously.
- Mac Mini has: Node 22, Playwright, Synpress, ffmpeg, HDMI dummy plug
- Mac Air has: Node, Playwright, ffmpeg (no MetaMask testing possible without extension)

### Technical approach
- For Mac Air testing: use `walletAction: 'none'` flows against any public website
- WebM → MP4 conversion: `ffmpeg -i input.webm -c:v libx264 -preset slow -crf 18 output.mp4`
- This replaces the display-capture ffmpeg approach for the hackathon demo
- Keep display-capture as optional (`--display` flag) but don't depend on it

---

## Phase 2: Generalize + Config (March 16-18)
- YAML config support (in addition to JSON)
- `--dry-run` flag
- Flow abstraction: YAML defines reusable step types
- README: "The Browser Problem" + quick-start
- Ready for AI judge feedback on March 18

## Phase 3: Polish + Skill (March 18-21)
- OpenClaw skill file
- Dockerfile
- Second dapp demo (proves generalizability)
- Iterate on AI judge feedback
- Osobotai/MetaMask track submission description

## Phase 4: Submission (March 22)
- No new features after March 21 EOD
- Final polish, README, demo artifacts

---

## Differentiation
"Synpress+MCP lets Claude drive MetaMask interactively. DAPPSNAP packages MetaMask interactions as headless, recordable, CI-invocable skills — so agents run them autonomously, not once."

## Cut list (do NOT build)
- Payment rails, multi-wallet, GUI, cloud hosting, parallel recording
- Dapp-specific business logic
- Anything requiring native deps beyond Playwright + ffmpeg
