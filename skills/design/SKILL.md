---
description: Design a custom recording session. Interview → plan → record.
argument-hint: [url]
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
model: opus
context: inherit
user-invocable: true
---

# DappSnap Design

Conversational recording planner. Interviews the user, builds a recording plan, executes on confirmation. Always ask all questions before recording anything.

<progress>
- [ ] Step 1: Target URL
- [ ] Step 2: Pages to visit
- [ ] Step 3: Actions per page
- [ ] Step 4: Duration per page
- [ ] Step 5: Output format
- [ ] Step 6: Confirm plan and record
</progress>

---

## Step 1: Target URL

If `$ARGUMENTS` is provided, use it as the URL and skip this question.

Otherwise ask:

```
AskUserQuestion:
  question: "What dApp do you want to record?"
  header: "Target"
  options:
    - label: "Octant v2"
      description: "https://glm.octant.app/"
    - label: "Uniswap"
      description: "https://app.uniswap.org/"
    - label: "Aave"
      description: "https://app.aave.com/"
    - label: "Custom URL"
      description: "Enter your own URL"
```

If "Custom URL" selected, ask for the URL as a follow-up. Store as `$TARGET_URL`.

---

## Step 2: Pages to Visit

```
AskUserQuestion:
  question: "Which pages should the recording visit?"
  header: "Pages"
  multiSelect: true
  options:
    - label: "Home / Dashboard"
      description: "Main landing page"
    - label: "Projects"
      description: "Project list or pool browser"
    - label: "Metrics"
      description: "Charts and protocol analytics"
    - label: "Leaderboard"
      description: "Rankings and stats"
    - label: "Custom path"
      description: "Enter a specific URL path"
```

If "Custom path" selected, ask for the path. Store ordered list as `$PAGES`.

---

## Step 3: Actions Per Page

```
AskUserQuestion:
  question: "What should happen on each page during recording?"
  header: "Actions"
  multiSelect: true
  options:
    - label: "Scroll down and back up"
      description: "Slow scroll to show full page content (default)"
    - label: "Hover over key elements"
      description: "Move mouse over cards, charts, buttons"
    - label: "Click into a project or item"
      description: "Navigate into detail view, then return"
    - label: "Show connected wallet state"
      description: "Pause on header to show wallet address"
```

Default if nothing selected: scroll down and back up. Store as `$ACTIONS`.

---

## Step 4: Duration Per Page

```
AskUserQuestion:
  question: "How long should each page be recorded?"
  header: "Duration"
  options:
    - label: "15 seconds"
      description: "Quick scan"
    - label: "30 seconds"
      description: "Standard demo (recommended)"
    - label: "60 seconds"
      description: "Detailed walkthrough"
```

Store as `$DURATION_SECONDS`.

---

## Step 5: Output Format

```
AskUserQuestion:
  question: "What output format do you need?"
  header: "Output"
  options:
    - label: "MP4 (recommended)"
      description: "Production-ready H.264 MP4 at 1920x1080. Ready to share."
    - label: "WebM only"
      description: "Raw recording, faster. No conversion step."
    - label: "Both"
      description: "WebM source + MP4 converted"
```

Store as `$OUTPUT_FORMAT`.

---

## Step 6: Confirm Plan and Record

Build a summary from all gathered inputs. Present to user:

```
AskUserQuestion:
  question: "Recording plan ready. Proceed?"
  header: "Plan Summary"
  options:
    - label: "Record now"
      description: "Start recording with this plan"
      preview: |
        RECORDING PLAN
        Target: $TARGET_URL
        Pages: [list each page with path]
        Actions: [list selected actions]
        Duration per page: $DURATION_SECONDS seconds
        Output format: $OUTPUT_FORMAT
        Estimated total: [page count * duration] seconds

        Flows:
        [for each page:]
          Page N: [page name] ([URL path])
          Actions: [actions for this page]
          Duration: $DURATION_SECONDS seconds
    - label: "Change something"
      description: "Go back and edit a specific step"
    - label: "Save plan only"
      description: "Write plan to disk, run later with /dappsnap:record"
```

If "Change something" → ask which step to change, loop back.
If "Save plan only" → write plan to `.arcana/artifacts/RECORDING-PLAN.md`, report path, stop.
If "Record now" → proceed.

Write plan to `.arcana/artifacts/RECORDING-PLAN.md`:

```markdown
# DappSnap Recording Plan

URL: $TARGET_URL
Pages: $PAGES
Actions: $ACTIONS
Duration per page: $DURATION_SECONDS seconds
Output: $OUTPUT_FORMAT
Estimated total: [count * duration]s

## Flows
[one section per page with URL, actions, duration]
```

---

## Execution

For each page in `$PAGES`:

1. Build the URL: if page is a named section (Home, Projects, etc.), navigate via clicking the nav link. If page is a custom path, navigate directly.

2. Run the recording:
```bash
cd ~/projects/octant-demo-recorder
node dist/src/screencast.js --url "$FLOW_URL" --duration $DURATION_SECONDS
```

3. If `$ACTIONS` includes "Hover over key elements": after page load, move mouse slowly across the viewport in a natural path (top section, middle, charts or cards area).

4. If `$ACTIONS` includes "Click into a project or item": after initial scroll, click the first visible project card, wait 3 seconds, then navigate back.

5. After each flow: report file path and size.

---

## After All Flows

If `$OUTPUT_FORMAT` includes MP4: convert each WebM:

```bash
ffmpeg -y -i "$WEBM_PATH" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$MP4_PATH"
```

Final report:

```
Recording complete.

Files:
  [list each output file with size]

Plan saved: .arcana/artifacts/RECORDING-PLAN.md
To re-run: /dappsnap:record
```

## Anti-Patterns

- **Never record without confirming the plan** — always present the full plan summary in a preview block and wait for explicit approval before starting any recording
- **Never skip the interview** — even if the user provides a URL as an argument, still ask about pages, actions, and duration; the URL only skips Step 1
- **Never batch questions** — ask one question at a time; each step gets its own AskUserQuestion call
- **Never assume the user knows what CDP or WebM means** — use plain language; say "Chrome recording connection" not "CDP", say "video file" not "WebM" unless the user is technical
- **Never start recording without verifying Chrome is reachable** — run the CDP health check before attempting to record; if Chrome is not running, tell the user how to start it
- **Never overwrite an existing recording plan without asking** — if `.arcana/artifacts/RECORDING-PLAN.md` already exists, ask whether to replace or create a new one
