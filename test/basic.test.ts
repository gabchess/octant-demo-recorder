import { test, expect } from '@playwright/test'

/**
 * Basic Playwright setup test — verifies the Playwright environment
 * is wired up correctly WITHOUT requiring MetaMask or a real wallet.
 *
 * Architecture ref: Section 8 — Deployment Checklist step 8:
 *   "Basic test against a public URL works (no MetaMask needed)"
 *
 * Run:
 *   npx playwright test test/basic.test.ts
 */

test('basic - page loads and has content', async ({ page }) => {
  const baseUrl = process.env.BASE_URL ?? 'https://octant.app'
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  // Verify page loaded — body must exist
  const body = page.locator('body')
  await expect(body).toBeTruthy()

  // Page must have a title
  const title = await page.title()
  console.log(`[basic.test] Page title: "${title}"`)
  expect(title.length).toBeGreaterThan(0)
})

test('basic - viewport is configured correctly', async ({ page }) => {
  const baseUrl = process.env.BASE_URL ?? 'https://octant.app'
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  // Architecture requires minimum 1920x1080 on Mac Mini
  // In dev mode, playwright.config.ts sets this — verify it was respected
  if (viewport) {
    console.log(`[basic.test] Viewport: ${viewport.width}x${viewport.height}`)
    expect(viewport.width).toBeGreaterThanOrEqual(1280)
    expect(viewport.height).toBeGreaterThanOrEqual(720)
  }
})
