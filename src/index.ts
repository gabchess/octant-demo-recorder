#!/usr/bin/env node
/**
 * Aria unified CLI entry point.
 *
 * Routes to Playwright (wallet-free) or CDP (wallet-required) mode based on --wallet flag.
 *
 * Usage:
 *   node dist/src/index.js --url <URL> [options]
 *
 * Options:
 *   --url <URL>          Target URL to record (required)
 *   --wallet             Use CDP mode for wallet-required dApps
 *   --steps <steps>      Comma-separated navigation steps (natural language)
 *   --duration <seconds> Recording duration (default: 30)
 *   --output <dir>       Output directory (default: ./recordings)
 *   --help               Show help
 *
 * Examples:
 *   node dist/src/index.js --url https://glm.octant.app/projects
 *   node dist/src/index.js --url https://glm.octant.app/ --steps "wait 5 seconds, scroll down 500px"
 *   node dist/src/index.js --url https://app.uniswap.org --wallet --duration 20
 */

import "dotenv/config";
import { selectMode, type CliArgs } from "./mode-selector.js";
import { recordScreencast } from "./screencast.js";
import { recordPlaywright } from "./playwright-recorder.js";

const HELP_TEXT = `
Usage:
  node dist/src/index.js --url <URL> [options]

Options:
  --url <URL>          Target URL to record (required)
  --wallet             Use CDP mode for wallet-required dApps
  --steps <steps>      Comma-separated navigation steps (natural language)
  --duration <seconds> Recording duration in seconds (default: 30)
  --output <dir>       Output directory (default: ./recordings)
  --help               Show this help message

Examples:
  node dist/src/index.js --url https://glm.octant.app/projects
  node dist/src/index.js --url https://glm.octant.app/ --steps "wait 5 seconds, scroll down 500px, wait 3 seconds"
  node dist/src/index.js --url https://app.uniswap.org --wallet --duration 20
`.trim();

function parseArgs(argv: string[]): CliArgs & { help: boolean } {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { url: "", wallet: false, help: true };
  }

  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const url = get("--url");
  if (!url) {
    console.error("[aria] Error: --url is required\n");
    console.error(HELP_TEXT);
    process.exit(1);
  }

  const wallet = args.includes("--wallet");

  const stepsRaw = get("--steps");
  const steps = stepsRaw
    ? stepsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const durationRaw = get("--duration");
  const duration = durationRaw ? parseInt(durationRaw, 10) : undefined;

  const outputDir = get("--output");

  return { url, wallet, steps, duration, outputDir, help: false };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const mode = selectMode(args);
  console.log(`[aria] Mode: ${mode}`);

  if (mode === "cdp") {
    const result = await recordScreencast({
      url: args.url,
      duration: args.duration,
      outputDir: args.outputDir,
    });
    console.log(
      `[aria] Done. File: ${result.filePath} (${result.durationMs}ms)`,
    );
  } else {
    const result = await recordPlaywright({
      url: args.url,
      duration: args.duration,
      steps: args.steps,
      outputDir: args.outputDir,
    });
    console.log(
      `[aria] Done. File: ${result.filePath} (${result.durationMs}ms)`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(
    "[aria] FAILED:",
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
