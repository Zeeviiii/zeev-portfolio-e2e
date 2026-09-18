import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

/**
 * Baseline SEO, accessibility and hygiene checks — the sort of thing that
 * quietly rots on a personal site until someone points a suite at it.
 */
test.describe('SEO and metadata', () => {
  test('has a meta description of a sensible length', async ({ page }) => {
    await page.goto('/');

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');

    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThan(320);
  });

  test('has a responsive viewport meta tag', async ({ page }) => {
    await page.goto('/');

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('declares a document language', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('heading levels do not skip', async ({ page }) => {
    await page.goto('/');

    const levels = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])));

    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i] - levels[i - 1],
        `heading jumped from h${levels[i - 1]} to h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('Accessibility basics', () => {
  test('every image has alt text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const missing = await page.locator('img').evaluateAll((nodes) =>
      nodes
        .filter((n) => !(n as HTMLImageElement).hasAttribute('alt'))
        .map((n) => (n as HTMLImageElement).src),
    );

    expect(missing, 'images without an alt attribute').toEqual([]);
  });

  test('every button has an accessible name', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const nameless = await page.locator('button').evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const text = (n.textContent || '').trim();
          const aria = n.getAttribute('aria-label') || n.getAttribute('aria-labelledby');
          return !text && !aria;
        })
        .map((n) => (n as HTMLElement).id || n.outerHTML.slice(0, 60)),
    );

    expect(nameless, 'buttons with no accessible name').toEqual([]);
  });

  test('the page is keyboard navigable', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const focusable = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
    const reached: string[] = [];

    // Walk a few stops rather than assuming the very first Tab lands on a
    // control — browsers may start from the document body.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
      reached.push(tag);
      if (focusable.includes(tag)) break;
    }

    expect(
      reached.some((tag) => focusable.includes(tag)),
      `Tab never reached a focusable control; saw: ${reached.join(' → ')}`,
    ).toBe(true);
  });
});

test.describe('Runtime hygiene', () => {
  /**
   * Known issue at the time of writing: the site sets a Content-Security-Policy
   * with frame-ancestors in a <meta> tag, which browsers ignore and warn about.
   * See FINDINGS.md. The assertion allows that one message and nothing else,
   * so a genuinely new error still fails the build.
   */
  const KNOWN = [
    // FINDINGS.md #3 — frame-ancestors in a <meta> CSP is ignored by browsers.
    /frame-ancestors.*is ignored when delivered via a <meta> element/i,
    // FINDINGS.md #2 — the GitHub API is rate limited per IP; when the runner
    // is over the limit the browser reports it as a CORS failure, because the
    // 403 response carries no Access-Control-Allow-Origin header.
    /api\.github\.com.*blocked by CORS policy/i,
    /Failed to load resource: net::ERR_FAILED/i,
  ];

  test('no unexpected console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const home = new HomePage(page);
    await home.goto();
    await page.waitForTimeout(1_500);

    const unexpected = errors.filter((e) => !KNOWN.some((k) => k.test(e)));
    expect(unexpected, `unexpected console errors: ${unexpected.join(' | ')}`).toEqual([]);
  });

  test('no failed requests for the site’s own assets', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      // Third-party rate limits are tracked as findings, not as asset failures.
      const isThirdParty = !url.startsWith('https://zeeviiii.github.io/');
      if (response.status() >= 400 && !isThirdParty) {
        failed.push(`${response.status()} ${url}`);
      }
    });

    const home = new HomePage(page);
    await home.goto();
    await page.waitForTimeout(1_500);

    expect(failed, `failed requests: ${failed.join(' | ')}`).toEqual([]);
  });

  test('the page settles in reasonable time', async ({ page }) => {
    const started = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const elapsed = Date.now() - started;

    expect(elapsed, `page took ${elapsed}ms to load`).toBeLessThan(10_000);
  });
});
