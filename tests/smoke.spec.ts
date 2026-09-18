import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { PlaygroundPage } from '../pages/PlaygroundPage';
import { ContactPage } from '../pages/ContactPage';

test.describe('Smoke — the page is alive', () => {
  test('loads with the expected title and heading', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.expectLoaded();
  });

  test('responds with HTTP 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('renders all three main regions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const playground = new PlaygroundPage(page);
    const contact = new ContactPage(page);

    await playground.expectLoaded();
    await contact.expectLoaded();
    await expect(home.footer).toBeVisible();
  });

  test('the welcome sheet can be dismissed', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.welcomeSheet).toBeHidden();
  });

  /**
   * FINDINGS.md #1 — the welcome sheet is opened unconditionally on every load
   * (openWelcome() runs at the end of the inline script, with no storage flag),
   * so a returning visitor is greeted by the same modal on every single visit.
   *
   * This test pins the CURRENT behaviour. When the site starts remembering the
   * dismissal, this test fails on purpose — that is the signal to flip it to
   * toBeHidden() and close the finding.
   */
  test('known issue: the welcome sheet returns after a reload', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.welcomeSheet).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(
      home.welcomeSheet,
      'if this fails, the dismissal is now remembered — update FINDINGS.md #1',
    ).toBeVisible();
  });

  test('footer carries the copyright and the privacy statement', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.footer).toContainText('Zeev Tapoohi');
    await expect(home.footer).toContainText(/no cookies|no tracking/i);
  });
});
