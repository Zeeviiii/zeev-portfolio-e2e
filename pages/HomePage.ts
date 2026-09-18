import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The landing page: header, intro, biography and footer.
 */
export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly intro: Locator;

  // Header actions
  readonly githubLink: Locator;
  readonly linkedinLink: Locator;
  readonly emailLink: Locator;
  readonly certificatesButton: Locator;
  readonly whatsappButton: Locator;
  readonly cvButton: Locator;

  // Modals
  readonly certificatesModal: Locator;
  readonly certificatesClose: Locator;

  readonly footer: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.locator('h1');
    this.intro = page.locator('header p').first();

    this.githubLink = page.locator('a[href*="github.com/Zeeviiii"]').first();
    this.linkedinLink = page.locator('a[href*="linkedin.com/in/zeevtapoohi"]').first();
    this.emailLink = page.locator('a[href^="mailto:"]').first();
    this.certificatesButton = page.locator('#openCerts');
    this.whatsappButton = page.locator('#waBtn');
    this.cvButton = page.locator('#cvBtn');

    this.certificatesModal = page.locator('#certmodal');
    this.certificatesClose = page.locator('#certclose');

    this.footer = page.locator('footer');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Zeev Tapoohi/i);
    await expect(this.heading).toBeVisible();
    await expect(this.heading).toContainText('Zeev Tapoohi');
  }

  async openCertificates(): Promise<void> {
    await this.certificatesButton.click();
    await expect(this.certificatesModal).toBeVisible();
  }

  async closeCertificates(): Promise<void> {
    await this.certificatesClose.click();
    await expect(this.certificatesModal).toBeHidden();
  }

  /** Every external href on the page, deduplicated. */
  async externalLinks(): Promise<string[]> {
    const hrefs = await this.page.locator('a[href^="http"]').evaluateAll(
      (nodes) => nodes.map((n) => (n as HTMLAnchorElement).href),
    );
    return [...new Set(hrefs)];
  }
}
