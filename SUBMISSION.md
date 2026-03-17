# DAPPSNAP -- Synthesis Hackathon Submission

**Track: Osobotai / MetaMask ($10K)**
**Harness: claude-code**

## One-paragraph description

Playwright-bundled Chromium is the only browser channel that still accepts `--load-extension` and `--disable-extensions-except` in headless mode. Chrome and Edge quietly removed these flags. That single fact was blocking headless MetaMask automation from SSH -- every team trying to build autonomous dapp tooling was either spinning up a virtual display (fragile, heavy) or keeping a human in the loop (not agentic). We found the gap and built around it. DAPPSNAP is a config-driven video production pipeline for Web3 dapps. You give it a YAML file -- target URL, wallet seed reference, feature list, output directory -- and it headlessly navigates any MetaMask-supported dapp, signs transactions, completes flows, and exports video recordings. There's no test runner to configure and no brittle selector framework. The pipeline runs autonomously on a headless machine. Built in one session by an AI agent and a human PM pair-programming across two machines, originally scoped for Octant's protocol and generalized from there. What it creates is a reproducible, agent-callable primitive for autonomous visual documentation of dapp behavior.

## Why this fits the Osobotai/MetaMask track

- Automates MetaMask interactions headlessly -- the exact capability the track is designed to reward
- Config-driven skill packaging means any agent can invoke MetaMask flows without a display
- Video output is auditable proof that an agent executed a transaction correctly
- Built on Synpress v4 + Playwright Chromium -- real MetaMask extension, not a wallet emulator

## Technical differentiator

Synpress+MCP lets Claude drive MetaMask interactively. DAPPSNAP packages MetaMask interactions as headless, recordable, CI-invocable skills -- so agents run them autonomously, not once.

## Repo

https://github.com/gabedonnan/dappsnap

## Team

- **Gabe** (human) -- Product Manager, architecture decisions, Mac Air
- **Aria** (AI agent) -- Implementation, Mac Mini, headless testing
- **Vera** (AI orchestrator) -- Agent coordination, research, quality gate
