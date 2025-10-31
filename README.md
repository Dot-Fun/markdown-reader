# dotfun Markdown Studio

This project hosts the dotfun-branded markdown editor showcased at `dotfun.co/tools/markdown-studio`.  
It’s a static web app composed of three files:

- `index.html` – Markup and DOM structure.
- `styles.css` – Dotfun-themed styling, including dark-mode tokens and component rules.
- `app.js` – Client-side logic (markdown parsing, live preview, copy/export hooks, footnotes, etc.).

No build tooling is required; open `index.html` in a browser to run the experience.

---

## Key Behaviours & Where to Edit

| Capability | Implementation | Notes |
| --- | --- | --- |
| Markdown parsing + sanitisation | `app.js` (`marked`, `DOMPurify`) | Configured for GFM (GitHub-Flavored Markdown). |
| Syntax highlighting | `app.js` `highlight.js` + CSS tokens | Theme toggles between light/dark via CSS variables. |
| Task list sync | `extractTaskItems`, `toggleTaskItem`, `preview` `change` listener | Clicking a checkbox in the preview rewrites the editor markdown so source and preview stay aligned. |
| Footnotes | `preprocessFootnotes`, `renderFootnoteSection` | Renders references and keeps the ↩︎ link inline with content. |
| Copy actions | `btnCopyHtml` + `btnCopyDocs` handlers | Copy HTML appends an attribution footer. Copy for Docs clones the preview, injects inline styles + attribution, writes HTML and plaintext to the clipboard. |
| Bookmark toast | Styles in `styles.css` (`.bookmark-callout`)* + toast timers in `app.js` | Toast reveals after 60s, explains keyboard shortcuts, and respects dismiss state via localStorage. |
| Preview settings modal | `.settings__sheet`, `.settings__content`, `settingsPreview` helpers | Modal now mirrors live preview tokens and has its own scroll container; close button is positioned outside scroll area. |
| Dotfun feature list | `index.html` (`.app__features`) | SEO-oriented content block after the footer. |

> \*The toast itself is injected and controlled by `app.js` (search for `"bookmarkCallout"` in the script).

---

## Styling Guidance

- The entire theme is tokenised via CSS custom properties (`styles.css` top section). Update palette values there for global changes. Preview variables are also written onto `.settings` to keep the sandbox snippet in sync.
- Only add new hard-coded colours if they represent new brand tokens—otherwise derive using the existing vars.
- Components use BEM-like naming (`bookmark-callout__text`). Keep new rules consistent.
- Dark-mode overrides should target `:is(.app[data-theme='dark'], body[data-theme='dark'])` so components rendered outside the root container pick up the palette. Midnight code theme now uses `--preview-code-block-text` for legibility in the settings sandbox and exports.
- Bookmark callout accent colours derive from existing tokens; the dark theme now reads `--text` from the shared token, so prefer overriding the variable instead of hard-coding colour values.

### Implementation Notes (Oct 2025)

- `setTheme` in `app.js` mirrors the active theme onto both `.app` and `body` via `dataset.theme`. This ensures sibling UI (e.g., the bookmark callout appended after the app container) inherits the correct dark-mode token set. When adding new theme-aware elements outside `.app`, rely on the shared CSS variables instead of duplicating colour declarations.
- The bookmark toast (`.bookmark-callout`) uses `--text`/`--accent` tokens for all states. Dark-mode overrides simply adjust the underlying custom property, keeping light/dark parity without duplicating component rules.
- The bookmark toast intentionally waits 60 seconds before revealing. Update `BOOKMARK_TOAST_DELAY` in `app.js` alongside the timing assertion in `tests/integration/bookmark-toast.test.cjs` if you need a different cadence.
- Settings dropdowns (`.settings__field select`) keep the iOS-style double-linear-gradient caret. The background position is centered vertically, and the dark-theme override swaps in a warm neutral surface (`rgba(41, 29, 18, 0.92)`) with subtle border contrast. When adjusting form controls, tweak the token-driven background first, then the gradients for the caret if alignment shifts.
- Range sliders and other inputs reuse the same accent variables; favour adjusting the tokens near the top of `styles.css` to propagate changes across the modal rather than editing individual component colours.
- Local storage access is wrapped by `safeStorage`, `storageGet`, and `storageSet`. When persisting new data, use those helpers so SSR/tests can stub storage gracefully without repeating try/catch boilerplate.
- Preview theme tokens now map through `PREVIEW_TOKEN_VAR_MAP` + `applyPreviewTokenVars`. Extend the map instead of adding new `setPreviewVar` calls when introducing additional CSS custom properties.

---

## JavaScript Structure

1. **Configuration / Constants** – storage keys, sample document, helper for export attribution, `safeStorage` utilities.
2. **Markdown Helpers** – footnote extraction, footnote rendering, task discovery.
3. **Preview Pipeline** – `updatePreview`, `updateStats`, highlight + code badge decorators, preview token computation.
4. **Clipboard & Export** – `copyPreviewForDocs`, `buildExportAttribution`, `flashMessage`.
5. **Event Wiring** – editor input, toolbar buttons, clipboard actions, drag & drop, theme persistence.

The script is deliberately vanilla (no frameworks). If you add new functionality, keep it modular with clear helper functions.

---

## How to Extend

- **New Markdown Samples** – adjust `sampleDoc` in `app.js`.
- **New toolbar actions** – add markup to `index.html`, style in `styles.css`, wire listeners in `app.js`.
- **Additional markdown features** – configure `marked` or post-process parsed HTML in `updatePreview`.
- **Exports** – tweak `buildExportAttribution` or inline styles in the copy handler if target platforms (Docs, Notion, etc.) change.

---

## Testing & Verification

Manual checklist when editing core behaviour:

1. Load `index.html` in a browser.
2. Toggle themes – ensure UI + toast + code blocks use correct palette.
3. Use “Demo” to rehydrate sample markdown.
4. Toggle checkboxes in both editor and preview – confirm they stay in sync.
5. Trigger Copy HTML / Copy for Docs – paste into an HTML-aware editor and Google Docs to verify attribution + formatting.
6. Resize viewport under 960px to confirm responsive layout.

### Automated Regressions

- Prerequisites: Node.js 18+ and `npm install` from the project root.
- Run `npm test` to execute every unit + integration suite under `tests/` via the Node test runner.
  - The command enables Node’s experimental coverage flag, so a summary table prints at the end and raw data lands in the `coverage/` directory (handy for CI or IDE tooling).
  - DOM-heavy integration suites live in `tests/integration/`, powered by a jsdom harness (`tests/helpers/create-app-env.cjs`) that loads the real `app.js`.
  - Focused unit specs sit in `tests/unit/` and assert colour utilities, footnote parsing, stats helpers, and preview setting clamps.
- When triaging a failure, re-run an individual file with `node --test --experimental-test-coverage path/to/test.cjs` to keep the coverage report intact.

Coverage highlights:
- Verifies theme tokens still land on both `.app` and `body`, and that the bookmark toast inherits the shared palette.
- Guards the settings modal caret alignment, range inputs, and code-theme overrides across light/dark modes.
- Exercises the full markdown pipeline, ensuring sanitisation, code highlighting, and task-list syncing stay in lockstep.
- Confirms export payloads carry inline CSS, attribution, and rich clipboard fallbacks.

Whenever you add features, ship corresponding coverage:
- Integration specs in `tests/integration/` should prove the end-to-end behaviour against the real `app.js` via `createAppEnv`.
- Unit specs in `tests/unit/` should lock down new helpers or utilities you introduce.
- Update the README and test harness when you add new DOM affordances so the next agent—or your future self—can trace how to exercise them.

---

## Minification Workflow

- `index.html` now sources the minified bundles (`app.min.js`, `styles.min.css`). The original `app.js`/`styles.css` stay readable for development and testing.
- Regenerate the bundles with `bun build app.js --minify --outfile app.min.js` and `bun build styles.css --minify --outfile styles.min.css`. Bun ships with this repo’s toolchain; install it via `curl https://bun.sh/install` if it is not already available.
- Keep `app.js` and `styles.css` as the single sources of truth. After edits, rebuild the minified outputs and commit both files so the static site keeps working without a build step.

## Notes for Future Automation

- Consider adding unit tests around helpers (e.g., task parsing, footnotes) with a minimal Jest setup if complexity grows.
