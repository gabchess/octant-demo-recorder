#!/usr/bin/env node
/**
 * DAPPSNAP screencast recorder.
 *
 * Connects to Chrome on Mac Air via CDP (Tailscale TCP forward),
 * navigates to a URL, records a screencast, saves as WebM.
 *
 * Architecture: Path D (validated 2026-03-17)
 *   Mac Air: Chrome with --remote-debugging-port=9222
 *   Tailscale: TCP forward at CDP_HOST:CDP_PORT
 *   Mac Mini: This script connects via puppeteer-core
 *
 * Usage (CLI):
 *   node dist/src/screencast.js [--url https://glm.octant.app/] [--duration 30]
 *
 * Usage (module):
 *   import { recordScreencast } from './screencast.js'
 *   const result = await recordScreencast({ url: 'https://glm.octant.app/' })
 */

import "dotenv/config";
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface ScreencastOptions {
  url?: string;
  duration?: number;
  outputDir?: string;
}

export interface ScreencastResult {
  filePath: string;
  durationMs: number;
  url: string;
}

/**
 * Record a screencast of a URL via remote CDP connection.
 * Returns the path to the saved WebM file.
 */
export async function recordScreencast(
  options: ScreencastOptions = {},
): Promise<ScreencastResult> {
  const cdpHost = process.env.CDP_HOST ?? "100.68.19.10";
  const cdpPort = process.env.CDP_PORT ?? "9222";
  const url =
    options.url ?? process.env.DAPPSNAP_URL ?? "https://glm.octant.app/";
  const duration = options.duration ?? 30;
  const outputDir = resolve(options.outputDir ?? "./recordings");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `dappsnap-${timestamp}.webm` as `${string}.webm`;
  const filePath = resolve(outputDir, filename);

  mkdirSync(outputDir, { recursive: true });

  console.log(
    `[dappsnap] Connecting to Chrome at http://${cdpHost}:${cdpPort}`,
  );
  const browser = await puppeteer.connect({
    browserURL: `http://${cdpHost}:${cdpPort}`,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[dappsnap] Navigating to ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("body", { timeout: 15_000 });
  console.log("[dappsnap] Page loaded");

  console.log(`[dappsnap] Recording ${duration}s to ${filePath}`);
  const recorder = await page.screencast({
    path: filePath as `${string}.webm`,
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const scrollInterval = Math.floor(duration / 3);

  // Phase 1: wait for render
  await sleep(scrollInterval * 1000);

  // Phase 2: scroll down
  console.log("[dappsnap] Scrolling down");
  await page.evaluate("window.scrollBy(0, 500)");
  await sleep(scrollInterval * 1000);

  // Phase 3: scroll back up
  console.log("[dappsnap] Scrolling up");
  await page.evaluate("window.scrollBy(0, -500)");
  await sleep((duration - scrollInterval * 2) * 1000);

  await recorder.stop();
  const durationMs = duration * 1000;

  await page.close();
  await browser.disconnect();
  console.log(`[dappsnap] Recording saved: ${filePath}`);
  console.log(
    "[dappsnap] Browser disconnected (Chrome still running on Mac Air)",
  );

  return { filePath, durationMs, url };
}

// CLI entry point
if (process.argv[1]?.endsWith("screencast.js")) {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf("--url");
  const durIdx = args.indexOf("--duration");

  const url = urlIdx !== -1 ? args[urlIdx + 1] : undefined;
  const duration = durIdx !== -1 ? parseInt(args[durIdx + 1], 10) : undefined;

  recordScreencast({ url, duration }).catch((err) => {
    console.error("[dappsnap] FAILED:", err.message);
    process.exit(1);
  });
}
