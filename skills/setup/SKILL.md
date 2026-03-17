---
description: First-time setup. Walks the user through everything from scratch.
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
model: inherit
context: inherit
user-invocable: true
---

# DappSnap Setup

First-time setup. Explains how everything works in plain language, checks what's already running, walks the user through anything missing step by step, then installs the alias and config.

**No jargon. No assumptions. Explain everything before asking anything.**

<progress>
- [ ] Step 1: Welcome + explain how dappsnap works
- [ ] Step 2: Find the repo
- [ ] Step 3: Check Chrome — explain, detect, guide if missing
- [ ] Step 4: Check Tailscale — explain, detect, guide if missing
- [ ] Step 5: Summarize status, ask for confirmation
- [ ] Step 6: Ask for alias name
- [ ] Step 7: Write alias to shell config
- [ ] Step 8: Write .env if needed
- [ ] Step 9: Final instructions
</progress>

---

## Step 1: Welcome + Explain

Before doing anything else, explain how dappsnap works. Use plain language:

```
AskUserQuestion:
  question: "Welcome to DappSnap. Here's how it works before we set anything up."
  header: "How DappSnap Works"
  options:
    - label: "Got it — let's set it up"
    - label: "Exit"
  preview: |
    WHAT DAPPSNAP DOES
    DappSnap records a video walkthrough of any web3 app — navigating pages,
    scrolling, interacting — and saves it as an MP4 file.

    HOW IT WORKS (3 pieces)

    1. Chrome browser — runs on your Mac with a dedicated profile and MetaMask
       installed. This is the browser that gets recorded. It needs to be open
       before any recording starts.

    2. Tailscale — a networking tool that creates a private tunnel so the
       recording script can reach your Chrome browser securely. Both machines
       need Tailscale installed.

    3. DappSnap skill — the agent drives Chrome remotely, navigates the app,
       and saves the recording as a file on your machine.

    WHAT WE'LL DO IN SETUP
    - Check if Chrome is running and ready
    - Check if Tailscale is connected
    - Guide you through anything that's missing
    - Create a shortcut (alias) so you can launch dappsnap easily

    This takes about 5 minutes.
```

If "Exit" → stop.

---

## Step 2: Find the Repo

Check if we're inside the dappsnap repo:

```bash
if [ -f ".claude-plugin/plugin.json" ]; then
  echo "REPO_FOUND=true"
  echo "PLUGIN_DIR=$(pwd)"
else
  for dir in \
    "$HOME/projects/octant-demo-recorder" \
    "$HOME/git/octant-demo-recorder" \
    "$HOME/projects/dappsnap" \
    "$HOME/git/dappsnap"; do
    if [ -f "$dir/.claude-plugin/plugin.json" ]; then
      echo "REPO_FOUND=true"
      echo "PLUGIN_DIR=$(cd $dir && pwd)"
      break
    fi
  done
fi
```

If repo not found, ask:

```
AskUserQuestion:
  question: "Where is the dappsnap folder on your machine?"
  header: "Repo Location"
  options:
    - label: "Enter path manually"
```

Store as `$PLUGIN_DIR`.

---

## Step 3: Chrome — Explain, Check, Guide

First explain what Chrome needs to be:

Tell the user:

```
CHROME CHECK
DappSnap needs Chrome to run with a special flag that lets it be controlled remotely.
This is called the "debug port" — it's the same Chrome you already have, just started
with an extra option. We keep it in a separate profile so it doesn't mix with your
regular browsing.

Checking now if Chrome is already running and ready...
```

Run the check:

```bash
curl -s --connect-timeout 3 "http://100.68.19.10:9222/json/version" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('CDP_OK=true\nBROWSER=' + d.get('Browser','?'))" 2>/dev/null || echo "CDP_OK=false"
```

**If CDP_OK=true:** tell the user Chrome is already running and ready. Show which version. Continue.

**If CDP_OK=false:** walk the user through starting it:

```
AskUserQuestion:
  question: "Chrome isn't running yet. Let's start it."
  header: "Start Chrome"
  options:
    - label: "I'll start it now"
    - label: "Skip for now"
  preview: |
    Open a new terminal window and paste this command:

    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
      --remote-debugging-port=9222 \
      --remote-debugging-address=127.0.0.1 \
      --user-data-dir="$HOME/Library/Application Support/DappSnap-Profile" \
      --no-first-run --no-default-browser-check

    That opens a Chrome window with a separate profile — this is where MetaMask
    will live for recordings. Leave that terminal running (don't close it).

    If this is your first time: install MetaMask in that Chrome window,
    create or import a test wallet, and make sure it's connected to the app
    you want to record.
```

If "I'll start it now": wait, then re-check CDP. If still not reachable, show the command again and offer to continue anyway.

---

## Step 4: Tailscale — Explain, Check, Guide

Tell the user:

```
TAILSCALE CHECK
Tailscale creates a private network between your machines so the recording script
can reach Chrome securely. We need to forward Chrome's debug port over this network.

Checking if Tailscale is active...
```

```bash
curl -s --connect-timeout 3 "http://100.68.19.10:9222/json/version" 2>/dev/null && echo "TUNNEL_OK=true" || echo "TUNNEL_OK=false"
```

**If TUNNEL_OK=true:** tell the user the tunnel is active. Continue.

**If TUNNEL_OK=false:**

```
AskUserQuestion:
  question: "Tailscale tunnel isn't active yet. Let's set it up."
  header: "Tailscale Forward"
  options:
    - label: "I'll run it now"
    - label: "Skip for now"
  preview: |
    Open a new terminal window and run:

    /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --tcp 9222 tcp://localhost:9222

    This forwards Chrome's debug port over Tailscale so recordings can work
    from another machine. It runs in the background — you'll see a confirmation
    message when it's active. You only need to run this once per session.

    If Tailscale isn't installed: download it from https://tailscale.com/download
    and connect to your network before continuing.
```

Re-check after user confirms. Continue regardless.

---

## Step 5: Status Summary + Confirmation

```
AskUserQuestion:
  question: "Here's your current status. Ready to finish setup?"
  header: "Setup Summary"
  options:
    - label: "Finish setup"
    - label: "Cancel"
  preview: |
    Chrome CDP: [CDP_OK ? "✅ Running" : "⚠️ Not detected — start Chrome before recording"]
    Tailscale:  [TUNNEL_OK ? "✅ Active" : "⚠️ Not active — run forward command before recording"]

    WHAT SETUP WILL DO
    - Create a shortcut (alias) on your machine to launch dappsnap
    - Save your Chrome connection settings

    You can run recordings even if Chrome isn't running right now —
    just make sure to start it before you use /dappsnap:record or /dappsnap:design.
```

If "Cancel" → stop, no changes.

---

## Step 6: Alias Name

```
AskUserQuestion:
  question: "Choose a name for your shortcut. You'll type this in your terminal to launch dappsnap."
  header: "Shortcut Name"
  options:
    - label: "dappsnap (recommended)"
    - label: "snap"
    - label: "recorder"
    - label: "Custom name"
```

Store as `$ALIAS_NAME`. Check it's not already taken:

```bash
command -v $ALIAS_NAME 2>/dev/null; echo "exit:$?"
```

If taken, inform user and ask for a different name.

---

## Step 7: Write Alias

Detect shell, resolve config file:
- zsh → `~/.zshrc`
- bash → `~/.bashrc` (or `~/.bash_profile` on macOS)
- fish → `~/.config/fish/config.fish`

Remove any existing dappsnap lines, append:

```bash
grep -v '# dappsnap-plugin' "$SHELL_CONFIG" > "$SHELL_CONFIG.tmp" && mv "$SHELL_CONFIG.tmp" "$SHELL_CONFIG"
echo "" >> "$SHELL_CONFIG"
echo "alias $ALIAS_NAME='claude --plugin-dir $PLUGIN_DIR'  # dappsnap-plugin" >> "$SHELL_CONFIG"
```

---

## Step 8: Write .env

If `.env` doesn't exist or is missing `CDP_HOST`:

```bash
cat >> "$PLUGIN_DIR/.env" << EOF
CDP_HOST=100.68.19.10
CDP_PORT=9222
DAPPSNAP_URL=https://glm.octant.app/
EOF
```

---

## Step 9: Final Instructions

```
✅ Setup complete.

YOUR SHORTCUT
  alias $ALIAS_NAME='claude --plugin-dir $PLUGIN_DIR'

TO START NOW — run this in your terminal:
  source $SHELL_CONFIG && cd $PLUGIN_DIR && $ALIAS_NAME

EVERY TIME YOU WANT TO RECORD
1. Start Chrome with the DappSnap profile (keep that terminal open):
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/Library/Application Support/DappSnap-Profile"

2. Start the Tailscale tunnel (run once per session):
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --tcp 9222 tcp://localhost:9222

3. Launch dappsnap:
   $ALIAS_NAME

4. Run a recording:
   /dappsnap:design     ← guided: choose URL, pages, actions, duration
   /dappsnap:record     ← fast: records immediately with saved defaults
   /dappsnap:status     ← check if Chrome and Tailscale are active

5. When done recording, you can close the Chrome terminal.
```
