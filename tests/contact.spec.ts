import { test, expect } from '@playwright/test';
import { ContactPage } from '../pages/ContactPage';

/**
 * These tests never send a real message. They exercise the browser's own
 * constraint validation, and the one submit test stubs the network first.
 */
test.describe('Contact form validation', () => {
  test.beforeEach(async ({ page }) => {
    const contact = new ContactPage(page);
    await contact.goto();
    await contact.scrollIntoView();
  });

  test('all three fields are required', async ({ page }) => {
    const contact = new ContactPage(page);

    await expect(contact.nameInput).toHaveAttribute('required', '');
    await expect(contact.emailInput).toHaveAttribute('required', '');
    await expect(contact.messageInput).toHaveAttribute('required', '');
  });

  test('an empty form is invalid', async ({ page }) => {
    const contact = new ContactPage(page);
    expect(await contact.isFormValid()).toBe(false);
  });

  test('the email field is a real email input, not a text box', async ({ page }) => {
    const contact = new ContactPage(page);
    await expect(contact.emailInput).toHaveAttribute('type', 'email');
  });

  test('a malformed email keeps the form invalid', async ({ page }) => {
    const contact = new ContactPage(page);

    await contact.fill('Zeev', 'not-an-email', 'Hello there');
    expect(await contact.isFormValid()).toBe(false);

    const message = await contact.validationMessage(contact.emailInput);
    expect(message.length).toBeGreaterThan(0);
  });

  test('a missing message keeps the form invalid', async ({ page }) => {
    const contact = new ContactPage(page);

    await contact.fill('Zeev', 'zeev@example.com', '');
    expect(await contact.isFormValid()).toBe(false);
  });

  test('a fully filled, well formed submission is valid', async ({ page }) => {
    const contact = new ContactPage(page);

    await contact.fill('Zeev Tapoohi', 'zeev@example.com', 'Testing the contact form.');
    expect(await contact.isFormValid()).toBe(true);
  });

  test('submitting with the network stubbed does not break the page', async ({ page }) => {
    const contact = new ContactPage(page);
    await contact.stubSubmission();

    await contact.fill('Suite Robot', 'robot@example.com', 'Automated check — please ignore.');
    await contact.sendButton.click();

    // Whatever the outcome, the form must still be on screen and interactive.
    await expect(contact.form).toBeVisible();
    await expect(contact.sendButton).toBeVisible();
  });

  test('each field has a visible label', async ({ page }) => {
    const contact = new ContactPage(page);

    for (const id of ['cf-name', 'cf-email', 'cf-msg']) {
      const labelled = await page.evaluate((fieldId) => {
        const field = document.getElementById(fieldId);
        if (!field) return false;
        const byFor = document.querySelector(`label[for="${fieldId}"]`);
        const wrapped = field.closest('label');
        const aria = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
        return Boolean(byFor || wrapped || aria);
      }, id);

      expect(labelled, `field #${id} should be labelled`).toBe(true);
    }
  });
});
