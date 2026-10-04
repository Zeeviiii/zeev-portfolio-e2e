import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The contact section. Note that the suite never actually submits a real
 * message — every test either checks client-side validation or stubs the
 * submission, so Zeev's inbox stays clean.
 */
export class ContactPage extends BasePage {
  readonly section: Locator;
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly status: Locator;
  readonly whatsappButton: Locator;

  constructor(page: Page) {
    super(page);

    this.section = page.locator('#contact');
    this.form = page.locator('#contactForm');
    this.nameInput = page.locator('#cf-name');
    this.emailInput = page.locator('#cf-email');
    this.messageInput = page.locator('#cf-msg');
    this.sendButton = page.locator('#cf-send');
    this.status = page.locator('#cf-status');
    this.whatsappButton = page.locator('#waBtn2');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.messageInput).toBeVisible();
  }

  async scrollIntoView(): Promise<void> {
    await this.section.scrollIntoViewIfNeeded();
  }

  async fill(name: string, email: string, message: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.messageInput.fill(message);
  }

  /** True when the browser's own constraint validation passes. */
  async isFormValid(): Promise<boolean> {
    return this.form.evaluate((f) => (f as HTMLFormElement).checkValidity());
  }

  /** The browser's validation message for a given field. */
  async validationMessage(field: Locator): Promise<string> {
    return field.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  /**
   * Blocks the outbound request so a submit can be exercised end to end
   * without a message ever leaving the browser.
   */
  async stubSubmission(): Promise<void> {
    await this.page.route('**/*', async (route) => {
      const request = route.request();
      // The contact form posts to Formspree; nothing else is stubbed.
      const isFormPost =
        request.method() === 'POST' && request.url().includes('formspree.io');

      if (isFormPost) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, stubbed: true }),
        });
        return;
      }
      await route.continue();
    });
  }
}
