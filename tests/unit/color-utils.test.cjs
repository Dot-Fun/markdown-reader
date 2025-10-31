const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createAppEnv } = require('../helpers/create-app-env.cjs');

const toPlain = (value) => JSON.parse(JSON.stringify(value));

describe('color and number utilities', () => {
  it('parses short and long hex colors', () => {
    const env = createAppEnv();
    const { parseColor } = env.functions;

    assert.deepEqual(toPlain(parseColor('#abc')), { r: 170, g: 187, b: 204, a: 1 });
    assert.deepEqual(toPlain(parseColor('#FFAA33')), { r: 255, g: 170, b: 51, a: 1 });
    assert.deepEqual(toPlain(parseColor('#FFAA3380')), { r: 255, g: 170, b: 51, a: 0.502 });

    env.cleanup();
  });

  it('parses rgba strings and clamps values', () => {
    const env = createAppEnv();
    const { parseColor } = env.functions;

    assert.deepEqual(toPlain(parseColor('rgba(255, 0, 0, 0.25)')), {
      r: 255,
      g: 0,
      b: 0,
      a: 0.25,
    });

    assert.deepEqual(toPlain(parseColor('rgb(300, -20, 40)')), {
      r: 255,
      g: 0,
      b: 40,
      a: 1,
    });

    assert.equal(parseColor('not-a-color'), null);

    env.cleanup();
  });

  it('mixes colors and respects alpha blending', () => {
    const env = createAppEnv();
    const { mixColors } = env.functions;

    assert.equal(
      mixColors('rgba(255, 0, 0, 0.5)', '#0000FF', 0.5),
      'rgba(128, 0, 128, 0.75)'
    );

    assert.equal(mixColors(null, '#112233', 0.3), 'rgba(17, 34, 51, 1)');
    assert.equal(mixColors('#112233', null, 0.3), 'rgba(17, 34, 51, 1)');
    assert.equal(mixColors(null, null, 0.3), null);

    env.cleanup();
  });

  it('applies alpha overlays with fallbacks when needed', () => {
    const env = createAppEnv();
    const { colorWithAlpha } = env.functions;

    assert.equal(colorWithAlpha('#123456', 0.4), 'rgba(18, 52, 86, 0.4)');
    assert.equal(colorWithAlpha('invalid', 0.6, '#abcdef'), 'rgba(171, 205, 239, 0.6)');
    assert.equal(colorWithAlpha('invalid', 0.6), 'invalid');

    env.cleanup();
  });

  it('normalises color strings and sanitises invalid values', () => {
    const env = createAppEnv();
    const { sanitizeColorValue, normalizeColorInputValue, colorToHex } = env.functions;

    assert.equal(sanitizeColorValue('  #1a2b3c  '), '#1A2B3C');
    assert.equal(sanitizeColorValue('blue'), '');
    assert.equal(normalizeColorInputValue('#112233', '#000000'), '#112233');
    assert.equal(normalizeColorInputValue('not-a-color', '#abcdef'), '#ABCDEF');
    assert.equal(colorToHex('rgb(255, 128, 64)'), '#FF8040');
    assert.equal(colorToHex('bad', '#AA5500'), '#AA5500');

    env.cleanup();
  });

  it('formats numbers and clamps values safely', () => {
    const env = createAppEnv();
    const { formatNumber, clampNumber } = env.functions;

    assert.equal(formatNumber(2.3456, 3), '2.346');
    assert.equal(formatNumber('foo'), '');

    assert.equal(clampNumber('12', 0, 10, 7), 10);
    assert.equal(clampNumber('abc', 0, 10, 4), 4);
    assert.equal(clampNumber(5, 0, 10, 1), 5);

    env.cleanup();
  });
});
