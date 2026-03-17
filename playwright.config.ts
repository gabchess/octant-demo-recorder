import { defineConfig } from '@playwright/test'

/**
 * Synpress-aware Playwright configuration.
 * Primary recording via Playwright built-in video.
 *
 * THREE MODES:
 *
 * HEADLESS (default): walletAction: 'inject' or 'none'.
 *   Uses headless-web3-provider for wallet injection. No extension, no display.
 *   Runs from SSH on headless Mac Mini. Video recording works natively.
 *
 * HEADED (set HEADLESS=false): walletAction: 'connect'.
 *   Uses Synpress MetaMask extension sideloading via --load-extension.
 *   Requires a GUI session. Use only when real MetaMask extension is needed.
 *
 * Google Chrome and Edge removed extension sideloading flags. Do NOT use
 * channel: 'chrome' or 'msedge' for extension testing.
 */
export default defineConfig({
  testDir: process.env.PLAYWRIGHT_TEST_DIR ?? './test',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',

  use: {
    // Playwright built-in video recording (primary capture path)
    video: 'on',
    screenshot: 'on',
    trace: 'on',

    // Headless by default (walletAction: 'inject' or 'none').
    // Set HEADLESS=false for walletAction: 'connect' (Synpress MetaMask extension).
    headless: process.env.HEADLESS === 'false' ? false : true,

    // Playwright-bundled Chromium retains extension sideloading CLI flags.
    channel: 'chromium',

    // Viewport: 1920x1080
    viewport: { width: 1920, height: 1080 },

    baseURL: process.env.BASE_URL ?? 'https://octant.app',

    // GPU + anti-detection launch args
    launchOptions: {
      args: [
        '--use-gl=egl',
        '--enable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },

  outputDir: './recordings/playwright/',

  // Single worker, generous timeout for MetaMask interactions
  timeout: 120_000,
})
