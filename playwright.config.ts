import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the zeeviiii.github.io end-to-end suite.
 *
 * The site under test is a static, public GitHub Pages site, so there is no
 * webServer block here — tests run against the deployed URL. Override it with
 * BASE_URL when testing a branch preview or a local copy.
 */
export default defineConfig({
  testDir: './tests',

  // Fail the build on CI if a test.only was committed by accident.
  forbidOnly: !!process.env.CI,

  // The site is static; flakiness is almost always the network, so retry on CI only.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  // Pyodide downloads a few MB on first run, so the playground specs need room.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://zeeviiii.github.io',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
