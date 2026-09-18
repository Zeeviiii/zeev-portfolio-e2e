import { test, expect, request } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Links', () => {
  test('the GitHub, LinkedIn and email links are present and point somewhere sane', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.githubLink).toHaveAttribute('href', /github\.com\/Zeeviiii/);
    await expect(home.linkedinLink).toHaveAttribute('href', /linkedin\.com\/in\/zeevtapoohi/);
    await expect(home.emailLink).toHaveAttribute('href', /^mailto:.+@.+\..+/);
  });

  test('external links open safely', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const unsafe = await page.locator('a[target="_blank"]').evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const rel = (n as HTMLAnchorElement).rel || '';
          return !rel.includes('noopener');
        })
        .map((n) => (n as HTMLAnchorElement).href),
    );

    expect(unsafe, 'links opening a new tab should carry rel="noopener"').toEqual([]);
  });

  test('no external link is dead', async ({ page }) => {
    test.slow();

    const home = new HomePage(page);
    await home.goto();

    const links = await home.externalLinks();
    expect(links.length).toBeGreaterThan(0);

    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const broken: Array<{ url: string; status: number | string }> = [];

    for (const url of links) {
      try {
        const response = await api.get(url, {
          timeout: 15_000,
          maxRedirects: 5,
          headers: {
            // Some sites reject requests without a browser-ish agent.
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          },
        });

        // 403/429 means "we saw you and said no" — the page exists, so not a broken link.
        if (response.status() >= 400 && ![403, 429, 999].includes(response.status())) {
          broken.push({ url, status: response.status() });
        }
      } catch (error) {
        broken.push({ url, status: String(error).slice(0, 80) });
      }
    }

    await api.dispose();
    expect(broken, `broken links: ${JSON.stringify(broken, null, 2)}`).toEqual([]);
  });
});
