const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createAppEnv } = require('../helpers/create-app-env.cjs');

describe('preview rendering and export flows', () => {
  it('sanitises markdown, highlights code, and syncs tasks', () => {
    const env = createAppEnv();
    const { updatePreview } = env.functions;
    const { preview } = env.elements;

    const markdown = `# Welcome\n\n<script>alert('boom')</script>\n\n- [ ] Draft outline\n- [x] Ship update\n\n
\u0060\u0060\u0060js\nconsole.log('hi');\n\u0060\u0060\u0060`;
    updatePreview(markdown);

    assert.equal(preview.querySelector('script'), null, 'scripts should be stripped');

    const tasks = Array.from(preview.querySelectorAll('li input[type="checkbox"]'));
    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].checked, false);
    assert.equal(tasks[0].disabled, false);
    assert.equal(tasks[0].dataset.taskIndex, '0');
    assert.equal(tasks[1].checked, true);

    const pre = preview.querySelector('pre');
    assert.ok(pre, 'code block should render');
    assert.equal(pre.dataset.lang, 'Js');

    env.cleanup();
  });

  it('toggles task items and keeps editor + stats in sync', () => {
    const env = createAppEnv();
    const { updatePreview, toggleTaskItem } = env.functions;
    const { editor, preview, stats } = env.elements;

    const markdown = '- [ ] Sync state\n- [x] Prior state';
    editor.value = markdown;
    updatePreview(markdown);

    toggleTaskItem(0, true);

    assert.match(editor.value, /- \[x\] Sync state/);
    const checkbox = preview.querySelector('li input[type="checkbox"]');
    assert.equal(checkbox.checked, true);
    assert.equal(stats.textContent, '6 words');

    env.cleanup();
  });

  it('switches themes and toggles highlight styles', () => {
    const env = createAppEnv();
    const { setTheme } = env.functions;
    const { appRoot, themeIndicator } = env.elements;
    const { document } = env;
    const lightTheme = document.getElementById('hljs-theme-light');
    const darkTheme = document.getElementById('hljs-theme-dark');

    setTheme('dark');
    assert.equal(appRoot.dataset.theme, 'dark');
    assert.equal(document.body.dataset.theme, 'dark');
    assert.equal(themeIndicator.textContent, 'Dark');
    assert.equal(lightTheme.disabled, true);
    assert.equal(darkTheme.disabled, false);
    assert.equal(env.window.localStorage.getItem('dotfun-studio-theme'), 'dark');

    setTheme('light');
    assert.equal(appRoot.dataset.theme, 'light');
    assert.equal(themeIndicator.textContent, 'Light');
    assert.equal(lightTheme.disabled, false);
    assert.equal(darkTheme.disabled, true);

    env.cleanup();
  });

  it('produces complete export payloads with attribution', () => {
    const env = createAppEnv();
    const { updatePreview, generateExportPayload, buildExportAttribution } = env.functions;

    updatePreview('# Hello world');
    const payload = generateExportPayload('document');

    assert.ok(payload.tokens, 'tokens should be included');
    assert.match(payload.css, /\.dotfun-markdown/);
    assert.match(payload.htmlFragment, /export-attribution/);
    assert.match(payload.docHtml, /<!DOCTYPE html>/);
    assert.ok(payload.plainText.includes('Hello world'));

    const attribution = buildExportAttribution({
      textColor: ' #999 ',
      borderColor: '',
      accentColor: '  #777777  ',
    });
    assert.match(attribution, /#999/);
    assert.match(attribution, /#777777/);

    env.cleanup();
  });
});
