const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const marked = require('marked');
const hljs = require('highlight.js');

const ROOT = resolve(__dirname, '..', '..');
const APP_SOURCE = readFileSync(resolve(ROOT, 'app.js'), 'utf8');

const APP_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>dotfun Markdown Studio – Test Harness</title>
    <link rel="stylesheet" id="hljs-theme-light" />
    <link rel="stylesheet" id="hljs-theme-dark" disabled />
  </head>
  <body>
    <div class="app" data-theme="light">
      <header>
        <div class="toolbar">
          <button id="btn-load-demo" type="button"></button>
          <label class="toolbar__button file-label">
            <input type="file" id="file-input" />
          </label>
          <button id="btn-download" type="button"></button>
          <button id="btn-copy-html" type="button"></button>
          <button id="btn-copy-docs" type="button"></button>
          <button id="btn-open-settings" type="button"></button>
          <button id="btn-toggle-theme" type="button"></button>
          <span id="theme-indicator"></span>
        </div>
      </header>
      <main>
        <section class="workspace__pane workspace__pane--editor">
          <textarea id="editor"></textarea>
          <span id="editor-stats"></span>
        </section>
        <section class="workspace__pane workspace__pane--preview">
          <article id="preview" class="markdown-body"></article>
        </section>
      </main>
    </div>

    <aside id="bookmark-callout" class="bookmark-callout">
      <button id="dismiss-bookmark" type="button"></button>
    </aside>

    <div class="settings" id="settings-panel" hidden>
      <div class="settings__backdrop" data-settings-close></div>
      <section class="settings__sheet">
        <button id="btn-close-settings" type="button"></button>
        <form id="settings-form">
          <select data-setting="fontFamily">
            <option value="sora">Sora</option>
            <option value="inter">Inter</option>
            <option value="system">System</option>
            <option value="lora">Lora</option>
          </select>
          <select data-setting="headingFont">
            <option value="sora">Sora</option>
            <option value="match">Match</option>
            <option value="lora">Lora</option>
          </select>
          <select data-setting="headingWeight">
            <option value="500">500</option>
            <option value="600">600</option>
            <option value="700">700</option>
          </select>
          <select data-setting="codeTheme">
            <option value="system">system</option>
            <option value="pastel">pastel</option>
            <option value="midnight">midnight</option>
            <option value="mint">mint</option>
          </select>
          <input type="range" data-setting="textScale" min="0.9" max="1.2" step="0.01" />
          <input type="number" data-setting="lineHeight" min="1.4" max="2" step="0.01" />
          <input type="number" data-setting="contentWidth" min="60" max="90" step="1" />
          <input type="number" data-setting="paragraphSpacing" min="0.8" max="1.6" step="0.01" />
          <input type="color" data-setting="accentColor" />
          <input type="color" data-setting="backgroundColor" />
          <input type="color" data-setting="textColor" />
          <span data-display-for="fontFamily"></span>
          <span data-display-for="headingFont"></span>
          <span data-display-for="headingWeight"></span>
          <span data-display-for="codeTheme"></span>
          <span data-display-for="textScale"></span>
          <span data-display-for="lineHeight"></span>
          <span data-display-for="contentWidth"></span>
          <span data-display-for="paragraphSpacing"></span>
          <span data-display-for="accentColor"></span>
          <span data-display-for="backgroundColor"></span>
          <span data-display-for="textColor"></span>
          <button type="button" data-settings-reset="accentColor"></button>
          <button type="button" data-settings-reset="backgroundColor"></button>
          <button type="button" data-settings-reset="textColor"></button>
        </form>
        <button id="btn-reset-settings" type="button"></button>
        <article id="settings-preview"></article>
      </section>
    </div>
  </body>
</html>`;

function createAppEnv(options = {}) {
  const {
    storage = {},
    systemPrefersDark = false,
  } = options;
  const dom = new JSDOM(APP_HTML, {
    url: 'https://dotfun.test',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });

  const { window } = dom;
  const { document } = window;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    window.cancelAnimationFrame = (handle) => clearTimeout(handle);
  }

  window.matchMedia = (query) => ({
    matches: query.includes('dark') ? systemPrefersDark : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });

  const clipboardEvents = [];
  window.navigator.clipboard = {
    writeText: async (text) => {
      clipboardEvents.push({ type: 'text', text });
    },
    write: async (items) => {
      clipboardEvents.push({ type: 'rich', items });
    },
    peek: () => clipboardEvents.slice(),
  };

  window.ClipboardItem = class ClipboardItem {
    constructor(data) {
      this.data = data;
    }
  };

  class FileReaderShim {
    readAsText(file) {
      setTimeout(() => {
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: file && file.content ? file.content : '' } });
        }
      }, 0);
    }
  }

  window.FileReader = FileReaderShim;

  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => {};

  window.Blob = class Blob {
    constructor(parts, options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
  };

  const DOMPurify = createDOMPurify(window);
  window.DOMPurify = DOMPurify;

  window.marked = marked;
  window.hljs = hljs;

  Object.entries(storage).forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });

  const context = dom.getInternalVMContext();
  const script = new vm.Script(APP_SOURCE, { filename: 'app.js' });
  script.runInContext(context);

  const getFn = (name) => {
    if (typeof window[name] === 'function') {
      return window[name].bind(window);
    }
    return undefined;
  };

  const api = {
    window,
    document,
    dom,
    cleanup: () => dom.window.close(),
    clipboardEvents,
    elements: {
      appRoot: document.querySelector('.app'),
      editor: document.getElementById('editor'),
      preview: document.getElementById('preview'),
      stats: document.getElementById('editor-stats'),
      themeIndicator: document.getElementById('theme-indicator'),
    },
    functions: {
      clampNumber: getFn('clampNumber'),
      parseColor: getFn('parseColor'),
      colorWithAlpha: getFn('colorWithAlpha'),
      mixColors: getFn('mixColors'),
      colorToHex: getFn('colorToHex'),
      sanitizeColorValue: getFn('sanitizeColorValue'),
      normalizeColorInputValue: getFn('normalizeColorInputValue'),
      formatNumber: getFn('formatNumber'),
      buildExportAttribution: getFn('buildExportAttribution'),
      computePreviewTokens: getFn('computePreviewTokens'),
      applyPreviewSettings: getFn('applyPreviewSettings'),
      loadPreviewSettings: getFn('loadPreviewSettings'),
      updateSettingValue: getFn('updateSettingValue'),
      generateExportCss: getFn('generateExportCss'),
      generateExportPayload: getFn('generateExportPayload'),
      extractFootnotes: getFn('extractFootnotes'),
      preprocessFootnotes: getFn('preprocessFootnotes'),
      renderFootnoteSection: getFn('renderFootnoteSection'),
      extractTaskItems: getFn('extractTaskItems'),
      updatePreview: getFn('updatePreview'),
      updateStats: getFn('updateStats'),
      toggleTaskItem: getFn('toggleTaskItem'),
      setTheme: getFn('setTheme'),
      formatLanguageLabel: getFn('formatLanguageLabel'),
      decorateCodeBlock: getFn('decorateCodeBlock'),
      getPreviewTokens: getFn('getPreviewTokens'),
    },
  };

  return api;
}

module.exports = {
  createAppEnv,
};
