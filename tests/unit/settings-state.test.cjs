const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createAppEnv } = require('../helpers/create-app-env.cjs');

describe('preview settings lifecycle', () => {
  it('rejects invalid setting updates and applies valid ones', () => {
    const env = createAppEnv();
    const { updateSettingValue, applyPreviewSettings, getPreviewTokens } = env.functions;

    assert.equal(updateSettingValue('fontFamily', 'unknown'), false);
    assert.equal(updateSettingValue('fontFamily', 'inter'), true);
    assert.equal(updateSettingValue('fontFamily', 'inter'), false, 'second identical update skipped');

    assert.equal(updateSettingValue('textScale', 5), true, 'clamped but treated as a change');
    assert.equal(updateSettingValue('accentColor', '#123abc'), true);

    applyPreviewSettings();
    const tokens = getPreviewTokens();

    assert.ok(tokens.fontSans.includes('Inter'));
    assert.equal(tokens.fontScale, 1.2, 'text scale should clamp to upper bound');
    assert.equal(tokens.accent, '#123ABC');

    env.cleanup();
  });

  it('falls back to defaults when persisted settings are invalid', () => {
    const env = createAppEnv({
      storage: {
        'dotfun-studio-preview-settings': JSON.stringify({
          fontFamily: 'unsupported-font',
          headingFont: 'unsupported-heading',
          headingWeight: '900',
          textScale: 0.1,
          lineHeight: 9,
          contentWidth: 200,
          paragraphSpacing: 5,
          accentColor: 'blue',
          backgroundColor: '#101010',
          textColor: 'not-a-hex',
          codeTheme: 'unknown-theme',
        }),
      },
    });

    const { getPreviewTokens } = env.functions;
    const tokens = getPreviewTokens();

    assert.ok(tokens.fontSans.includes('Sora'), 'invalid font should reset to default');
    assert.equal(tokens.headingFont, tokens.fontSans, 'invalid heading font should match body');
    assert.equal(tokens.headingWeight, '600');
    assert.equal(tokens.fontScale, 0.9, 'text scale should clamp to minimum bound');
    assert.equal(tokens.lineHeight, 2);
    assert.equal(tokens.contentWidth, '90ch');
    assert.equal(tokens.paragraphSpacing, '1.6rem');
    assert.equal(tokens.accent, '#FF4A2F', 'invalid accent should fall back to base token');
    assert.equal(tokens.background, '#101010', 'valid override should persist');
    assert.equal(tokens.text, '#1C1A15');
    assert.equal(tokens.hlKeyword, '#FF4A2F');

    env.cleanup();
  });

  it('applies computed tokens onto CSS custom properties', () => {
    const env = createAppEnv();
    const { applyPreviewSettings, updateSettingValue, getPreviewTokens } = env.functions;
    const root = env.elements.appRoot;

    updateSettingValue('codeTheme', 'mint');
    updateSettingValue('backgroundColor', '#223344');
    updateSettingValue('textColor', '#fefefe');
    applyPreviewSettings();

    const tokens = getPreviewTokens();

    assert.equal(root.style.getPropertyValue('--preview-code-block-bg'), tokens.codeBlockBg);
    assert.equal(root.style.getPropertyValue('--preview-surface'), tokens.background);
    assert.equal(root.style.getPropertyValue('--preview-text'), tokens.text);

    env.cleanup();
  });
});
