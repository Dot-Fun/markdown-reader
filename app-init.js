// Bootstrap wiring for dotfun Markdown Studio. See app-core.js for core logic.

loadPreviewSettings();
hydrateTheme();
applyPreviewSettings(previewSettings);
hydrateEditor();
initializeSettingsUI();

editor.addEventListener('input', (event) => {
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

fileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = String(e.target.result);
    editor.value = content;
    editor.dispatchEvent(new Event('input'));
  };
  reader.readAsText(file);
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
    await copyPreviewHtml();
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

preview.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
    return;
  }
  const index = Number(target.dataset.taskIndex ?? '-1');
  if (Number.isNaN(index) || index < 0) return;
  toggleTaskItem(index, target.checked);
});

const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemTheme = (event) => {
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

['dragenter', 'dragover'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    if (!event.dataTransfer) return;
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      event.preventDefault();
      appRoot.classList.add('is-dragging');
    }
  });
});

['dragleave', 'drop', 'dragend'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    if (event.type === 'drop') {
      event.preventDefault();
      handleDrop(event);
    }
    appRoot.classList.remove('is-dragging');
  });
});

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

if (dismissBookmark) {
  dismissBookmark.addEventListener('click', hideBookmarkToast);
}

showBookmarkToast();
