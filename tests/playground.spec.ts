import { test, expect } from '@playwright/test';
import { PlaygroundPage } from '../pages/PlaygroundPage';

/**
 * The program list is fetched at runtime from the unauthenticated GitHub API,
 * which is rate limited to 60 requests per hour per IP. When a CI runner or a
 * shared office IP is over that limit the site degrades to "GitHub unreachable".
 *
 * That is a real fragility (FINDINGS.md #2) but it is not a regression, so
 * these specs skip rather than fail — and a dedicated test below asserts the
 * degradation itself stays graceful.
 */
async function requireProgramList(playground: PlaygroundPage) {
  const available = await playground.isListAvailable();
  test.skip(
    !available,
    'GitHub API unreachable (likely rate limited) — program list unavailable',
  );
}

test.describe('Python playground — graceful degradation', () => {
  test('when GitHub is unreachable the page says so instead of sitting empty', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();

    if (await playground.isListAvailable()) {
      // Happy path: the list loaded, so the fallback must NOT be on screen.
      await expect(playground.githubUnreachable).toBeHidden();
      expect(await playground.advertisedCount()).toBeGreaterThan(0);
    } else {
      // Degraded path: the user gets a message, the counter shows "--",
      // and the editor stays usable for hand-written code.
      await expect(playground.githubUnreachable).toBeVisible();
      await expect(playground.programCount).toHaveText('--');
      await expect(playground.editor).toBeEditable();
      await expect(playground.runButton).toBeEnabled();
    }
  });
});

test.describe('Python playground — program list', () => {
  test('the counter matches the number of programs rendered', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await playground.expectLoaded();
    await requireProgramList(playground);

    const advertised = await playground.advertisedCount();
    const rendered = await playground.visibleProgramCount();

    expect(advertised).toBeGreaterThan(0);
    expect(rendered).toBe(advertised);
  });

  test('every program is a .py file', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    const names = await playground.programButtons.allInnerTexts();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      expect(name.trim()).toMatch(/\.py$/);
    }
  });

  test('search narrows the list', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    const before = await playground.visibleProgramCount();
    await playground.search('loop');
    const after = await playground.visibleProgramCount();

    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);

    const names = await playground.programButtons.allInnerTexts();
    for (const name of names) {
      expect(name.toLowerCase()).toContain('loop');
    }
  });

  test('clearing the search restores the full list', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    const before = await playground.visibleProgramCount();
    await playground.search('loop');
    await playground.clearSearch();
    const after = await playground.visibleProgramCount();

    expect(after).toBe(before);
  });

  test('a search with no matches reports it instead of failing silently', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    await playground.search('zzzz-no-such-program-zzzz');

    expect(await playground.visibleProgramCount()).toBe(0);
    await expect(playground.noResult).toBeVisible();
  });

  test('search is case insensitive', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    await playground.search('LOOP');
    const upper = await playground.visibleProgramCount();

    await playground.clearSearch();
    await playground.search('loop');
    const lower = await playground.visibleProgramCount();

    expect(upper).toBe(lower);
    expect(upper).toBeGreaterThan(0);
  });
});

test.describe('Python playground — editor and runner', () => {
  test('selecting a program loads its source into the editor', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    await playground.search('calculator');
    await playground.programButtons.first().click();

    const code = await playground.editorContent();
    expect(code.length).toBeGreaterThan(10);
  });

  test('selecting a program points the GitHub link at that file', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();
    await requireProgramList(playground);

    await playground.search('calculator');
    const name = (await playground.programButtons.first().innerText()).trim();
    await playground.programButtons.first().click();

    const href = await playground.githubFileLink.getAttribute('href');
    expect(href).toContain('github.com/Zeeviiii');
    expect(href).toContain(name);
  });

  test('the editor is writable', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.goto();

    await playground.setEditorContent('print("hello from the suite")');
    expect(await playground.editorContent()).toBe('print("hello from the suite")');
  });

  /**
   * The heart of the site: Pyodide runs CPython in WebAssembly, in the browser,
   * with no server. This is the slowest test in the suite because the first run
   * downloads the runtime.
   */
  test('Pyodide executes code and prints the result', async ({ page }) => {
    test.slow();

    const playground = new PlaygroundPage(page);
    await playground.goto();

    await playground.setEditorContent('print(6 * 7)');
    const output = await playground.run();

    expect(output).toContain('42');
  });

  test('a Python error surfaces in the output instead of breaking the page', async ({ page }) => {
    test.slow();

    const playground = new PlaygroundPage(page);
    await playground.goto();

    await playground.setEditorContent('print(1 / 0)');
    const output = await playground.run();

    expect(output).toMatch(/ZeroDivisionError|Traceback|division by zero/i);
    // The page itself must still be usable afterwards.
    await expect(playground.runButton).toBeEnabled();
  });
});
