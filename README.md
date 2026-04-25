## UPDATE

This plugin is sunset/outdated, and the PRO version that one-shots any website app videos and demos in less than 5 mins is currently private for Octant internal use only. 

Sorry guys. 

# Aria Plugin

**ARIA** -- Record video demos of any web page with guided prompts and headless Playwright. Design a session, hit record, get a video.

## Components

### Skills

| Skill | Description |
|-------|-------------|
| `/aria:design` | Design a recording session interactively. Asks about URL, pages, actions, duration, and output format. |
| `/aria:record` | Record a video demo. Asks 3 guided questions, then records using headless Playwright. |

### Agents

| Agent | Model | Description |
|-------|-------|-------------|
| `aria-navigator` | sonnet | Previews a URL and reports page structure before recording starts |

## Usage

```bash
# Design a session plan first
/aria:design

# Record a demo directly
/aria:record https://glm.octant.app/projects
```

## Install

Fetch the skill into Claude Code:

```
fetch https://raw.githubusercontent.com/gabchess/octant-demo-recorder/main/SKILL.md
```

Then follow the instructions in the SKILL.md.
