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

First-time setup. Explains how everything works in plain language, figures out what the user needs (wallet or no wallet, access requirements), and walks them through every step before recording anything.

**No jargon. No assumptions. Ask before assuming.**

<progress>
- [ ] Step 1: Welcome — explain how dappsnap works
- [ ] Step 2: Target URL
- [ ] Step 3: Wallet / access requirements
- [ ] Step 4: Chrome setup — explain, check, guide
- [ ] Step 5: MetaMask setup (if needed)
- [ ] Step 6: App access requirements (if needed)
- [ ] Step 7: Confirm readiness
- [ ] Step 8: Alias + .env
- [ ] Step 9: Final instructions
</progress>

---

## Step 1: Welcome

```
AskUserQuestion:
  question: "Welcome to DappSnap. Here's how it works before we set anything up."
  header: "How DappSnap Works"
  options:
    - label: "Got it — let's start"
    - label: "Exit"
  preview: |
    WHAT DAPPSNAP DOES
    DappSnap records a video walkthrough of any web app — navigating pages,
    scrolling, interacting — and saves it as an MP4 file you can share.

    HOW IT WORKS
    1. Chrome browser — runs on your machine with a dedicated recording profile.
       This is the browser that gets recorded. It stays open during recording.

    2. DappSnap skill — the agent connects to Chrome, drives it automatically
       (navigates, scrolls, interacts), and saves the video.

    That's it. No screen recorder. No manual clicking.

    WHAT WE'LL DO IN SETUP
    - Find out what app you want to record
    - Figure out if it needs a wallet to access
    - Walk you through anything that needs to be set up first
    - Install a shortcut to launch dappsnap easily
```

If "Exit" → stop.

---

## Step 2: Target URL

```
AskUserQuestion:
  question: "What app do you want to record?"
  header: "Target App"
  options:
    - label: "Octant v2"
      description: "https://glm.octant.app/"
    - label: "Uniswap"
      description: "https://app.uniswap.org/"
    - label: "Aave"
      description: "https://app.aave.com/"
    - label: "Something else"
      description: "Enter a custom URL"
```

If "Something else" → ask for URL. Store as `$TARGET_URL`.

---

## Step 3: Wallet / Access Requirements

```
AskUserQuestion:
  question: "Does this app require a crypto wallet to access its full features?"
  header: "Wallet Check"
  options:
    - label: "No — it's a public app, no wallet needed"
      description: "Anyone can browse it. No login required."
    - label: "Yes — wallet connect required"
      description: "You need MetaMask (or similar) connected to see the main features."
    - label: "Not sure"
      description: "I'll explain what to look for."
```

If "Not sure":
```
Tell the user:
  Most DeFi apps show a "Connect Wallet" button on the homepage.
  If the main content (dashboard, pools, metrics) is hidden behind that button —
  you need a wallet. If you can browse without connecting — you don't.

  Common apps that DO require a wallet: Octant, Aave, Compound, Gnosis Safe.
  Common apps that DON'T: Uniswap landing page, DeFiLlama, most docs sites.
```
Then re-ask.

Store as `$NEEDS_WALLET` (true/false).

---

## Step 3b: App-Specific Access Requirements (if wallet needed)

```
AskUserQuestion:
  question: "Does this app have any special requirements beyond just connecting a wallet?"
  header: "Access Requirements"
  options:
    - label: "No — just connect MetaMask and you're in"
      description: "Standard wallet connect, no tokens or staking required."
    - label: "Yes — it requires holding or locking tokens"
      description: "Like Octant v2 which requires 100 GLM locked to access all features."
    - label: "Not sure"
```

If "Yes — tokens required":
```
AskUserQuestion:
  question: "What does it require?"
  header: "Token Requirement"
  options:
    - label: "Lock or stake tokens (like Octant's 100 GLM requirement)"
    - label: "Hold a minimum token balance"
    - label: "Other (I'll explain)"
```

Store requirements as `$ACCESS_REQUIREMENTS`. We'll guide the user through this in Step 6.

---

## Step 4: Chrome Setup

Tell the user:

```
CHROME SETUP
DappSnap needs Chrome to run with a dedicated recording profile — separate from
your regular Chrome. This way MetaMask and your recording wallet stay isolated
from your personal browser.

Checking if a recording-ready Chrome is already running...
```

Check:
```bash
curl -s --connect-timeout 3 "http://localhost:9222/json/version" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('CDP_OK=true')" 2>/dev/null || echo "CDP_OK=false"
```

**If CDP_OK=true:** Chrome is already running. Continue.

**If CDP_OK=false:**

```
AskUserQuestion:
  question: "Chrome isn't running yet in recording mode. Let's start it."
  header: "Start Chrome"
  options:
    - label: "I'll start it now — show me the command"
    - label: "Skip for now (I'll start it before recording)"
  preview: |
    Open a new terminal window and paste this exact command:

    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
      --remote-debugging-port=9222 \
      --remote-debugging-address=127.0.0.1 \
      --user-data-dir="$HOME/Library/Application Support/DappSnap-Profile" \
      --no-first-run --no-default-browser-check

    This opens a Chrome window with a fresh profile just for DappSnap.
    Leave that terminal window open — don't close it.
    Chrome needs to stay running while you record.

    IMPORTANT: This profile starts completely empty (no extensions, no bookmarks).
    That's intentional — it keeps your recording environment clean.
```

If "I'll start it now": wait for user to confirm, then re-check CDP. If still not reachable, show command again. Continue regardless.

---

## Step 5: MetaMask Setup (only if $NEEDS_WALLET = true)

```
AskUserQuestion:
  question: "Do you already have MetaMask installed in your DappSnap Chrome profile?"
  header: "MetaMask"
  options:
    - label: "Yes — MetaMask is installed and I have a wallet ready"
    - label: "No — I need to install MetaMask"
    - label: "I have MetaMask but need to set up a new wallet for recording"
```

**If "No — I need to install MetaMask":**

```
Tell the user:
  In the DappSnap Chrome window (the one you just opened):

  1. Go to: https://metamask.io/download
  2. Click "Install MetaMask for Chrome"
  3. Follow the installation steps
  4. When asked to create a wallet: create a NEW wallet — don't import your main wallet
     Keep this wallet separate. It's for recording only.
  5. Write down or save the seed phrase somewhere safe
  6. Complete the MetaMask setup — you'll see the fox icon in your toolbar

  Come back here when MetaMask is installed and set up.
```

Re-ask to confirm MetaMask is installed before continuing.

**If "I have MetaMask but need to set up a new wallet":**

```
Tell the user:
  In MetaMask, click the circle icon (top right) → "Add account or hardware wallet"
  → "Add a new account". Give it a name like "DappSnap Recording".

  This creates a fresh wallet address for recording. Keep it separate from
  your main wallet — you may need to fund it with a small amount of ETH for gas.
```

---

## Step 6: App Access Requirements (only if $ACCESS_REQUIREMENTS is set)

Handle based on what was captured in Step 3b.

**If app requires locking/staking tokens (like Octant's 100 GLM):**

```
AskUserQuestion:
  question: "To record this app you'll need to meet its access requirements first. Here's the process."
  header: "App Access Setup"
  options:
    - label: "I've already done this — wallet is ready and app is unlocked"
    - label: "Walk me through it"
  preview: |
    This app requires locking tokens to access all features.
    You need to do this once, from inside the DappSnap Chrome profile.

    GENERAL PROCESS:
    1. Get the required tokens into your recording wallet
       (You'll need to buy or transfer them — check the app's requirements)

    2. Get a small amount of ETH in the same wallet for gas fees
       (Usually $5-10 worth is enough for a few transactions)

    3. Open the app in the DappSnap Chrome window
       Navigate to the locking/staking section

    4. Connect your recording MetaMask wallet
       Click "Connect Wallet" → choose MetaMask → approve the connection

    5. Lock or stake the required amount
       Approve the transaction in MetaMask when prompted

    6. Once done, the app should show you the full experience
       This unlocked state will persist in the DappSnap profile

    FOR OCTANT v2 SPECIFICALLY:
    - You need 100 GLM locked to unlock all pages
    - Get GLM on a DEX (Uniswap, etc.) and send to your recording wallet
    - Go to glm.octant.app → Lock GLM → approve in MetaMask
    - After locking, all pages (Projects, Metrics, Leaderboard) become accessible
```

If "Walk me through it": ask which app, then provide specific step-by-step for that app.

After confirming access is set up, tell the user:

```
Your recording wallet and app access are ready.
From now on, every time you record this app, just:
1. Open Chrome with the DappSnap profile (same command as before)
2. The wallet and access state will be there — nothing to redo
```

---

## Step 7: Confirm Readiness

```
AskUserQuestion:
  question: "Everything looks good. Ready to finish setup?"
  header: "Ready Check"
  options:
    - label: "Yes — finish setup"
    - label: "I need to finish the Chrome / wallet steps first"
  preview: |
    Chrome (recording profile): [CDP_OK ? "✅ Running" : "⚠️ Not detected — start before recording"]
    Wallet needed: [$NEEDS_WALLET ? "Yes" : "No"]
    [if NEEDS_WALLET]: MetaMask: [confirmed installed ? "✅ Ready" : "⚠️ Needs setup"]
    [if ACCESS_REQUIREMENTS]: App access: [confirmed ? "✅ Unlocked" : "⚠️ Complete token locking first"]

    You can finish setup now and complete any remaining steps later.
    Just make sure Chrome is running before you start a recording.
```

---

## Step 8: Alias + .env

Ask for alias name:
```
AskUserQuestion:
  question: "Choose a shortcut name. You'll type this to launch dappsnap."
  header: "Shortcut Name"
  options:
    - label: "dappsnap (recommended)"
    - label: "snap"
    - label: "recorder"
    - label: "Custom"
```

Detect shell, resolve config file (zsh→`~/.zshrc`, bash→`~/.bashrc`, fish→`~/.config/fish/config.fish`).

Check alias isn't taken:
```bash
command -v $ALIAS_NAME 2>/dev/null; echo "exit:$?"
```

Write alias:
```bash
grep -v '# dappsnap-plugin' "$SHELL_CONFIG" > "$SHELL_CONFIG.tmp" && mv "$SHELL_CONFIG.tmp" "$SHELL_CONFIG"
echo "" >> "$SHELL_CONFIG"
echo "alias $ALIAS_NAME='claude --plugin-dir $PLUGIN_DIR'  # dappsnap-plugin" >> "$SHELL_CONFIG"
```

Write .env (localhost defaults — same machine setup):
```bash
if [ ! -f "$PLUGIN_DIR/.env" ] || ! grep -q "CDP_HOST" "$PLUGIN_DIR/.env"; then
  cat >> "$PLUGIN_DIR/.env" << EOF
CDP_HOST=localhost
CDP_PORT=9222
DAPPSNAP_URL=$TARGET_URL
EOF
fi
```

---

## Step 9: Final Instructions

```
✅ Setup complete.

TO RECORD (every time):

1. Open a terminal and start Chrome:
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/Library/Application Support/DappSnap-Profile"
   → Leave this terminal open while recording

2. Open another terminal and launch dappsnap:
   source $SHELL_CONFIG && $ALIAS_NAME

3. Choose your recording mode:
   /dappsnap:design    ← guided: choose pages, actions, duration
   /dappsnap:record    ← fast: records immediately with saved defaults
   /dappsnap:status    ← check Chrome is reachable

4. When recording is done, close the Chrome terminal.

Your recording profile and wallet state are saved in:
  ~/Library/Application Support/DappSnap-Profile
Everything will be there next time — no need to reconnect or lock tokens again.
```
