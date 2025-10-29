const appRoot = document.querySelector('.app');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const stats = document.getElementById('editor-stats');
const themeIndicator = document.getElementById('theme-indicator');
const btnDemo = document.getElementById('btn-load-demo');
const fileInput = document.getElementById('file-input');
const btnDownload = document.getElementById('btn-download');
const btnCopyHtml = document.getElementById('btn-copy-html');
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

- Crisp, spacious typography pairing \*Source Serif 4\* with _Inter_
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
