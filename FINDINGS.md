# Findings

Issues found while building the suite against my portfolio — first at
zeeviiii.github.io, now at [zeevtapoohi.com](https://zeevtapoohi.com) — with the evidence for each and
the test that pins it. Severity is my own judgement.

---

## #1 — The welcome sheet reappears on every visit

**Severity:** Low (UX)
**Status:** Open
**Pinned by:** `tests/smoke.spec.ts` → *known issue: the welcome sheet returns after a reload*

### What happens

The welcome dialog opens on every page load, including for a visitor who has
already read and dismissed it. There is no "don't show this again" and no
stored flag.

### Evidence

The inline script calls `openWelcome()` unconditionally at the end of setup:

```js
function closeWelcome(){ welcome.classList.remove("open"); }
function openWelcome(){ fillWelcome(pickWelcomeLang()); welcome.classList.add("open"); }
wClose.addEventListener("click", closeWelcome);
document.getElementById("wGo").addEventListener("click", closeWelcome);
openWelcome();          // <- runs on every load, no storage check
```

`closeWelcome()` only removes a CSS class. Nothing is written to
`localStorage`, so the next load starts over.

### Suggested fix

```js
const SEEN = "zeev.welcome.seen.v1";

function closeWelcome(){
  welcome.classList.remove("open");
  try { localStorage.setItem(SEEN, "1"); } catch (e) { /* private mode */ }
}

let seen = false;
try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) { /* private mode */ }
if (!seen) openWelcome();
```

The `try/catch` matters: `localStorage` throws in private browsing, and the
modal should still work there rather than taking the page down with it.

### Note

This is a deliberate trade-off, not clearly a bug — a first-time visitor
genuinely benefits from the explanation. The point of the test is that the
behaviour is now *chosen* rather than accidental, and the suite will say so if
it ever changes.

---

## #2 — The program list depends on the unauthenticated GitHub API

**Severity:** Medium (availability)
**Status:** Open
**Pinned by:** `tests/playground.spec.ts` → *graceful degradation* describe block

### What happens

The playground — the centrepiece of the site — fetches its file list at runtime:

```js
const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/`);
```

Unauthenticated GitHub API calls are limited to **60 requests per hour, per IP**.
Any visitor whose IP is over that limit sees `GitHub unreachable` and an empty
program list. Because the limit is per IP rather than per person, one visitor on
a shared network (an office, a campus, a corporate VPN, a mobile carrier NAT)
can exhaust it for everyone behind it.

### Evidence

Reproduced while building this suite. From a shared cloud IP the request failed
and the browser reported:

```
Access to fetch at 'https://api.github.com/repos/Zeeviiii/zeev-python-portfolio/contents/'
from origin 'https://zeeviiii.github.io' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The CORS wording is misleading — GitHub does send CORS headers on success. It is
the **429/403 rate-limit response** that omits them, so the browser reports the
symptom rather than the cause. Worth knowing, because it sends you looking in
entirely the wrong place.

### What already works

The failure is handled gracefully: the counter shows `--`, the list shows
`GitHub unreachable`, and the editor and Run button stay usable. Nothing
crashes. That is good defensive coding and the suite asserts it stays that way.

### Suggested fix

Generate the file list at build time instead of fetching it live — a small
`files.json` committed next to the page, refreshed by a GitHub Action whenever
the portfolio repo changes. Same "add a file, it appears here" workflow, no
runtime dependency, no rate limit, and faster. Keep the live fetch as a
fallback if you like the immediacy.

---

## #3 — `frame-ancestors` in a `<meta>` CSP is ignored

**Severity:** Low (security hardening, cosmetic console noise)
**Status:** Fixed — 4 October 2026
**Pinned by:** `tests/quality.spec.ts` → *Runtime hygiene* (no longer allow-listed, so the warning cannot come back unnoticed)

> **Resolution:** option 1 below. `frame-ancestors` was removed from the `<meta>` CSP,
> and the console is clean on every load. The site has since moved behind Cloudflare,
> so option 2 is now available too if framing protection is ever needed.

### What happens

Every page load logs:

```
The Content Security Policy directive 'frame-ancestors' is ignored
when delivered via a <meta> element.
```

### Evidence

Line 103 of the page:

```html
<meta http-equiv="Content-Security-Policy" content="... frame-ancestors 'none'; ...">
```

`frame-ancestors` is only honoured in an HTTP **response header**. In a `<meta>`
tag browsers ignore it and warn. So the clickjacking protection that directive
was meant to provide is **not actually in effect**.

### Suggested fix

GitHub Pages does not let you set response headers, so there are two options:

1. Drop `frame-ancestors` from the meta tag. It does nothing there, and removing
   it clears the console warning. The rest of the CSP still applies.
2. If framing protection matters, serve the site behind something that can set
   headers (Cloudflare, Netlify) and send
   `Content-Security-Policy: frame-ancestors 'none'` properly.

Option 1 is the honest one for a GitHub Pages site: it stops the page from
claiming a protection it does not have.

---

## #4 — Code typed right after the page opens can be replaced by the first program

**Severity:** Low (only in the first second or two, mostly on slower phones)
**Status:** Open
**Pinned by:** `pages/PlaygroundPage.ts` → `settle()`, used by the editor and runner specs

### What happens

When the page opens, it fetches the program list and then loads the first
program into the editor. If a visitor starts typing (or pastes code) before
that load finishes, their code is silently replaced by the program.

### Evidence

Found on 4 October 2026 by the iPhone 13 viewport project: the runner specs
filled the editor with `print(6 * 7)` and pressed Run, but the output was the
menu of `sterile_department.py`, which had arrived a moment later and
overwritten the editor. On desktop the same specs passed, because the list
loaded before the test typed.

### Suggested fix

Only auto-load the first program while the editor still holds the placeholder
text (`# Choose a program from the list.`). If the visitor has already typed
something, leave it alone.

---

## What was checked and found healthy

| Area | Result |
|---|---|
| HTTP status, title, headings | Pass |
| English ⇄ Hebrew toggle, including `dir="rtl"` | Pass |
| Pyodide executes code and reports Python errors without breaking the page | Pass |
| Contact form constraint validation (required fields, email format) | Pass |
| Form field labelling | Pass |
| External links resolve — no dead links | Pass |
| `rel="noopener"` on new-tab links | Pass |
| Meta description, viewport, single `h1`, no skipped heading levels | Pass |
| Image `alt` text, accessible button names, keyboard reachability | Pass |
| No failed requests for the site's own assets | Pass |
| Page settles well under 10s | Pass |
