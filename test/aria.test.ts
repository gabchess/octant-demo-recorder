import { test, expect } from "@playwright/test";
import { selectMode } from "../src/mode-selector.js";
import {
  executeStep,
  dismissCookieBanners,
  recordPlaywright,
} from "../src/playwright-recorder.js";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// selectMode — pure function, no browser needed
// ---------------------------------------------------------------------------

test("selectMode - wallet=true returns cdp", () => {
  const mode = selectMode({ url: "https://example.com", wallet: true });
  expect(mode).toBe("cdp");
});

test("selectMode - wallet=false returns playwright", () => {
  const mode = selectMode({ url: "https://example.com", wallet: false });
  expect(mode).toBe("playwright");
});

// ---------------------------------------------------------------------------
// executeStep — unit tests using a real Playwright page
// ---------------------------------------------------------------------------

test("executeStep - scroll down 500px executes without error", async ({
  page,
}) => {
  await page.goto("about:blank");
  await expect(
    executeStep(page, "scroll down 500px", tmpdir()),
  ).resolves.toBeUndefined();
});

test("executeStep - wait 1 seconds executes without error", async ({
  page,
}) => {
  await page.goto("about:blank");
  await expect(
    executeStep(page, "wait 1 seconds", tmpdir()),
  ).resolves.toBeUndefined();
});

test("executeStep - unknown step prints warning and does not throw", async ({
  page,
}) => {
  await page.goto("about:blank");
  const warnings: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    await expect(
      executeStep(page, "do something unknown", tmpdir()),
    ).resolves.toBeUndefined();
    expect(warnings.some((w) => w.includes("Unknown step"))).toBe(true);
  } finally {
    console.warn = orig;
  }
});

// ---------------------------------------------------------------------------
// dismissCookieBanners — runs on a page with no cookie banners
// ---------------------------------------------------------------------------

test("dismissCookieBanners - does not throw on page with no banners", async ({
  page,
}) => {
  await page.goto("about:blank");
  await expect(dismissCookieBanners(page)).resolves.toBeUndefined();
});

// ---------------------------------------------------------------------------
// recordPlaywright — integration: produces a WebM file
// ---------------------------------------------------------------------------

test("recordPlaywright - records about:blank and produces a WebM file", async () => {
  test.setTimeout(30_000);
  const outputDir = join(tmpdir(), `aria-test-${Date.now()}`);
  const result = await recordPlaywright({
    url: "about:blank",
    duration: 2,
    outputDir,
  });
  expect(result.filePath).toMatch(/\.webm$/);
  expect(existsSync(result.filePath)).toBe(true);
  expect(result.durationMs).toBeGreaterThan(0);
  expect(result.url).toBe("about:blank");
});
