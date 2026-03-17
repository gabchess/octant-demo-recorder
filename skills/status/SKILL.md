---
description: Health check. Chrome reachable? Webhook up? Last recording.
allowed-tools:
  - Bash
  - Read
model: inherit
context: inherit
user-invocable: true
---

# DappSnap Status

Infrastructure health check. Reports Chrome CDP connectivity, webhook server status, and last recording.

## Execution

Run all checks and report:

### 1. Chrome CDP

```bash
source ~/projects/octant-demo-recorder/.env 2>/dev/null
CDP_HOST="${CDP_HOST:-100.68.19.10}"
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
ls -lt ~/projects/octant-demo-recorder/recordings/*.webm 2>/dev/null | head -3
```

Report: last recording file, size, timestamp. Or "no recordings yet".

### 5. Build Status

```bash
ls -la ~/projects/octant-demo-recorder/dist/src/screencast.js 2>/dev/null
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
