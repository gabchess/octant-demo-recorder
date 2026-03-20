/**
 * Playwright-based recorder — wallet-free recording for any web page.
 *
 * Uses local headless Chromium via Playwright. No Chrome instance or CDP needed.
 * Supports natural-language steps parsed into Playwright actions.
 *
 * Stolen from digitalsamba toolkit:
 * - deviceScaleFactor: 2 for retina-quality output
 * - Cookie banner dismissal via common selectors
 * - CSS cursor injection for visible mouse pointer
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import type { ScreencastResult } from "./screencast.js";

/**
 * Minimal structural interface covering the Page methods used by executeStep
 * and dismissCookieBanners. Using a structural type instead of a concrete import
 * avoids package-version conflicts between `playwright` and `@playwright/test`.
 */
interface PageLike {
  evaluate(pageFunction: string): Promise<unknown>;
  waitForTimeout(timeout: number): Promise<void>;
  click(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
  url(): string;
  screenshot(options: { path: string }): Promise<Buffer>;
  $(selector: string): Promise<{ click(): Promise<void> } | null>;
}

export interface PlaywrightRecorderOptions {
  url: string;
  duration?: number;
  steps?: string[];
  outputDir?: string;
  size?: { width: number; height: number };
}

// Re-export the shared result type so callers only need this module
export type RecorderResult = ScreencastResult;

const COOKIE_BANNER_SELECTORS = [
  '[id*="cookie"] button',
  '[class*="cookie"] button',
  '[id*="consent"] button',
  '[class*="consent"] button',
  'button[data-testid*="accept"]',
  'button[data-testid*="cookie"]',
  "#onetrust-accept-btn-handler",
  ".cc-accept",
];

const CURSOR_CSS = `
  *, *::after, *::before {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='rgba(0,0,0,0.7)' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 8 8, auto !important;
  }
`;

/**
 * Parse a natural-language step string into a Playwright action.
 * Returns a function that executes the step on the given page.
 */
export async function executeStep(
  page: PageLike,
  step: string,
  outputDir: string,
): Promise<void> {
  const s = step.trim().toLowerCase();

  // scroll down Npx
  const scrollDownMatch = s.match(/^scroll down (\d+)px?$/);
  if (scrollDownMatch) {
    const amount = parseInt(scrollDownMatch[1], 10);
    await page.evaluate(`window.scrollBy(0, ${amount})`);
    return;
  }

  // scroll up Npx
  const scrollUpMatch = s.match(/^scroll up (\d+)px?$/);
  if (scrollUpMatch) {
    const amount = parseInt(scrollUpMatch[1], 10);
    await page.evaluate(`window.scrollBy(0, ${-amount})`);
    return;
  }

  // scroll down (no amount — default 500px)
  if (s === "scroll down") {
    await page.evaluate("window.scrollBy(0, 500)");
    return;
  }

  // scroll up (no amount — default 500px)
  if (s === "scroll up") {
    await page.evaluate("window.scrollBy(0, -500)");
    return;
  }

  // wait N seconds
  const waitMatch = s.match(/^wait (\d+(?:\.\d+)?) seconds?$/);
  if (waitMatch) {
    const seconds = parseFloat(waitMatch[1]);
    await page.waitForTimeout(seconds * 1000);
    return;
  }

  // click SELECTOR
  if (s.startsWith("click ")) {
    const selector = step.trim().slice("click ".length).trim();
    await page.click(selector);
    return;
  }

  // hover SELECTOR
  if (s.startsWith("hover ")) {
    const selector = step.trim().slice("hover ".length).trim();
    await page.hover(selector);
    return;
  }

  // type SELECTOR TEXT (format: "type SELECTOR text here")
  if (s.startsWith("type ")) {
    const rest = step.trim().slice("type ".length).trim();
    // Split on first space to separate selector from text
    const spaceIdx = rest.indexOf(" ");
    if (spaceIdx === -1) {
      console.warn(
        `[aria] Malformed type step (expected "type SELECTOR text"): "${step}"`,
      );
      return;
    }
    const selector = rest.slice(0, spaceIdx);
    const text = rest.slice(spaceIdx + 1);
    await page.fill(selector, text);
    return;
  }

  // navigate PATH
  if (s.startsWith("navigate ")) {
    const path = step.trim().slice("navigate ".length).trim();
    const currentUrl = page.url();
    const base = new URL(currentUrl).origin;
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    return;
  }

  // screenshot NAME
  if (s.startsWith("screenshot ")) {
    const name = step.trim().slice("screenshot ".length).trim();
    const screenshotDir = join(outputDir, "screenshots");
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: join(screenshotDir, `${name}.png`) });
    return;
  }

  console.warn(`[aria] Unknown step (skipping): "${step}"`);
}

/**
 * Dismiss common cookie consent banners if present.
 * Silently ignores if none found.
 */
export async function dismissCookieBanners(page: PageLike): Promise<void> {
  for (const selector of COOKIE_BANNER_SELECTORS) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        console.log(`[aria] Dismissed cookie banner via: ${selector}`);
        return;
      }
    } catch {
      // Not found or not clickable — try next selector
    }
  }
}

/**
 * Record a video demo of a web page using local headless Playwright.
 * No Chrome instance or CDP connection required.
 */
export async function recordPlaywright(
  options: PlaywrightRecorderOptions,
): Promise<RecorderResult> {
  const url = options.url;
  const duration = options.duration ?? 30;
  const outputDir = resolve(options.outputDir ?? "./recordings");
  const size = options.size ?? { width: 1920, height: 1080 };

  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `aria-${timestamp}.webm`;
  const filePath = join(outputDir, filename);

  console.log(`[aria] Launching headless Chromium`);
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    recordVideo: {
      dir: outputDir,
      size,
    },
    viewport: size,
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Inject visible cursor CSS
  await page.addStyleTag({ content: CURSOR_CSS }).catch(() => {
    // Non-fatal — page may not support style injection before navigation
  });

  console.log(`[aria] Navigating to ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("body", { timeout: 15_000 });
  console.log("[aria] Page loaded");

  // Inject cursor after page load
  await page.addStyleTag({ content: CURSOR_CSS }).catch(() => {});

  // Dismiss cookie banners
  await dismissCookieBanners(page);

  const startTime = Date.now();

  if (options.steps && options.steps.length > 0) {
    console.log(`[aria] Executing ${options.steps.length} steps`);
    for (const step of options.steps) {
      console.log(`[aria] Step: ${step}`);
      await executeStep(page, step, outputDir);
    }
    // After all steps, wait out any remaining duration
    const elapsed = Date.now() - startTime;
    const remaining = duration * 1000 - elapsed;
    if (remaining > 0) {
      await page.waitForTimeout(remaining);
    }
  } else {
    // Default behavior: wait, scroll down, wait, scroll up — mirrors screencast.ts pattern
    const sleep = (ms: number) => page.waitForTimeout(ms);
    const scrollInterval = Math.floor(duration / 3);

    console.log("[aria] Default flow: wait, scroll, recover");
    await sleep(scrollInterval * 1000);

    console.log("[aria] Scrolling down");
    await page.evaluate("window.scrollBy(0, 500)");
    await sleep(scrollInterval * 1000);

    console.log("[aria] Scrolling up");
    await page.evaluate("window.scrollBy(0, -500)");
    await sleep((duration - scrollInterval * 2) * 1000);
  }

  const durationMs = Date.now() - startTime;

  // Save the recorded video to our named path
  const video = page.video();
  await context.close();

  if (video) {
    await video.saveAs(filePath);
  } else {
    throw new Error(
      "[aria] No video recorded — Playwright video context may not have initialized",
    );
  }

  await browser.close();
  console.log(`[aria] Recording saved: ${filePath}`);

  return { filePath, durationMs, url };
}
