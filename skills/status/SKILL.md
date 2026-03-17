---
description: Health check. Chrome reachable? Webhook up? Last recording.
allowed-tools:
  - Bash
  - Read
model: sonnet
context: inherit
user-invocable: true
---

# DappSnap Status

Infrastructure health check. Reports Chrome CDP connectivity, webhook server status, and last recording.

## Execution

Run all checks and report:

### 1. Chrome CDP

```bash
source .env 2>/dev/null
CDP_HOST="${CDP_HOST:-localhost}"
CDP_PORT="${CDP_PORT:-9222}"
curl -s --connect-timeout 3 "http://${CDP_HOST}:${CDP_PORT}/json/version" 2>/dev/null
echo "EXIT=$?"
```

Report: reachable (show Chrome version) or unreachable (show start command).

### 2. Webhook Server

```bash
curl -s --connect-timeout 3 "http://localhost:3333/health" 2>/dev/null
echo "EXIT=$?"
```

Report: running (show uptime) or not running (show start command: `node dist/webhook-server.js`).

### 3. Tailscale

```bash
tailscale status 2>/dev/null | head -5
echo "EXIT=$?"
```

Report: connected or not connected.

### 4. Last Recording

```bash
ls -lt recordings/*.webm 2>/dev/null | head -3
```

Report: last recording file, size, timestamp. Or "no recordings yet".

### 5. Build Status

```bash
ls -la dist/src/screencast.js 2>/dev/null
echo "EXIT=$?"
```

Report: built (show timestamp) or not built (show `npm run build` command).

## Output Format

```
DappSnap Status
===============

Chrome CDP:     [OK: Chrome 146.0.x / UNREACHABLE]
                http://[host]:[port]

Webhook Server: [RUNNING (uptime Xs) / NOT RUNNING]
                http://localhost:3333

Tailscale:      [CONNECTED / NOT DETECTED]

Last Recording: [recordings/dappsnap-YYYY-MM-DD.webm (X.XMB) / none]

Build:          [CURRENT (timestamp) / STALE — run npm run build]
```

## Anti-Patterns

- **Never attempt to fix problems automatically** — this skill reports status only; if something is broken, tell the user what is wrong and how to fix it, but do not run fix commands
- **Never assume Tailscale is installed** — if `tailscale` command is not found, report "Tailscale: NOT INSTALLED" rather than erroring out; Tailscale is only needed for remote Chrome setups
- **Never skip any health check** — run all five checks (CDP, webhook, Tailscale, last recording, build status) every time, even if an earlier check fails
- **Never report misleading status** — if a check times out, report "TIMEOUT" not "UNREACHABLE"; if a service returns an unexpected response, report the raw response for debugging
