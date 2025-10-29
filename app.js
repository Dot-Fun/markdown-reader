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

const STORAGE_KEYS = {
  THEME: 'markdown-atelier-theme',
  CONTENT: 'markdown-atelier-content',
};

const sampleDoc = `# Markdown Atelier

Craft beautifully legible notes with **Markdown Atelier**, a light, typographically rich companion for focused writing.

## Why you'll enjoy it

- Crisp, spacious typography powered by _Inter_ with \`IBM Plex Mono\` for code
- Real-time preview with automatic syntax highlighting
- Handy actions for importing, exporting, or copying your work
- Thoughtful light & dark themes that honor your system preference

> “Typography is the craft of endowing human language with a durable visual form.” — Robert Bringhurst

### Sample code

\`\`\`js
function titleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
\`\`\`

### Tables too

| Task              | Status    | Notes               |
| ----------------- | --------- | ------------------- |
| Draft copy        | Complete  | Feels confident     |
| Polish typography | In review | Consider larger type|
| Publish changelog | Pending   | Waiting on review   |

Happy writing!`;

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

function updatePreview(markdown) {
  const html = DOMPurify.sanitize(marked.parse(markdown));
  preview.innerHTML = html;
  preview.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
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
  const codeBlockBg = getVar('--code-block-bg', '#eef2ff');
  const codeBlockBorder = getVar('--code-block-border', 'rgba(39, 94, 254, 0.16)');
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
    code { font-family: ${fontMono}; background: ${codeInlineBg}; padding: 0.2em 0.4em; border-radius: 6px; }
    pre { background: ${codeBlockBg}; border: 1px solid ${codeBlockBorder}; border-radius: 16px; padding: 1.5rem; overflow-x: auto; font-family: ${fontMono}; font-size: 0.95rem; line-height: 1.6; }
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
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid ${tableBorder}; border-radius: 16px; overflow: hidden; background: ${backgroundColor}; }
    thead { background: ${tableHeaderBg}; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.04em; }
    th, td { padding: 0.75rem 1rem; border-right: 1px solid ${tableBorder}; border-bottom: 1px solid ${tableBorder}; text-align: left; }
    th:last-child, td:last-child { border-right: none; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: ${tableRowEven}; }
    caption { color: ${mutedColor}; font-size: 0.85rem; caption-side: bottom; padding-top: 0.75rem; }
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
  persistContent(value);
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
  link.download = `markdown-atelier-${timestamp}.md`;
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
