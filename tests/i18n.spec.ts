import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

/**
 * The site ships an English/Hebrew toggle. Hebrew is right-to-left, so the
 * toggle has to flip both the language and the document direction — getting
 * one without the other is the classic bilingual bug.
 */
test.describe('Language switching', () => {
  test('starts in English, left to right', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    expect(await home.currentLanguage()).toBe('en');
    expect(await home.currentDirection()).not.toBe('rtl');
  });

  test('switching to Hebrew sets lang=he and dir=rtl', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.switchLanguage();

    expect(await home.currentLanguage()).toBe('he');
    expect(await home.currentDirection()).toBe('rtl');
  });

  test('computed body direction actually flips to RTL', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.switchLanguage();

    const direction = await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).direction);

    expect(direction).toBe('rtl');
  });

  test('the toggle is reversible', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.switchLanguage();
    expect(await home.currentLanguage()).toBe('he');

    await home.switchLanguage();
    expect(await home.currentLanguage()).toBe('en');
    expect(await home.currentDirection()).not.toBe('rtl');
  });

  test('the button label tells you where you are going', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // In English the button offers Hebrew...
    await expect(home.languageButton).toContainText(/עברית|Hebrew/i);

    await home.switchLanguage();

    // ...and in Hebrew it offers English back.
    await expect(home.languageButton).toContainText(/English|אנגלית/i);
  });

  test('Hebrew mode keeps the playground usable', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.switchLanguage();

    await expect(page.locator('#fileSearch')).toBeVisible();
    await expect(page.locator('#code')).toBeVisible();
    await expect(page.locator('#run')).toBeEnabled();
  });
});
