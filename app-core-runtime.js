const dotfunNamespace = (globalThis.dotfunMarkdown = globalThis.dotfunMarkdown || {});

function requireDotfunDependency(key, expectedType) {
  const value = dotfunNamespace[key];
  if (value === undefined || value === null) {
    throw new Error(
      `dotfun Markdown Studio: missing dependency "${key}". Ensure scripts execute in order.`
    );
  }
  if (expectedType === 'function' && typeof value !== 'function') {
    throw new Error(
      `dotfun Markdown Studio: dependency "${key}" is not callable as expected (${typeof value}).`
    );
  }
  return value;
}

function getPreviewSettings() {
  return dotfunNamespace.previewSettings;
}

function getCurrentTaskItems() {
  const tasks = dotfunNamespace.currentTaskItems;
  return Array.isArray(tasks) ? tasks : [];
}

function setCurrentTaskItems(items) {
  dotfunNamespace.currentTaskItems = Array.isArray(items) ? items : [];
}

function setPreviewSyncing(state) {
  dotfunNamespace.isPreviewSyncing = Boolean(state);
}

const appRoot = requireDotfunDependency('appRoot');
const editor = requireDotfunDependency('editor');
const preview = requireDotfunDependency('preview');
const stats = requireDotfunDependency('stats');
const themeIndicator = requireDotfunDependency('themeIndicator');
const markSettingsPreviewDirty = requireDotfunDependency('markSettingsPreviewDirty', 'function');
const applyPreviewSettings = requireDotfunDependency('applyPreviewSettings', 'function');
const computePreviewTokens = requireDotfunDependency('computePreviewTokens', 'function');
const getPreviewTokens = requireDotfunDependency('getPreviewTokens', 'function');
const buildExportAttribution = requireDotfunDependency('buildExportAttribution', 'function');
const generateExportCss = requireDotfunDependency('generateExportCss', 'function');
const STORAGE_KEYS = requireDotfunDependency('STORAGE_KEYS');
const sampleDoc = requireDotfunDependency('sampleDoc');
const hljsThemeLight = dotfunNamespace.hljsThemeLight || null;
const hljsThemeDark = dotfunNamespace.hljsThemeDark || null;

function generateExportPayload(target = 'fragment') {
  const tokens = getPreviewTokens() || computePreviewTokens(getPreviewSettings());
  if (!tokens) {
    return {
      htmlFragment: preview.innerHTML,
      docHtml: preview.innerHTML,
      plainText: preview.textContent || '',
      tokens: null,
    };
  }

  const clone = preview.cloneNode(true);
  clone.removeAttribute('id');
  const container = document.createElement('section');
  container.className = 'dotfun-markdown';
  container.dataset.theme = appRoot.dataset.theme || 'light';
  container.innerHTML = clone.innerHTML;

  const attribution = buildExportAttribution({
    textColor: tokens.muted,
    borderColor: tokens.tableBorder,
    accentColor: tokens.accent,
  });
  container.insertAdjacentHTML('beforeend', attribution);

  const css = generateExportCss(tokens, target);
  const htmlFragment = `<style>${css}</style>${container.outerHTML}`;
  const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${container.outerHTML}</body></html>`;
  const plainText = container.textContent || '';

  return {
    tokens,
    css,
    htmlFragment,
    docHtml,
    plainText,
  };
}

async function copyPreviewHtml() {
  const payload = generateExportPayload('fragment');
  await navigator.clipboard.writeText(payload.htmlFragment);
}

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
    .map((note) => {
      const container = document.createElement('div');
      container.innerHTML = marked.parse(note.content).trim();
      const paragraphs = container.querySelectorAll('p');
      const anchorHtml = ` <a href="#fnref-${note.id}" class="footnote-backref" aria-label="Back to content">↩︎</a>`;
      if (paragraphs.length) {
        const lastParagraph = paragraphs[paragraphs.length - 1];
        lastParagraph.insertAdjacentHTML('beforeend', anchorHtml);
      } else {
        container.insertAdjacentHTML('beforeend', `<p>${anchorHtml.trim()}</p>`);
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
  const tasks = getCurrentTaskItems();
  checkboxes.forEach((checkbox, index) => {
    const task = tasks[index];
    checkbox.removeAttribute('disabled');
    if (!task) return;
    checkbox.dataset.taskIndex = String(index);
    checkbox.checked = task.checked;
  });
}

function updatePreview(markdown) {
  const tasks = extractTaskItems(markdown);
  setCurrentTaskItems(tasks);
  const { markdown: processedMarkdown, footnotes } = preprocessFootnotes(markdown);
  const mainHtml = marked.parse(processedMarkdown);
  const footnoteHtml = renderFootnoteSection(footnotes);
  const sanitized = DOMPurify.sanitize(mainHtml + footnoteHtml);
  preview.innerHTML = sanitized;
  updateTaskCheckboxStates();
  preview.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
    decorateCodeBlock(block);
  });
  markSettingsPreviewDirty();
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
  document.body.dataset.theme = theme;
  themeIndicator.textContent = theme === 'dark' ? 'Dark' : 'Light';
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference:', error);
  }
  applyPreviewSettings(getPreviewSettings());
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
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function decorateCodeBlock(block) {
  const pre = block.closest('pre');
  if (!pre) return;
  const languageClass = Array.from(block.classList).find((cls) => cls.startsWith('language-'));
  const detected =
    languageClass ||
    block.getAttribute('data-language') ||
    (block.result && block.result.language && `language-${block.result.language}`);
  const label = formatLanguageLabel(detected);
  pre.dataset.lang = label;
}

function toggleTaskItem(index, checked) {
  const task = getCurrentTaskItems()[index];
  if (!task) return;
  const original = editor.value;
  const before = original.slice(0, task.start);
  const after = original.slice(task.end);
  const updatedLine = task.text.replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
  const nextValue = before + updatedLine + after;
  const cursorStart = editor.selectionStart;
  const cursorEnd = editor.selectionEnd;
  setPreviewSyncing(true);
  editor.value = nextValue;
  editor.setSelectionRange(cursorStart, cursorEnd);
  editor.dispatchEvent(new Event('input'));
  setPreviewSyncing(false);
}

async function copyPreviewForDocs() {
  const payload = generateExportPayload('document');
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    const htmlBlob = new Blob([payload.docHtml], { type: 'text/html' });
    const textBlob = new Blob([payload.plainText], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(payload.plainText);
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

function flashMessage(target, message) {
  const original = target.textContent;
  target.textContent = message;
  target.classList.add('is-active');
  setTimeout(() => {
    target.textContent = original;
    target.classList.remove('is-active');
  }, 1400);
}

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files).filter((file) =>
    /\.(md|markdown|txt)$/i.test(file.name)
  );
  if (!files.length) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = String(e.target.result);
    editor.value = content;
    editor.dispatchEvent(new Event('input'));
  };
  reader.readAsText(files[0]);
}

// Bookmark toast notification
const bookmarkCallout = document.getElementById('bookmark-callout');
const dismissBookmark = document.getElementById('dismiss-bookmark');

// Timer in milliseconds (60000 = 1 minute)
const BOOKMARK_TOAST_DELAY = 0;

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

Object.assign(dotfunNamespace, {
  generateExportPayload,
  copyPreviewHtml,
  extractFootnotes,
  preprocessFootnotes,
  renderFootnoteSection,
  extractTaskItems,
  updateTaskCheckboxStates,
  updatePreview,
  updateStats,
  persistContent,
  hydrateEditor,
  setTheme,
  toggleTaskItem,
  copyPreviewForDocs,
  hydrateTheme,
  flashMessage,
  handleDrop,
  showBookmarkToast,
  hideBookmarkToast,
  decorateCodeBlock,
});

dotfunNamespace.dismissBookmark = dismissBookmark;
dotfunNamespace.bookmarkCallout = bookmarkCallout;
dotfunNamespace.runtimeReady = true;
if (typeof dotfunNamespace._notifyReady === 'function') {
  dotfunNamespace._notifyReady();
}
