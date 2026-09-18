import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The in-browser Python playground: the program list, the search box,
 * the code editor and the Pyodide runner.
 */
export class PlaygroundPage extends BasePage {
  readonly programCount: Locator;
  readonly searchBox: Locator;
  readonly fileList: Locator;
  readonly programButtons: Locator;
  readonly noResult: Locator;

  readonly editor: Locator;
  readonly runButton: Locator;
  readonly copyButton: Locator;
  readonly githubFileLink: Locator;
  readonly note: Locator;
  readonly output: Locator;
  readonly cycle: Locator;

  /**
   * The fallback the site renders when the GitHub API call fails.
   * See FINDINGS.md #2 — the program list is fetched live from the
   * unauthenticated GitHub API, which is rate limited per IP.
   */
  readonly githubUnreachable: Locator;

  constructor(page: Page) {
    super(page);

    this.programCount = page.locator('#count');
    this.searchBox = page.locator('#fileSearch');
    this.fileList = page.locator('#files');
    this.programButtons = page.locator('#files button');
    this.noResult = page.locator('#noResult');
    this.githubUnreachable = page.locator('#files').getByText('GitHub unreachable');

    this.editor = page.locator('#code');
    this.runButton = page.locator('#run');
    this.copyButton = page.locator('#copyBtn');
    this.githubFileLink = page.locator('#ghLink');
    this.note = page.locator('#note');
    this.output = page.locator('#output');
    this.cycle = page.locator('#cycle');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.searchBox).toBeVisible();
    await expect(this.editor).toBeVisible();
    await expect(this.runButton).toBeEnabled();
  }

  /**
   * True when the program list actually loaded. False when the site fell back
   * to "GitHub unreachable" — which happens whenever the visitor's IP has hit
   * GitHub's 60-requests-per-hour unauthenticated limit.
   *
   * Specs use this to skip rather than fail, so an upstream rate limit never
   * turns CI red for a defect that is not in the site.
   */
  async isListAvailable(): Promise<boolean> {
    await this.page
      .waitForFunction(
        () => {
          const files = document.getElementById('files');
          return !!files && files.children.length > 0;
        },
        { timeout: 15_000 },
      )
      .catch(() => undefined);

    return !(await this.githubUnreachable.isVisible().catch(() => false));
  }

  /** How many programs the counter claims are available. */
  async advertisedCount(): Promise<number> {
    const text = (await this.programCount.innerText()).trim();
    return Number.parseInt(text, 10);
  }

  /** How many program buttons are actually rendered right now. */
  async visibleProgramCount(): Promise<number> {
    return this.programButtons.count();
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
    // The filter is synchronous, but give the DOM a tick to settle.
    await this.page.waitForTimeout(150);
  }

  async clearSearch(): Promise<void> {
    await this.searchBox.fill('');
    await this.page.waitForTimeout(150);
  }

  async selectProgram(name: string): Promise<void> {
    await this.programButtons.filter({ hasText: name }).first().click();
  }

  async editorContent(): Promise<string> {
    return this.editor.inputValue();
  }

  async setEditorContent(code: string): Promise<void> {
    await this.editor.fill(code);
  }

  /**
   * Runs whatever is in the editor and waits for Pyodide to produce output.
   * The first run in a session downloads the runtime, so the timeout is generous.
   */
  async run(timeout = 45_000): Promise<string> {
    await this.runButton.click();
    await expect(this.output).not.toHaveText(/^\s*(Press Run\.?)?\s*$/i, { timeout });
    return (await this.output.innerText()).trim();
  }
}
