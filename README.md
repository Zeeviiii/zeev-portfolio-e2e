# zeev-portfolio-e2e

[![Playwright Tests](https://github.com/Zeeviiii/zeev-portfolio-e2e/actions/workflows/playwright.yml/badge.svg)](https://github.com/Zeeviiii/zeev-portfolio-e2e/actions/workflows/playwright.yml)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

End-to-end test suite for **[ZeevTapoohi.com](https://zeevtapoohi.com)** —
a bilingual portfolio that runs Python in the browser through Pyodide.

46 tests across three browsers and a mobile viewport, written with Playwright
and the Page Object Model, running on every push and nightly against the live
site. The suite found four real issues; they are written up with evidence and
suggested fixes in **[FINDINGS.md](FINDINGS.md)**, and one of them is already fixed.

---

## Why this repository exists

I am moving from 14 years in hospital sterile supply into QA automation. Rather
than list "Playwright" on a CV, I pointed a real suite at a real site and wrote
up what it found — including the parts that were already done well.

The site under test is my own, which means the findings came with the ability to
fix them, and the fixes are proposed here rather than merely reported.

---

## What is covered

| Spec | What it checks |
|---|---|
| `smoke.spec.ts` | Page loads, HTTP 200, the three main regions render, welcome sheet, footer |
| `i18n.spec.ts` | English ⇄ Hebrew toggle: `lang`, `dir`, computed RTL direction, reversibility, button label |
| `playground.spec.ts` | Program list and counter, search filtering, editor loading, **Pyodide execution and Python error handling**, graceful degradation when GitHub is unreachable |
| `contact.spec.ts` | Required fields, email format, browser constraint validation, field labelling, stubbed submission |
| `links.spec.ts` | GitHub / LinkedIn / email targets, `rel="noopener"`, and a real HTTP check for dead links |
| `quality.spec.ts` | Meta description, viewport, single `h1`, heading order, `alt` text, accessible button names, keyboard reach, console errors, failed requests, load time |

### A note on the skips

Eight tests **skip** rather than fail when GitHub's API is rate limited. The
program list is fetched live from the unauthenticated GitHub API (60 requests
per hour, per IP), so a shared CI runner can hit the limit through no fault of
the site.

Skipping keeps the signal honest: a red build means *the site changed*, not
*the runner was unlucky*. The degradation itself is still asserted — see the
`graceful degradation` block, which checks the site shows a message and keeps
the editor usable instead of sitting there empty. This is
[FINDINGS.md #2](FINDINGS.md).

---

## Running it

```bash
npm ci
npx playwright install --with-deps
npm test
```

| Command | What it does |
|---|---|
| `npm test` | The whole suite, all projects |
| `npm run test:desktop` | Chromium desktop only |
| `npm run test:mobile` | iPhone 13 viewport |
| `npm run test:headed` | Watch the browser work |
| `npm run test:ui` | Playwright's interactive UI mode |
| `npm run report` | Open the last HTML report |

Point the suite somewhere else with `BASE_URL`:

```bash
BASE_URL=https://staging.example.com npm test
```

---

## How it is built

```
pages/          Page objects — every selector lives here, never in a spec
  BasePage.ts       shared navigation, welcome-sheet handling, language helpers
  HomePage.ts       header, biography, links, certificates modal
  PlaygroundPage.ts program list, search, editor, Pyodide runner
  ContactPage.ts    contact form, validation helpers, network stubbing
tests/          Specs — behaviour only, no CSS selectors
.github/        CI workflow
FINDINGS.md     What the suite found, with evidence and fixes
```

**Page Object Model.** Specs describe behaviour; page objects own the selectors.
When the site's markup changes, one file changes — not thirty assertions.

**Stable selectors.** The suite targets IDs and accessible roles, never brittle
CSS paths or nth-child chains.

**No real messages sent.** The contact tests exercise the browser's own
constraint validation. The one test that clicks Send intercepts the request
first, so nothing reaches my inbox.

**Three browsers, plus mobile.** Chromium, Firefox and an iPhone 13 viewport, so
layout and behaviour regressions show up on more than one engine.

**Traces on failure.** Retries record a trace, screenshot and video, uploaded as
CI artifacts. Debugging a red build starts with evidence, not a guess.

---

## CI

`.github/workflows/playwright.yml` runs the suite on every push and pull request
to `main`, plus nightly at 04:00 UTC. The nightly run matters because the target
is a live site — an expired link or a broken deploy can turn the build red with
nobody having pushed anything.

Reports upload as artifacts on every run; traces and screenshots upload on
failure.

---

## Tech

TypeScript · Playwright Test · GitHub Actions · Page Object Model

---

<div dir="rtl">

## בעברית

חבילת טסטים אוטומטיים לאתר התיק האישי שלי — אתר דו־לשוני שמריץ Python בדפדפן
באמצעות Pyodide.

46 טסטים על פני שלושה דפדפנים ומסך מובייל, כתובים ב־Playwright עם תבנית
Page Object Model, שרצים בכל דחיפה לריפו ומדי לילה מול האתר החי.

**החבילה מצאה שלושה ליקויים אמיתיים**, שמתועדים עם ראיות והצעות תיקון בקובץ
[FINDINGS.md](FINDINGS.md):

1. חלון הפתיחה נפתח מחדש בכל טעינה — אין שמירה של "כבר ראיתי"
2. רשימת התוכניות נשענת על GitHub API ללא אימות, שמוגבל ל־60 קריאות בשעה לכל
   כתובת IP — מבקר ברשת משותפת עלול לקבל דף ריק
3. הוראת `frame-ancestors` בתוך תגית `<meta>` מתעלמים ממנה הדפדפנים, כלומר
   ההגנה שהיא אמורה לספק לא באמת פועלת

הסיבה שבניתי את זה: אני עובר מ־14 שנה באספקה סטרילית בבית חולים אל אוטומציית
בדיקות. במקום לכתוב "Playwright" בקורות החיים, כיוונתי חבילת טסטים אמיתית לאתר
אמיתי ותיעדתי מה היא מצאה — כולל מה שכבר עבד היטב.

</div>

---

## License

MIT
