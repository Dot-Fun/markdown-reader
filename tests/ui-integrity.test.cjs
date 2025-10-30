const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(process.cwd());

const read = (file) => readFileSync(resolve(root, file), 'utf8');

test('theme tokens apply to both app and body in dark mode', () => {
  const css = read('styles.css');
  assert.ok(
    css.includes(":is(.app[data-theme='dark'], body[data-theme='dark'])"),
    'Expected combined selector for app/body dark mode tokens'
  );
  assert.ok(
    css.includes("--text: #fff2e1;"),
    'Dark token set should expose the shared --text colour'
  );
});

test('bookmark callout uses shared text token in dark mode', () => {
  const css = read('styles.css');
  const darkBlock = css.match(/:is\(.app\[data-theme='dark'], body\[data-theme='dark']\)[^}]*}/s);
  assert.ok(darkBlock, 'Expected dark theme block to be present');

  const calloutSegment = css.match(/\.bookmark-callout__action[^{]*{[^}]*}/);
  assert.ok(calloutSegment, 'Bookmark callout action styles missing');

  const darkCallout = css.match(
    /:is\(.app\[data-theme='dark'], body\[data-theme='dark']\) \.bookmark-callout__action[^{]*{[^}]*}/
  );
  assert.ok(darkCallout, 'Dark-mode bookmark callout action block missing');
  assert.ok(
    /color:\s*#fff2e1;/.test(darkCallout[0]),
    'Dark-mode bookmark action should use warm text colour'
  );
});

test('settings selects retain centred caret and dark background overrides', () => {
  const css = read('styles.css');
  const selectRule = css.match(/\.settings__field select\s*{[^}]*}/);
  assert.ok(selectRule, 'Settings select base rule missing');
  assert.ok(
    /background-position:\s*calc\(100% - 18px\) 50%,\s*calc\(100% - 13px\) 50%;/.test(selectRule[0]),
    'Caret gradients should remain vertically centred'
  );

  const darkSelect = css.match(
    /:is\(.app\[data-theme='dark'], body\[data-theme='dark']\) \.settings__field select[^{]*{[^}]*}/
  );
  assert.ok(darkSelect, 'Dark-mode select override missing');
  assert.ok(
    /background-color:\s*rgba\(41, 29, 18, 0.92\);/.test(darkSelect[0]),
    'Dark-mode select should use warm neutral background'
  );
});

test('brand glyph renders as a fixed circle', () => {
  const html = read('index.html');
  assert.ok(
    /<span class="brand__glyph" aria-hidden="true"><\/span>/.test(html),
    'Brand glyph span missing from header markup'
  );

  const css = read('styles.css');
  const glyphRule = css.match(/\.brand__glyph[^{]*{[^}]*}/);
  assert.ok(glyphRule, 'Brand glyph CSS rule missing');
  assert.ok(/width:\s*42px;/.test(glyphRule[0]), 'Brand glyph width should be fixed at 42px');
  assert.ok(/height:\s*42px;/.test(glyphRule[0]), 'Brand glyph height should match width');
  assert.ok(/border-radius:\s*50%;/.test(glyphRule[0]), 'Brand glyph must remain circular');

  const glyphInner = css.match(/\.brand__glyph::after[^{]*{[^}]*}/);
  assert.ok(glyphInner, 'Brand glyph inner dot missing');
  assert.ok(/border-radius:\s*50%;/.test(glyphInner[0]), 'Inner dot must be circular');
});

test('setTheme propagates the theme to both app and body datasets', () => {
  const js = read('app-core.js');
  assert.ok(
    /appRoot\.dataset\.theme\s*=\s*theme;/.test(js),
    'setTheme should continue writing to the app root dataset'
  );
  assert.ok(
    /document\.body\.dataset\.theme\s*=\s*theme;/.test(js),
    'setTheme must mirror the theme onto document.body'
  );
});
