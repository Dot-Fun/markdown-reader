const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createAppEnv } = require('../helpers/create-app-env.cjs');

const toPlain = (value) => JSON.parse(JSON.stringify(value));

const SAMPLE_MARKDOWN = `A run good note[^run]

Details that land.

[^run]: Bold move
  with continuation

- [ ] Ship it
- [x] Celebrate`;

describe('markdown processing helpers', () => {
  it('extracts and normalises footnotes', () => {
    const env = createAppEnv();
    const { extractFootnotes, renderFootnoteSection } = env.functions;

    const { body, footnotes } = extractFootnotes(SAMPLE_MARKDOWN);
    assert.equal(footnotes.length, 1);
    assert.equal(body.includes('[^run]'), true);
    assert.equal(body.includes('[^run]:'), false);
    assert.deepEqual(toPlain(footnotes[0]), {
      id: 'run',
      content: 'Bold move\nwith continuation',
    });

    const html = renderFootnoteSection(footnotes);
    assert.match(html, /<ol>/);
    assert.match(html, /id="fn-run"/);
    assert.match(html, /footnote-backref/);
    assert.match(html, /Bold move/);

    env.cleanup();
  });

  it('preprocesses footnotes out of the main markdown stream', () => {
    const env = createAppEnv();
    const { preprocessFootnotes } = env.functions;

    const { markdown, footnotes } = preprocessFootnotes(SAMPLE_MARKDOWN);
    assert.equal(footnotes.length, 1);
    assert.ok(!/\[^run\]:/.test(markdown));
    assert.ok(/A run good note/.test(markdown));

    env.cleanup();
  });

  it('indexes GitHub-style task items with checkbox state', () => {
    const env = createAppEnv();
    const { extractTaskItems, updateStats } = env.functions;

    const tasks = extractTaskItems(SAMPLE_MARKDOWN);
    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].checked, false);
    assert.equal(tasks[1].checked, true);
    assert.ok(tasks[0].start < tasks[0].end);

    updateStats('single');
    assert.equal(env.elements.stats.textContent, '1 word');
    updateStats('two words');
    assert.equal(env.elements.stats.textContent, '2 words');

    env.cleanup();
  });

  it('formats language labels for code fences', () => {
    const env = createAppEnv();
    const { formatLanguageLabel } = env.functions;

    assert.equal(formatLanguageLabel('language-js'), 'Js');
    assert.equal(formatLanguageLabel('language-typescript-react'), 'Typescript React');
    assert.equal(formatLanguageLabel(''), 'Code');

    env.cleanup();
  });
});
