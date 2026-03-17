---
description: Records with saved plan if one exists. Runs the design interview first if no plan is saved yet.
argument-hint: [--url URL] [--duration SECONDS]
allowed-tools:
  - Bash
  - Read
model: sonnet
context: inherit
user-invocable: true
---

# DappSnap Record

Smart recording path. Fast for repeat users (uses saved plan). Guided for first-timers (no plan, routes to design interview first).

All paths below use `$PLUGIN_DIR` which is the repo root (the directory containing `.claude-plugin/plugin.json`). Resolve it from the working directory or the skill's parent: the user is expected to `cd` into the repo before launching the alias.

## Execution

1. Check if `.arcana/artifacts/RECORDING-PLAN.md` exists.

**If no plan exists (first time):**
Tell the user:
> "No recording plan found. Let's design one first — I'll ask you a few questions about what to record."
Then invoke `/dappsnap:design` and stop. Do not record anything yet.

**If a plan exists:**
2. Read `.env` for defaults (CDP_HOST, CDP_PORT, DAPPSNAP_URL)
3. Read `.arcana/artifacts/RECORDING-PLAN.md` and execute each flow
4. Report file path and size when done

### With arguments

If the user passed `--url` or `--duration`, use those:

```bash
cd "$PLUGIN_DIR"
node dist/src/screencast.js $ARGUMENTS
```

### With a saved plan

If `.arcana/artifacts/RECORDING-PLAN.md` exists, parse each flow and run sequentially:

```bash
cd "$PLUGIN_DIR"
# For each flow in the plan:
node dist/src/screencast.js --url "[flow URL]" --duration [duration]
```

### With defaults only

```bash
cd "$PLUGIN_DIR"
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

## Anti-Patterns

- **Never close Chrome** — always use `browser.disconnect()`, never `browser.close()`; the Chrome instance is shared and must stay running for future recordings
- **Never assume CDP is reachable** — check the CDP endpoint before attempting to connect; if unreachable, report the error and tell the user how to start Chrome with the recording profile
- **Never overwrite existing recordings without checking** — recordings use timestamped filenames by design; if a filename collision somehow occurs, append a suffix rather than overwriting
- **Never run without verifying the build is current** — check that `dist/src/screencast.js` exists before executing; if missing, report "Build required: run `npm run build` first" and stop
- **Never swallow recording errors** — if the screencast process exits with a non-zero code, report the full error output; do not silently continue to the next flow
