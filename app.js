const appRoot = document.querySelector('.app');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const stats = document.getElementById('editor-stats');
const themeIndicator = document.getElementById('theme-indicator');
const btnDemo = document.getElementById('btn-load-demo');
const fileInput = document.getElementById('file-input');
const btnDownload = document.getElementById('btn-download');
const btnCopyHtml = document.getElementById('btn-copy-html');
const btnCopyDocs = document.getElementById('btn-copy-docs');
const btnToggleTheme = document.getElementById('btn-toggle-theme');
const hljsThemeLight = document.getElementById('hljs-theme-light');
const hljsThemeDark = document.getElementById('hljs-theme-dark');

let currentTaskItems = [];
let isPreviewSyncing = false;

const STORAGE_KEYS = {
  THEME: 'dotfun-studio-theme',
  CONTENT: 'dotfun-studio-content',
  BOOKMARK_DISMISSED: 'dotfun-studio-bookmark-dismissed',
};

const sampleDoc = `# dotfun Field Kit

Welcome to the **dotfun markdown studio**, your rapid space for shipping content, creative, and campaign notes in the dotfun house style.

---

## Why dotfun wins

- Human-first, unstoppable support that keeps partners in motion[^human-first]
- Transparent dashes: no smoke, no mirrors, just accountable growth[^transparent]
- We always **run good**, *look good*, and ~~feel average~~ feel good

> “Great marketing is equal parts rigor and play. dotfun keeps both on the table.”
>
> > Nested quotes let you surface creative direction alongside data calls.

## Plays & rituals

1. Run Good — align strategy with measurable revenue lift
2. Look Good — tell the story with thumb-stopping creative
3. Feel Good — nurture teams, founders, and audiences with human energy

- [x] Kickoff brief captured in Notion
- [ ] Post-launch retro scheduled
- Inline autolinks keep collaboration fast: <https://dotfun.co>

## Code snippets & ops

\`\`\`js
const lifecycle = ['Run Good', 'Look Good', 'Feel Good'];

export function dotfunPulse(team) {
  return lifecycle.map(phase => \`\${team} → \${phase}\`);
}
\`\`\`

\`\`\`bash
# Clone the playbook and start locally
git clone https://github.com/dotfunhq/marketing-os.git
cd marketing-os
npm install && npm run dev
\`\`\`

## Palette cheatsheet

| Tone            |   Hex    | Energy                                |
| :-------------- | :------: | ------------------------------------- |
| Run Good Red    | #FF4A2F  | Primary topspin for CTAs + headlines  |
| Neutral Sand    | #F6EEDC  | Background canvas for every story     |
| Accent Ink      | #1C1A15  | High-contrast copy + frames           |
| Highlight Peach | #FFB156  | Warm pops for data points + badges    |

## Media drop

![dotfun collage with gradient lighting](https://dummyimage.com/880x240/120d2e/ffffff&text=dotfun+creative)

---

## Callouts & embeds

<aside>
  <strong>Play nice with partners:</strong> dotfun pairs human energy with automation so every brief ships faster.
</aside>

Footnotes live here:

[^human-first]: dotfun leads with “Human-first, unstoppable support” across its service model.
[^transparent]: dotfun promises “No smoke. No mirrors. Just performance marketing that works.”`;

// Configure marked for GitHub-flavored markdown and code highlighting
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

function extractFootnotes(source) {
  const lines = source.split(/\r?\n/);
  const bodyLines = [];
  const footnotes = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^\[\^([^\]]+)\]:\s?(.*)$/);
    if (match) {
      const id = match[1];
      let content = match[2] || '';
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];

        if (/^( {2,}|\t)/.test(nextLine)) {
          content += '\n' + nextLine.replace(/^(?: {2,4}|\t)/, '');
          index += 1;
          continue;
        }

        if (nextLine.trim() === '') {
          const lookahead = lines[index + 1];
          if (lookahead && /^( {2,}|\t)/.test(lookahead)) {
            content += '\n';
            index += 1;
            continue;
          }
          index += 1;
        }

        break;
      }

      footnotes.push({ id, content: content.trim() });
      continue;
    }

    bodyLines.push(line);
    index += 1;
  }

  if (!footnotes.length) {
    return { body: source, footnotes: [] };
  }

  return { body: bodyLines.join('\n'), footnotes };
}

function preprocessFootnotes(markdown) {
  const { body, footnotes } = extractFootnotes(markdown);
  if (!footnotes.length) {
    return { markdown: markdown, footnotes: [] };
  }

  const ordering = new Map();
  footnotes.forEach((note, idx) => {
    ordering.set(note.id, idx + 1);
  });

  const processed = body.replace(/\[\^([^\]]+)\]/g, (match, id) => {
    const number = ordering.get(id);
    if (!number) return match;
    return `<sup id="fnref-${id}" class="footnote-ref"><a href="#fn-${id}">${number}</a></sup>`;
  });

  return {
    markdown: processed,
    footnotes: footnotes.map((note, idx) => ({
      ...note,
      number: idx + 1,
    })),
  };
}

function renderFootnoteSection(footnotes) {
  if (!footnotes.length) return '';

  const items = footnotes
    .map(note => {
      const container = document.createElement('div');
      container.innerHTML = marked.parse(note.content).trim();
      const paragraphs = container.querySelectorAll('p');
      const anchorHtml = ` <a href="#fnref-${note.id}" class="footnote-backref" aria-label="Back to content">↩︎</a>`;
      if (paragraphs.length) {
        const lastParagraph = paragraphs[paragraphs.length - 1];
        lastParagraph.insertAdjacentHTML('beforeend', anchorHtml);
      } else {
        container.insertAdjacentHTML(
          'beforeend',
          `<p>${anchorHtml.trim()}</p>`
        );
      }
      return `<li id="fn-${note.id}"><div class="footnote-content">${container.innerHTML}</div></li>`;
    })
    .join('');

  return `<section class="footnotes" aria-label="Footnotes"><hr /><ol>${items}</ol></section>`;
}

function extractTaskItems(markdown) {
  const regex = /^(\s*[-*+]\s+|\s*\d+\.\s+)\[( |x|X)\].*$/gm;
  const tasks = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    tasks.push({
      start: match.index,
      end: regex.lastIndex,
      text: match[0],
      checked: match[2].toLowerCase() === 'x',
    });
  }
  return tasks;
}

function updateTaskCheckboxStates() {
  const checkboxes = preview.querySelectorAll('li input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    const task = currentTaskItems[index];
    checkbox.removeAttribute('disabled');
    if (!task) return;
    checkbox.dataset.taskIndex = String(index);
    checkbox.checked = task.checked;
  });
}

function updatePreview(markdown) {
  currentTaskItems = extractTaskItems(markdown);
  const { markdown: processedMarkdown, footnotes } = preprocessFootnotes(markdown);
  const mainHtml = marked.parse(processedMarkdown);
  const footnoteHtml = renderFootnoteSection(footnotes);
  const sanitized = DOMPurify.sanitize(mainHtml + footnoteHtml);
  preview.innerHTML = sanitized;
  updateTaskCheckboxStates();
  preview.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
    decorateCodeBlock(block);
  });
}

function updateStats(markdown) {
  const words = markdown
    .replace(/[`*_#>\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const count = words.length;
  stats.textContent = count === 1 ? '1 word' : `${count} words`;
}

function persistContent(markdown) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTENT, markdown);
  } catch (error) {
    console.warn('Unable to persist markdown content:', error);
  }
}

function hydrateEditor() {
  let initial = sampleDoc;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTENT);
    if (saved) {
      initial = saved;
    }
  } catch (error) {
    console.warn('Unable to read saved markdown:', error);
  }

  editor.value = initial;
  updatePreview(initial);
  updateStats(initial);
}

function setTheme(nextTheme) {
  const theme = nextTheme === 'dark' ? 'dark' : 'light';
  appRoot.dataset.theme = theme;
  themeIndicator.textContent = theme === 'dark' ? 'Dark' : 'Light';
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference:', error);
  }
  toggleHighlightStyles(theme);
}

function toggleHighlightStyles(theme) {
  const isDark = theme === 'dark';
  if (hljsThemeLight) {
    hljsThemeLight.disabled = isDark;
  }
  if (hljsThemeDark) {
    hljsThemeDark.disabled = !isDark;
  }
}

function formatLanguageLabel(lang) {
  if (!lang) return 'Code';
  return lang
    .replace(/language-/i, '')
    .replace(/[\W_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function decorateCodeBlock(block) {
  const pre = block.closest('pre');
  if (!pre) return;
  const languageClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
  const detected =
    languageClass ||
    block.getAttribute('data-language') ||
    (block.result && block.result.language && `language-${block.result.language}`);
  const label = formatLanguageLabel(detected);
  pre.dataset.lang = label;
}

function toggleTaskItem(index, checked) {
  const task = currentTaskItems[index];
  if (!task) return;
  const original = editor.value;
  const before = original.slice(0, task.start);
  const after = original.slice(task.end);
  const updatedLine = task.text.replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
  const nextValue = before + updatedLine + after;
  const cursorStart = editor.selectionStart;
  const cursorEnd = editor.selectionEnd;
  isPreviewSyncing = true;
  editor.value = nextValue;
  editor.setSelectionRange(cursorStart, cursorEnd);
  editor.dispatchEvent(new Event('input'));
  isPreviewSyncing = false;
}

async function copyPreviewForDocs() {
  const computed = getComputedStyle(appRoot);
  const getVar = (name, fallback) => {
    const value = computed.getPropertyValue(name);
    return value ? value.trim() : fallback;
  };

  const clone = preview.cloneNode(true);
  clone.removeAttribute('id');

  const textColor = getVar('--text', '#1f2430');
  const backgroundColor = getVar('--surface', '#ffffff');
  const accentColor = getVar('--accent', '#275efe');
  const accentSoft = getVar('--accent-soft', 'rgba(39, 94, 254, 0.1)');
  const mutedColor = getVar('--muted', 'rgba(31, 36, 48, 0.6)');
  const codeInlineBg = getVar('--code-inline-bg', 'rgba(31, 36, 48, 0.1)');
  const codeInlineColor = getVar('--code-inline-color', '#0c7c3f');
  const codeBlockBg = getVar('--code-block-bg', '#eef2ff');
  const codeBlockBorder = getVar('--code-block-border', 'rgba(39, 94, 254, 0.16)');
  const codeBadgeBg = getVar('--code-badge-bg', 'rgba(39, 94, 254, 0.12)');
  const codeBadgeText = getVar('--code-badge-text', '#1f2430');
  const tableBorder = getVar('--table-border', 'rgba(28, 32, 44, 0.12)');
  const tableHeaderBg = getVar('--table-header-bg', 'rgba(39, 94, 254, 0.12)');
  const tableRowEven = getVar('--table-row-even', 'rgba(39, 94, 254, 0.06)');
  const hlKeyword = getVar('--hljs-keyword', accentColor);
  const hlString = getVar('--hljs-string', '#2ca659');
  const hlNumber = getVar('--hljs-number', '#d97706');
  const hlTitle = getVar('--hljs-title', '#9b4dff');
  const hlComment = getVar('--hljs-comment', mutedColor);

  const fontSans = window.getComputedStyle(document.body).fontFamily || "'Inter', sans-serif";
  const fontMono = "'IBM Plex Mono','SFMono-Regular',Menlo,monospace";

  const style = `
    body { margin: 0; padding: 0; font-family: ${fontSans}; color: ${textColor}; background: ${backgroundColor}; line-height: 1.65; }
    h1, h2, h3, h4, h5, h6 { font-family: ${fontSans}; line-height: 1.2; margin: 2rem 0 1rem; }
p, li { color: ${textColor}; }
    ul, ol { margin: 1.2rem 0 1.2rem 1.6rem; padding-left: 1.2rem; }
    a { color: ${accentColor}; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    blockquote { margin: 1.8rem 0; padding: 1rem 1.5rem; border-left: 4px solid ${accentColor}; background: ${accentSoft}; color: ${textColor}; }
    blockquote p { margin: 0; }
    code { font-family: ${fontMono}; background: ${codeInlineBg}; padding: 0.2em 0.4em; border-radius: 6px; color: ${codeInlineColor}; font-weight: 600; }
    pre { background: ${codeBlockBg}; border: 1px solid ${codeBlockBorder}; border-radius: 16px; padding: 1.5rem; padding-top: 2.6rem; overflow-x: auto; font-family: ${fontMono}; font-size: 0.95rem; line-height: 1.6; position: relative; }
    pre code { background: none; padding: 0; display: block; }
    pre code.hljs { color: ${textColor}; }
    .hljs-comment,
    .hljs-quote { color: ${hlComment}; font-style: italic; }
    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-literal,
    .hljs-section,
    .hljs-link { color: ${hlKeyword}; font-weight: 600; }
    .hljs-string,
    .hljs-template-variable,
    .hljs-addition { color: ${hlString}; }
    .hljs-number,
    .hljs-attr,
    .hljs-attribute,
    .hljs-symbol,
    .hljs-built_in,
    .hljs-bullet { color: ${hlNumber}; }
    .hljs-title,
    .hljs-name,
    .hljs-type,
    .hljs-selector-id,
    .hljs-selector-class,
    .hljs-meta,
    .hljs-doctag,
    .hljs-template-tag { color: ${hlTitle}; }
    pre[data-lang]::before { content: attr(data-lang); position: absolute; top: 0.75rem; right: 1rem; padding: 0.3rem 0.75rem; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 999px; background: ${codeBadgeBg}; color: ${codeBadgeText}; font-family: ${fontSans}; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid ${tableBorder}; border-radius: 16px; overflow: hidden; background: ${backgroundColor}; }
    thead { background: ${tableHeaderBg}; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.04em; }
    th, td { padding: 0.75rem 1rem; border-right: 1px solid ${tableBorder}; border-bottom: 1px solid ${tableBorder}; text-align: left; }
    th:last-child, td:last-child { border-right: none; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: ${tableRowEven}; }
    caption { color: ${mutedColor}; font-size: 0.85rem; caption-side: bottom; padding-top: 0.75rem; }
    .footnote-ref { font-size: 0.75em; vertical-align: super; }
    .footnote-ref a { color: ${accentColor}; text-decoration: none; font-weight: 600; }
    .footnote-ref a:hover { text-decoration: underline; }
    .footnotes { margin-top: 2.5rem; font-size: 0.9rem; color: ${mutedColor}; }
    .footnotes hr { border: none; border-top: 1px solid ${tableBorder}; margin-bottom: 1.5rem; }
    .footnotes ol { margin: 0; padding-left: 1.5rem; }
    .footnotes li { line-height: 1.6; margin-bottom: 0.75rem; }
    .footnote-content p { margin: 0; }
    .footnote-content p:not(:last-child) { margin-bottom: 0.6rem; }
    .footnote-backref { margin-left: 0.3rem; text-decoration: none; font-size: 0.85rem; color: ${accentColor}; display: inline-flex; vertical-align: baseline; }
    .footnote-backref:hover { text-decoration: underline; }
  `;

  const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${clone.innerHTML}</body></html>`;
  const plainText = clone.textContent || '';

  if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
    const htmlBlob = new Blob([docHtml], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);
    return;
  }

  await navigator.clipboard.writeText(plainText);
}

function hydrateTheme() {
  let theme = 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored) {
      theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (error) {
    console.warn('Unable to read stored theme:', error);
  }
  setTheme(theme);
}

editor.addEventListener('input', event => {
  const value = event.target.value;
  updatePreview(value);
  updateStats(value);
  if (!isPreviewSyncing) {
    persistContent(value);
  }
});

btnDemo.addEventListener('click', () => {
  editor.value = sampleDoc;
  editor.dispatchEvent(new Event('input'));
  editor.focus();
});

btnToggleTheme.addEventListener('click', () => {
  const next = appRoot.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
});

fileInput.addEventListener('change', event => {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const content = String(e.target.result);
    editor.value = content;
    editor.dispatchEvent(new Event('input'));
  };
  reader.readAsText(file);
  // Reset input to allow re-importing the same file consecutively
  event.target.value = '';
});

btnDownload.addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = `dotfun-studio-${timestamp}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

btnCopyHtml.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preview.innerHTML);
    flashMessage(btnCopyHtml, 'Copied!');
  } catch (error) {
    console.error('Clipboard copy failed', error);
    flashMessage(btnCopyHtml, 'Copy failed');
  }
});

if (btnCopyDocs) {
  btnCopyDocs.addEventListener('click', async () => {
    try {
      await copyPreviewForDocs();
      flashMessage(btnCopyDocs, 'Copied!');
    } catch (error) {
      console.error('Docs copy failed', error);
      flashMessage(btnCopyDocs, 'Copy failed');
    }
  });
}

preview.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
    return;
  }
  const index = Number(target.dataset.taskIndex ?? '-1');
  if (Number.isNaN(index) || index < 0) return;
  toggleTaskItem(index, target.checked);
});

function flashMessage(target, message) {
  const original = target.textContent;
  target.textContent = message;
  target.classList.add('is-active');
  setTimeout(() => {
    target.textContent = original;
    target.classList.remove('is-active');
  }, 1400);
}

hydrateTheme();
hydrateEditor();

// Respond to OS theme changes dynamically
const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemTheme = event => {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (!stored) {
    setTheme(event.matches ? 'dark' : 'light');
  }
};

if (typeof themeWatcher.addEventListener === 'function') {
  themeWatcher.addEventListener('change', handleSystemTheme);
} else if (typeof themeWatcher.addListener === 'function') {
  themeWatcher.addListener(handleSystemTheme);
}

// Drag & drop support for markdown files
['dragenter', 'dragover'].forEach(eventName => {
  document.addEventListener(eventName, event => {
    if (!event.dataTransfer) return;
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      event.preventDefault();
      appRoot.classList.add('is-dragging');
    }
  });
});

['dragleave', 'drop', 'dragend'].forEach(eventName => {
  document.addEventListener(eventName, event => {
    if (event.type === 'drop') {
      event.preventDefault();
      handleDrop(event);
    }
    appRoot.classList.remove('is-dragging');
  });
});

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files).filter(file =>
    /\.(md|markdown|txt)$/i.test(file.name)
  );
  if (!files.length) return;
  const reader = new FileReader();
  reader.onload = e => {
    const content = String(e.target.result);
    editor.value = content;
    editor.dispatchEvent(new Event('input'));
  };
  reader.readAsText(files[0]);
}

// Provide subtle visual feedback while dragging files
const style = document.createElement('style');
style.textContent = `
  .app.is-dragging::after {
    content: 'Drop markdown file to import';
    position: fixed;
    inset: min(20vh, 120px) 10vw;
    border-radius: 24px;
    background: rgba(39, 94, 254, 0.1);
    border: 2px dashed rgba(39, 94, 254, 0.4);
    color: var(--accent);
    font-family: var(--font-sans);
    font-size: clamp(1.4rem, 3vw, 2rem);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 50;
    box-shadow: 0 20px 40px rgba(39, 94, 254, 0.12);
    backdrop-filter: blur(10px);
  }
`;
document.head.appendChild(style);

// Bookmark toast notification
const bookmarkCallout = document.getElementById('bookmark-callout');
const dismissBookmark = document.getElementById('dismiss-bookmark');

// Timer in milliseconds (60000 = 1 minute)
const BOOKMARK_TOAST_DELAY = 60000;

function showBookmarkToast() {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEYS.BOOKMARK_DISMISSED);
    if (dismissed === 'true') {
      return;
    }
  } catch (error) {
    console.warn('Unable to check bookmark toast state:', error);
  }

  setTimeout(() => {
    if (bookmarkCallout) {
      bookmarkCallout.classList.add('is-visible');
    }
  }, BOOKMARK_TOAST_DELAY);
}

function hideBookmarkToast() {
  if (!bookmarkCallout) return;

  bookmarkCallout.classList.remove('is-visible');

  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARK_DISMISSED, 'true');
  } catch (error) {
    console.warn('Unable to save bookmark toast state:', error);
  }

  setTimeout(() => {
    bookmarkCallout.classList.add('is-hidden');
  }, 400);
}

if (dismissBookmark) {
  dismissBookmark.addEventListener('click', hideBookmarkToast);
}

// Initialize bookmark toast
showBookmarkToast();
