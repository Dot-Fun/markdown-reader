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
| Bookmark toast | Styles in `styles.css` (`.bookmark-callout`)* | Dark mode text override lives near the toast rules. |
| Dotfun feature list | `index.html` (`.app__features`) | SEO-oriented content block after the footer. |

> \*The toast itself is injected by `app.js` (search for `"Drop markdown file to import"` and `bookmark-callout` in the script).

---

## Styling Guidance

- The entire theme is tokenised via CSS custom properties (`styles.css` top section). Update palette values there for global changes.
- Only add new hard-coded colours if they represent new brand tokens—otherwise derive using the existing vars.
- Components use BEM-like naming (`bookmark-callout__text`). Keep new rules consistent.
- Dark-mode overrides should be scoped under `.app[data-theme='dark']`.

---

## JavaScript Structure

1. **Configuration / Constants** – storage keys, sample document, helper for export attribution.
2. **Markdown Helpers** – footnote extraction, footnote rendering, task discovery.
3. **Preview Pipeline** – `updatePreview`, `updateStats`, highlight + code badge decorators.
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

---

## Notes for Future Automation

- If you need bundling/minification again, add a lightweight npm script (e.g., `esbuild` or `terser`) but keep committed output in `app.js` / `styles.css` for readability.
- Consider adding unit tests around helpers (e.g., task parsing, footnotes) with a minimal Jest setup if complexity grows.
