---
description: Record a video demo of any web page or dApp. Runs a 3-question guided flow to determine the right recording path (Web2, wallet-only, or token-lock), then executes the recording.
argument-hint: <url> [--steps "step1, step2"] [--duration N]
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
model: inherit
context: inherit
user-invocable: true
---

# Aria Record

Record a video demo of any web page or dApp.

All paths below use `$PLUGIN_DIR` which is the repo root (the directory containing `.claude-plugin/plugin.json`). Resolve it from the working directory or the skill's parent.

---

## Step 0 -- Pre-flight

Before asking any questions, verify the build is current:

```bash
[ -f "$PLUGIN_DIR/dist/src/index.js" ] && echo "BUILD_OK" || echo "BUILD_MISSING"
```

If `BUILD_MISSING`: stop and tell the user `Build required: run npm run build first`. Do not proceed.

---

## Step 1 -- Guided Path Selection

Run through these questions in order using `AskUserQuestion` for each one. Do not batch them.

### Question 1: Web2 or Web3?

Ask:
> Is this a Web2 site (regular website, no crypto wallet needed) or a Web3 dApp?

- If **Web2** -- go to **WEB2 PATH**
- If **Web3** -- go to Question 2

### Question 2: Wallet needed?

Ask:
> Does the site require connecting a crypto wallet to see it?
> (e.g. it shows a "Connect Wallet" button before you can use it)

- If **No** -- go to **WEB2 PATH** (wallet-free Playwright handles it)
- If **Yes** -- go to Question 3

### Question 3: Token lock needed?

Ask:
> Does the site also require you to hold or lock tokens to see the full content?
> (e.g. Octant requires locking GLM to access the dashboard)

- If **No** -- go to **WALLET-ONLY PATH**
- If **Yes** -- go to **TOKEN-LOCK PATH**

---

## WEB2 PATH (wallet-free Playwright)

No warnings needed. Ask the user for the URL (if not already provided via `$ARGUMENTS`) and optional steps.

### Execution

Parse `$ARGUMENTS` for: URL (required), --steps (optional), --duration (optional, default 30).

```bash
cd "$PLUGIN_DIR"
node dist/src/index.js --url "$URL" $EXTRA_ARGS
```

### After recording

Report the WebM file path and file size. The recording is saved to `./recordings/` by default.

---

## WALLET-ONLY PATH (CDP mode)

### Pre-recording warning

Tell the user:
> You will need Chrome running with a debugging port and MetaMask installed.
> Start Chrome like this:
>
> ```
> /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-cdp-profile"
> ```
>
> Then install MetaMask, import or create a wallet, and navigate to the target URL.

Ask the user for the URL (if not already provided via `$ARGUMENTS`).

### Execution

```bash
cd "$PLUGIN_DIR"
node dist/src/index.js --url "$URL" --wallet $EXTRA_ARGS
```

Lower risk -- no real tokens needed unless the dApp requires a transaction.

### After recording

Report the WebM file path and file size.

---

## TOKEN-LOCK PATH (the dangerous one)

### Mandatory financial risk warning

**This warning MUST display before any recording starts. No flags, no shortcuts, no "I already know the risks" bypass.**

Display this text to the user, then use `AskUserQuestion` to require explicit confirmation:

```
FINANCIAL RISK WARNING -- READ BEFORE CONTINUING

This path interacts with real tokens on Ethereum mainnet.

What happens: If the demo flow includes locking tokens (e.g. Octant's
"Lock GLM" step), real tokens from the connected wallet will be sent
to a smart contract.

Key facts:
- Octant minimum lock: 100 GLM (~$15 at current prices)
- Each lock/unlock transaction costs gas (~$0.50-2.00)
- Tokens CAN be unlocked at any time (no epoch-end wait required)
- BUT: if you lose access to the wallet, tokens become permanently
  inaccessible
- The smart contract is non-custodial -- nobody can recover tokens
  for you

Before continuing, you MUST have a plan to recover your tokens after
recording. Two options:
  Option A: Unlock tokens inside the app before closing Chrome
            (preferred, 2 minutes)
  Option B: Export your MetaMask private key before closing Chrome
            (backup plan)

Do you want to continue? (yes/no)
```

Use `AskUserQuestion` for this confirmation. **If the user says no, stop immediately.** Do not proceed with any recording.

### Pre-recording setup

If the user confirms, tell them:

> You will need Chrome running with a debugging port and MetaMask installed.
> Start Chrome like this:
>
> ```
> /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-cdp-profile"
> ```
>
> Then install MetaMask, import or create a wallet with sufficient tokens,
> and navigate to the target URL.

Ask the user for the URL (if not already provided via `$ARGUMENTS`).

### Execution

```bash
cd "$PLUGIN_DIR"
node dist/src/index.js --url "$URL" --wallet $EXTRA_ARGS
```

### Mandatory post-recording recovery reminder

**This reminder MUST display after every token-lock recording, even if the recording fails.**

```
IMPORTANT -- RECOVER YOUR TOKENS NOW

Before closing Chrome or the browser profile:

Option A (preferred): Unlock inside the app
1. Open https://octant.app in the same Chrome session
2. MetaMask should already be connected (same Chrome profile).
   If not, click "Connect Wallet" and approve in MetaMask.
3. Click "Edit Locked GLM" from Home view
4. Click "Unlock" and enter the full locked amount
5. Confirm the transaction in MetaMask (gas fee applies)
6. Wait for block confirmation (~15-30 seconds)
7. Verify GLM balance is back in your wallet

Option B (backup): Export private key
1. Click the MetaMask fox icon in Chrome toolbar
2. Click the account selector circle at the top
3. Click the three dots next to the account with locked GLM
4. Select "Account details" then "Private key"
5. Enter your MetaMask password
6. Hold to reveal the private key
7. Copy and store it securely (password manager, encrypted note)
8. You can import this key into any MetaMask instance later to unlock

If you close Chrome without doing either:
Your tokens remain locked in the smart contract. They are NOT lost,
but you need the wallet's private key or seed phrase to access them
again. If you used the test wallet, the seed phrase is in your .env
file.
```

---

## AI-Directed Steps

When the user provides --steps, parse the natural language instructions into the step format the recorder expects. Steps are comma-separated actions:

- `scroll down` / `scroll up` -- scroll the page 500px
- `scroll down Npx` / `scroll up Npx` -- scroll by N pixels
- `wait N seconds` -- pause
- `click SELECTOR` -- click an element
- `hover SELECTOR` -- hover over an element
- `type SELECTOR text here` -- fill an input
- `navigate /path` -- go to a different page on the same origin
- `screenshot name` -- take a screenshot

Example:
```
/aria:record https://glm.octant.app/ --steps "wait 5 seconds, scroll down 500px, wait 3 seconds, scroll up 500px"
```

---

## Anti-Patterns

- **Never skip the token-lock warning** -- if the user selects the token-lock path, the warning MUST display. No flags, no shortcuts, no "I already know the risks" bypass.
- **Never end a token-lock session without showing recovery steps** -- even if the recording fails, show the recovery reminder.
- **Never reference Mac Mini paths** -- all commands run on the user's local machine.
- **Never close Chrome in CDP mode** -- always use `browser.disconnect()`, never `browser.close()`; the Chrome instance is shared.
- **Never assume CDP is reachable** -- check the CDP endpoint before attempting; if unreachable, report the error and tell the user how to start Chrome.
- **Never overwrite existing recordings** -- recordings use timestamped filenames by design.
- **Never run without verifying the build is current** -- check that `dist/src/index.js` exists before executing; if missing, report "Build required: run `npm run build` first".
- **Never swallow recording errors** -- report the full error output; do not silently continue.
