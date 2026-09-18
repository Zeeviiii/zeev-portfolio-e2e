import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour for every page object in the suite.
 *
 * The site shows a one-time welcome sheet on first visit. Every page object
 * inherits dismissWelcome() so no spec has to think about it.
 */
export abstract class BasePage {
  readonly page: Page;

  // Welcome sheet
  readonly welcomeSheet: Locator;
  readonly welcomeAccept: Locator;
  readonly welcomeClose: Locator;

  // Header / global controls
  readonly languageButton: Locator;
  readonly languageLabel: Locator;

  protected constructor(page: Page) {
    this.page = page;

    this.welcomeSheet = page.locator('#welcome');
    this.welcomeAccept = page.locator('#wGo');
    this.welcomeClose = page.locator('#wClose');

    this.languageButton = page.locator('#langBtn');
    this.languageLabel = page.locator('#langLabel');
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.dismissWelcome();
  }

  /**
   * Closes the welcome sheet when it is on screen. Safe to call unconditionally:
   * on repeat visits the sheet never appears and this resolves immediately.
   */
  async dismissWelcome(): Promise<void> {
    if (await this.welcomeAccept.isVisible().catch(() => false)) {
      await this.welcomeAccept.click();
    } else if (await this.welcomeClose.isVisible().catch(() => false)) {
      await this.welcomeClose.click();
    }
    await expect(this.welcomeSheet).toBeHidden({ timeout: 5_000 }).catch(() => {
      /* the sheet is absent entirely on repeat visits */
    });
  }

  /** Reads the current interface language straight off <html lang>. */
  async currentLanguage(): Promise<string | null> {
    return this.page.locator('html').getAttribute('lang');
  }

  /** Reads the current text direction off <html dir>. */
  async currentDirection(): Promise<string | null> {
    return this.page.locator('html').getAttribute('dir');
  }

  async switchLanguage(): Promise<void> {
    await this.languageButton.click();
  }

  /**
   * Collects console errors raised while `action` runs.
   * Used by the diagnostics spec to assert the page stays clean.
   */
  async collectConsoleErrors(action: () => Promise<void>): Promise<string[]> {
    const errors: string[] = [];
    const listener = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') errors.push(msg.text());
    };
    this.page.on('console', listener as never);
    await action();
    this.page.off('console', listener as never);
    return errors;
  }
}
