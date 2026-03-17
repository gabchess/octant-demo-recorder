---
description: Fast recording with defaults from .env. No questions asked.
argument-hint: [--url URL] [--duration SECONDS]
allowed-tools:
  - Bash
  - Read
model: inherit
context: inherit
user-invocable: true
---

# DappSnap Record

Fast path recording. Runs immediately with defaults from .env. No conversation, no confirmation.

## Execution

1. Read `.env` for defaults (CDP_HOST, CDP_PORT, DAPPSNAP_URL)
2. Check if a RECORDING-PLAN.md exists in `.arcana/artifacts/` -- if yes, use it
3. If no plan exists, run a single recording with defaults
4. Report file path and size when done

### With arguments

If the user passed `--url` or `--duration`, use those:

```bash
cd ~/projects/octant-demo-recorder
node dist/src/screencast.js $ARGUMENTS
```

### With a saved plan

If `.arcana/artifacts/RECORDING-PLAN.md` exists, parse each flow and run sequentially:

```bash
cd ~/projects/octant-demo-recorder
# For each flow in the plan:
node dist/src/screencast.js --url "[flow URL]" --duration [duration]
```

### With defaults only

```bash
cd ~/projects/octant-demo-recorder
node dist/src/screencast.js
```

This records `$DAPPSNAP_URL` (default: https://glm.octant.app/) for 30 seconds.

## Output

After recording completes, report:

```
Recording saved: recordings/dappsnap-[timestamp].webm ([size])

To design a custom recording: /dappsnap:design
To check infrastructure: /dappsnap:status
```
