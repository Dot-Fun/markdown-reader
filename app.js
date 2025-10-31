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
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const settingsPanel = document.getElementById('settings-panel');
const settingsForm = document.getElementById('settings-form');
const btnResetSettings = document.getElementById('btn-reset-settings');
const hljsThemeLight = document.getElementById('hljs-theme-light');
const hljsThemeDark = document.getElementById('hljs-theme-dark');
const settingsPreview = document.getElementById('settings-preview');
const settingsBackdrop = settingsPanel
  ? settingsPanel.querySelector('[data-settings-close]')
  : null;

let currentTaskItems = [];
let isPreviewSyncing = false;

const STORAGE_KEYS = {
  THEME: 'dotfun-studio-theme',
  CONTENT: 'dotfun-studio-content',
  BOOKMARK_DISMISSED: 'dotfun-studio-bookmark-dismissed',
  SETTINGS: 'dotfun-studio-preview-settings',
};

const safeStorage = resolveSafeStorage();

function resolveSafeStorage() {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }
    const storage = globalThis.localStorage;
    const testKey = '__dotfun-storage-test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (error) {
    return null;
  }
}

function storageSet(
  key,
  value,
  { serialize = (input) => input, onErrorMessage } = {}
) {
  if (!safeStorage) return false;
  try {
    safeStorage.setItem(key, serialize(value));
    return true;
  } catch (error) {
    if (onErrorMessage) {
      console.warn(`${onErrorMessage}:`, error);
    } else {
      console.warn(`Unable to persist ${key}:`, error);
    }
    return false;
  }
}

function storageGet(
  key,
  { parse = (input) => input, fallback = null, onErrorMessage } = {}
) {
  if (!safeStorage) {
    return fallback;
  }
  try {
    const raw = safeStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return parse(raw);
  } catch (error) {
    if (onErrorMessage) {
      console.warn(`${onErrorMessage}:`, error);
    } else {
      console.warn(`Unable to read ${key}:`, error);
    }
    return fallback;
  }
}

const sampleDoc = `# dotfun Field Kit

Welcome to the **dotfun markdown studio**, your rapid space for shipping content, creative, and campaign notes in the dotfun house style.

---

## Why dotfun wins

- Human-first, unstoppable support that keeps partners in motion[^human-first]
- Transparent dashes: no smoke, no mirrors, just accountable growth[^transparent]
- We always **run good**, *look good*, and ~~feel average~~ feel good

> “Great marketing is equal parts rigor and play. dotfun keeps both on the table.”
>
> > Nested quotes let you surface creative direction alongside data calls.

## Plays & rituals

1. Run Good — align strategy with measurable revenue lift
2. Look Good — tell the story with thumb-stopping creative
3. Feel Good — nurture teams, founders, and audiences with human energy

- [x] Kickoff brief captured in Notion
- [ ] Post-launch retro scheduled
- Inline autolinks keep collaboration fast: <https://dotfun.co>

## Code snippets & ops

\`\`\`js
const lifecycle = ['Run Good', 'Look Good', 'Feel Good'];

export function dotfunPulse(team) {
  return lifecycle.map(phase => \`\${team} → \${phase}\`);
}
\`\`\`

\`\`\`bash
# Clone the playbook and start locally
git clone https://github.com/dotfunhq/marketing-os.git
cd marketing-os
npm install && npm run dev
\`\`\`

## Palette cheatsheet

| Tone            |   Hex    | Energy                                |
| :-------------- | :------: | ------------------------------------- |
| Run Good Red    | #FF4A2F  | Primary topspin for CTAs + headlines  |
| Neutral Sand    | #F6EEDC  | Background canvas for every story     |
| Accent Ink      | #1C1A15  | High-contrast copy + frames           |
| Highlight Peach | #FFB156  | Warm pops for data points + badges    |

## Media drop

![dotfun collage with gradient lighting](https://dummyimage.com/880x240/120d2e/ffffff&text=dotfun+creative)

---

## Callouts & embeds

<aside>
  <strong>Play nice with partners:</strong> dotfun pairs human energy with automation so every brief ships faster.
</aside>

Footnotes live here:

[^human-first]: dotfun leads with “Human-first, unstoppable support” across its service model.
[^transparent]: dotfun promises “No smoke. No mirrors. Just performance marketing that works.”`;

const SETTINGS_PREVIEW_SNIPPET = `
  <h2>Signal cadence</h2>
  <p>
    Tune typography, spacing, and accents to preview exactly how your exports will read.
    <strong>Headlines</strong>, <em>emphasis</em>, and <a href="https://dotfun.co">links</a>
    all respond instantly.
  </p>
  <ul>
    <li><input type="checkbox" checked /> Kickoff brief approved</li>
    <li><input type="checkbox" /> Post-launch retro scheduled</li>
  </ul>
  <blockquote>
    “Keep the preview tight—content should feel premium in every export.”
  </blockquote>
  <pre><code class="language-js">const palette = ['accent', 'muted', 'surface'];
const headline = 'Run Good';
console.log(\`\${headline} → \${palette[0]}\`);</code></pre>
  <table>
    <thead>
      <tr>
        <th>Element</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Headings</td>
        <td>Frame the narrative arc</td>
      </tr>
      <tr>
        <td>Accent</td>
        <td>Guide the reader’s eye</td>
      </tr>
    </tbody>
  </table>
`;

const PREVIEW_FONT_FAMILIES = {
  sora: "'Sora','Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  inter: "'Inter','Sora',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  system: "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif",
  lora: "'Lora','Georgia','Times New Roman',serif",
};

const MONO_FONT_STACK = "'IBM Plex Mono','SFMono-Regular',Menlo,monospace";

const PREVIEW_FONT_LABELS = {
  sora: 'Sora — dotfun default',
  inter: 'Inter — versatile sans',
  system: 'System UI — platform native',
  lora: 'Lora — editorial serif',
};

const PREVIEW_HEADING_FAMILIES = {
  sora: PREVIEW_FONT_FAMILIES.sora,
  match: null,
  lora: "'Lora','Georgia','Times New Roman',serif",
};

const HEADING_FONT_LABELS = {
  sora: 'Sora Display',
  match: 'Matches body',
  lora: 'Editorial Serif',
};

const HEADING_WEIGHT_LABELS = {
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
};

const CODE_THEME_PRESETS = {
  system(context) {
    return {
      codeInlineBg: context.inlineBg,
      codeInlineColor: context.inlineColor,
      codeBlockBg: context.blockBg,
      codeBlockBorder: context.blockBorder,
      codeBadgeBg: context.badgeBg,
      codeBadgeText: context.badgeText,
      codeBlockText: context.text,
      hlKeyword: context.hlKeyword,
      hlString: context.hlString,
      hlTitle: context.hlTitle,
      hlNumber: context.hlNumber,
      hlComment: context.hlComment,
      tableBorder: context.tableBorder,
      tableHeaderBg: context.tableHeaderBg,
      tableRowEven: context.tableRowEven,
    };
  },
  pastel(context) {
    const { accent, text, background } = context;
    return {
      codeInlineBg: colorWithAlpha(accent, 0.18, context.inlineBg),
      codeInlineColor: mixColors(accent, text, 0.35) || context.inlineColor,
      codeBlockBg: mixColors(background, accent, 0.12) || context.blockBg,
      codeBlockBorder: colorWithAlpha(accent, 0.32, context.blockBorder),
      codeBadgeBg: colorWithAlpha(accent, 0.22, context.badgeBg),
      codeBadgeText: text,
      codeBlockText: text,
      hlKeyword: accent,
      hlString: mixColors(accent, '#2ca659', 0.5) || context.hlString,
      hlTitle: mixColors(accent, '#9b4dff', 0.42) || context.hlTitle,
      hlNumber: mixColors(accent, '#d97706', 0.45) || context.hlNumber,
      hlComment: mixColors(text, background, 0.6) || context.hlComment,
      tableBorder: mixColors(text, background, 0.82) || context.tableBorder,
      tableHeaderBg: colorWithAlpha(accent, 0.18, context.tableHeaderBg),
      tableRowEven: colorWithAlpha(accent, 0.1, context.tableRowEven),
    };
  },
  midnight(context) {
    const { accent, text, background } = context;
    const midnightBase = mixColors(background, '#121827', 0.6) || '#1b2335';
    const midnightBadge = mixColors(accent, '#2d1b24', 0.4) || '#3a2733';
    const midnightText = mixColors('#f7f5ff', '#e9edf5', 0.5) || '#f1f5f9';
    return {
      codeInlineBg: colorWithAlpha(accent, 0.22, context.inlineBg),
      codeInlineColor: mixColors(accent, midnightText, 0.5) || midnightText,
      codeBlockBg: midnightBase,
      codeBlockBorder: colorWithAlpha(
        mixColors(accent, midnightBase, 0.4) || midnightBase,
        0.6,
        context.blockBorder
      ),
      codeBadgeBg: colorWithAlpha(midnightBadge, 0.65, context.badgeBg),
      codeBadgeText: midnightText,
      codeBlockText: midnightText,
      hlKeyword: mixColors(accent, '#ffd166', 0.5) || midnightText,
      hlString: mixColors('#8efac6', accent, 0.35) || midnightText,
      hlTitle: mixColors('#c1b4ff', accent, 0.4) || midnightText,
      hlNumber: mixColors('#f9a46c', accent, 0.4) || midnightText,
      hlComment:
        mixColors(midnightText, midnightBase, 0.4) ||
        mixColors(text, midnightBase, 0.5) ||
        midnightText,
      tableBorder: colorWithAlpha(
        mixColors(midnightText, midnightBase, 0.55) || midnightBase,
        0.55,
        context.tableBorder
      ),
      tableHeaderBg: colorWithAlpha(
        mixColors(accent, midnightBase, 0.3) || midnightBase,
        0.5,
        context.tableHeaderBg
      ),
      tableRowEven: colorWithAlpha(
        mixColors(accent, '#1a1f2d', 0.35) || '#1f2432',
        0.38,
        context.tableRowEven
      ),
    };
  },
  mint(context) {
    const { accent, text, background } = context;
    const mintAccent = mixColors(accent, '#00b894', 0.4) || accent;
    return {
      codeInlineBg: colorWithAlpha(mintAccent, 0.2, context.inlineBg),
      codeInlineColor: mixColors(mintAccent, '#064e3b', 0.25) || context.inlineColor,
      codeBlockBg: mixColors(background, '#e6fffa', 0.22) || context.blockBg,
      codeBlockBorder: colorWithAlpha(mintAccent, 0.28, context.blockBorder),
      codeBadgeBg: colorWithAlpha(mintAccent, 0.24, context.badgeBg),
      codeBadgeText: mixColors(text, '#053d2f', 0.6) || context.badgeText,
      codeBlockText: mixColors(text, '#022d20', 0.5) || context.text,
      hlKeyword: mixColors(mintAccent, '#0ea5e9', 0.32) || context.hlKeyword,
      hlString: mixColors('#22c55e', mintAccent, 0.5) || context.hlString,
      hlTitle: mixColors('#6366f1', mintAccent, 0.35) || context.hlTitle,
      hlNumber: mixColors('#f97316', mintAccent, 0.35) || context.hlNumber,
      hlComment: mixColors(text, background, 0.62) || context.hlComment,
      tableBorder: mixColors(text, background, 0.88) || context.tableBorder,
      tableHeaderBg: colorWithAlpha(mintAccent, 0.2, context.tableHeaderBg),
      tableRowEven: colorWithAlpha(mintAccent, 0.12, context.tableRowEven),
    };
  },
};

const DEFAULT_SETTINGS = {
  fontFamily: 'sora',
  headingFont: 'sora',
  headingWeight: '600',
  textScale: 1,
  lineHeight: 1.75,
  contentWidth: 70,
  paragraphSpacing: 1.1,
  accentColor: '',
  backgroundColor: '',
  textColor: '',
  codeTheme: 'system',
};

const PREVIEW_SETTING_CONSTRAINTS = {
  textScale: { min: 0.9, max: 1.2, precision: 2 },
  lineHeight: { min: 1.4, max: 2, precision: 2 },
  contentWidth: { min: 60, max: 90, precision: 0 },
  paragraphSpacing: { min: 0.8, max: 1.6, precision: 2 },
};

const VALID_FONT_KEYS = new Set(Object.keys(PREVIEW_FONT_FAMILIES));
const VALID_HEADING_KEYS = new Set(Object.keys(PREVIEW_HEADING_FAMILIES));
const VALID_HEADING_WEIGHTS = new Set(Object.keys(HEADING_WEIGHT_LABELS));
const VALID_CODE_THEMES = new Set(Object.keys(CODE_THEME_PRESETS));

let previewSettings = { ...DEFAULT_SETTINGS };
let currentPreviewTokens = null;
let lastFocusedSettingsTrigger = null;

const SETTINGS_TRANSITION_DURATION = 320;
const SETTINGS_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function clampWithPrecision(value, constraint, fallback) {
  const { min, max, precision } = constraint;
  const clamped = clampNumber(value, min, max, fallback);
  if (typeof precision !== 'number') {
    return clamped;
  }
  const factor = 10 ** precision;
  return Math.round(clamped * factor) / factor;
}

function parseColor(color) {
  if (!color) return null;
  const value = color.trim();
  if (!value) return null;

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if ([r, g, b].some((component) => Number.isNaN(component))) return null;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if ([r, g, b].some((component) => Number.isNaN(component))) return null;
      if (hex.length === 8) {
        const a = parseInt(hex.substring(6, 8), 16);
        return { r, g, b, a: Math.round((a / 255) * 1000) / 1000 };
      }
      return { r, g, b, a: 1 };
    }
    return null;
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if ([r, g, b].some((component) => Number.isNaN(component))) return null;
    const a = parts.length > 3 ? Number(parts[3]) : 1;
    return {
      r: Math.min(Math.max(Math.round(r), 0), 255),
      g: Math.min(Math.max(Math.round(g), 0), 255),
      b: Math.min(Math.max(Math.round(b), 0), 255),
      a: Number.isNaN(a) ? 1 : Math.min(Math.max(a, 0), 1),
    };
  }

  return null;
}

function formatAlpha(value) {
  const clamped = Math.min(Math.max(value, 0), 1);
  if (clamped === 0 || clamped === 1) {
    return String(clamped);
  }
  return clamped.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function colorWithAlpha(color, alpha, fallback) {
  const parsed = parseColor(color) || (fallback ? parseColor(fallback) : null);
  if (!parsed) {
    return fallback || color;
  }
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${formatAlpha(alpha)})`;
}

function mixColors(colorA, colorB, amount) {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a && !b) return null;
  if (!a) return `rgba(${b.r}, ${b.g}, ${b.b}, ${formatAlpha(b.a)})`;
  if (!b) return `rgba(${a.r}, ${a.g}, ${a.b}, ${formatAlpha(a.a)})`;

  const t = Math.min(Math.max(amount, 0), 1);
  const mixComponent = (start, end) => Math.round(start + (end - start) * t);
  const alpha = a.a + (b.a - a.a) * t;
  return `rgba(${mixComponent(a.r, b.r)}, ${mixComponent(a.g, b.g)}, ${mixComponent(
    a.b,
    b.b
  )}, ${formatAlpha(alpha)})`;
}

function colorToHex(color, fallback = '#FF4A2F') {
  const parsed = parseColor(color);
  if (!parsed) return fallback;
  const toHex = (component) => component.toString(16).padStart(2, '0');
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`.toUpperCase();
}

function resolveFontFamily(key) {
  return PREVIEW_FONT_FAMILIES[key] || PREVIEW_FONT_FAMILIES[DEFAULT_SETTINGS.fontFamily];
}

function resolveHeadingFont(key, bodyFont) {
  if (key === 'match') {
    return bodyFont;
  }
  return (
    PREVIEW_HEADING_FAMILIES[key] ||
    PREVIEW_HEADING_FAMILIES[DEFAULT_SETTINGS.headingFont] ||
    bodyFont
  );
}

function sanitizeColorValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : '';
}

function normalizeColorInputValue(color, fallback) {
  if (!color) {
    return sanitizeColorValue(fallback) || '#FF4A2F';
  }
  const parsed = parseColor(color);
  if (!parsed) {
    return sanitizeColorValue(fallback) || '#FF4A2F';
  }
  const toHex = (component) => component.toString(16).padStart(2, '0');
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`.toUpperCase();
}

function normalizePreviewSettings(rawSettings) {
  const merged =
    rawSettings && typeof rawSettings === 'object'
      ? { ...DEFAULT_SETTINGS, ...rawSettings }
      : { ...DEFAULT_SETTINGS };

  if (!VALID_FONT_KEYS.has(merged.fontFamily)) {
    merged.fontFamily = DEFAULT_SETTINGS.fontFamily;
  }
  if (!VALID_HEADING_KEYS.has(merged.headingFont)) {
    merged.headingFont = DEFAULT_SETTINGS.headingFont;
  }
  if (VALID_HEADING_WEIGHTS.has(String(merged.headingWeight))) {
    merged.headingWeight = String(merged.headingWeight);
  } else {
    merged.headingWeight = DEFAULT_SETTINGS.headingWeight;
  }
  if (!VALID_CODE_THEMES.has(merged.codeTheme)) {
    merged.codeTheme = DEFAULT_SETTINGS.codeTheme;
  }

  Object.entries(PREVIEW_SETTING_CONSTRAINTS).forEach(([key, constraint]) => {
    merged[key] = clampWithPrecision(merged[key], constraint, DEFAULT_SETTINGS[key]);
  });

  merged.accentColor = sanitizeColorValue(merged.accentColor);
  merged.backgroundColor = sanitizeColorValue(merged.backgroundColor);
  merged.textColor = sanitizeColorValue(merged.textColor);

  return merged;
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);
  if (Number.isNaN(number)) return '';
  return number.toFixed(decimals).replace(/\.?0+$/, '');
}

function getCssVar(computed, name, fallback) {
  const value = computed.getPropertyValue(name);
  if (value && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function formatSettingDisplay(key) {
  switch (key) {
    case 'fontFamily':
      return (
        PREVIEW_FONT_LABELS[previewSettings.fontFamily] ||
        PREVIEW_FONT_LABELS[DEFAULT_SETTINGS.fontFamily]
      );
    case 'headingFont':
      return (
        HEADING_FONT_LABELS[previewSettings.headingFont] ||
        HEADING_FONT_LABELS[DEFAULT_SETTINGS.headingFont]
      );
    case 'headingWeight':
      return (
        HEADING_WEIGHT_LABELS[previewSettings.headingWeight] ||
        HEADING_WEIGHT_LABELS[DEFAULT_SETTINGS.headingWeight]
      );
    case 'textScale':
      return `${Math.round(previewSettings.textScale * 100)}%`;
    case 'lineHeight':
      return formatNumber(previewSettings.lineHeight, 2);
    case 'contentWidth':
      return `${Math.round(previewSettings.contentWidth)} ch`;
    case 'paragraphSpacing':
      return `${formatNumber(previewSettings.paragraphSpacing, 2)} rem`;
    default:
      return '';
  }
}

function getPreviewTokens() {
  return currentPreviewTokens;
}

function buildExportAttribution({ textColor, borderColor, accentColor }) {
  const text = textColor && textColor.trim() ? textColor.trim() : '#4b4237';
  const border = borderColor && borderColor.trim() ? borderColor.trim() : 'rgba(28, 26, 21, 0.14)';
  const accent = accentColor && accentColor.trim() ? accentColor.trim() : '#ff4a2f';
  return `\n<p class="export-attribution" style="margin-top:2.5rem;padding-top:1.5rem;font-size:0.92rem;color:${text};border-top:1px solid ${border};">Built with <a href="https://dotfun.co/tools/markdown-studio" target="_blank" rel="noopener" style="font-weight:600;text-decoration:none;color:${accent};">dotfun Markdown Studio</a>.</p>`;
}

function computePreviewTokens(settings) {
  if (!appRoot) return null;
  const computed = getComputedStyle(appRoot);
  const theme = (appRoot.dataset.theme || 'light').toLowerCase();
  const isDark = theme === 'dark';

  const accentBase = getCssVar(computed, '--accent', '#FF4A2F');
  const textBase = getCssVar(computed, '--text', '#1C1A15');
  const backgroundBase = getCssVar(computed, '--surface', '#FFF8EB');
  const surfaceAltBase = getCssVar(computed, '--surface-alt', backgroundBase);
  const mutedBase = getCssVar(computed, '--muted', 'rgba(28, 26, 21, 0.68)');
  const accentSoftBase = getCssVar(computed, '--accent-soft', colorWithAlpha(accentBase, 0.14));
  const accentShadowBase = getCssVar(
    computed,
    '--preview-accent-shadow',
    colorWithAlpha(accentBase, isDark ? 0.28 : 0.25)
  );
  const inlineBgBase = getCssVar(computed, '--code-inline-bg', 'rgba(31, 36, 48, 0.1)');
  const inlineColorBase = getCssVar(computed, '--code-inline-color', '#0C7C3F');
  const blockBgBase = getCssVar(computed, '--code-block-bg', '#EEF2FF');
  const blockBorderBase = getCssVar(computed, '--code-block-border', 'rgba(39, 94, 254, 0.16)');
  const badgeBgBase = getCssVar(computed, '--code-badge-bg', 'rgba(39, 94, 254, 0.12)');
  const badgeTextBase = getCssVar(computed, '--code-badge-text', textBase);
  const hlKeywordBase = getCssVar(computed, '--hljs-keyword', accentBase);
  const hlStringBase = getCssVar(computed, '--hljs-string', '#2CA659');
  const hlTitleBase = getCssVar(computed, '--hljs-title', '#9B4DFF');
  const hlNumberBase = getCssVar(computed, '--hljs-number', '#D97706');
  const hlCommentBase = getCssVar(
    computed,
    '--hljs-comment',
    mixColors(textBase, backgroundBase, 0.55) || textBase
  );
  const tableBorderBase = getCssVar(
    computed,
    '--table-border',
    colorWithAlpha(mixColors(textBase, backgroundBase, 0.8) || textBase, isDark ? 0.32 : 0.24)
  );
  const tableHeaderBgBase = getCssVar(
    computed,
    '--table-header-bg',
    colorWithAlpha(accentBase, isDark ? 0.18 : 0.12)
  );
  const tableRowEvenBase = getCssVar(
    computed,
    '--table-row-even',
    colorWithAlpha(accentBase, isDark ? 0.16 : 0.08)
  );
  const checkboxBorderBase = getCssVar(
    computed,
    '--preview-checkbox-border',
    isDark ? 'rgba(255, 224, 196, 0.6)' : 'rgba(28, 26, 21, 0.5)'
  );
  const monoFont = getCssVar(computed, '--font-mono', MONO_FONT_STACK);

  const accent = settings.accentColor || accentBase;
  const text = settings.textColor || textBase;
  const background = settings.backgroundColor || backgroundBase;

  let surfaceAlt = surfaceAltBase;
  if (settings.backgroundColor) {
    const blendTarget = isDark ? '#ffffff' : '#000000';
    surfaceAlt = mixColors(background, blendTarget, isDark ? 0.12 : 0.08) || surfaceAltBase;
  }

  const accentSoft = colorWithAlpha(accent, isDark ? 0.24 : 0.16, accentSoftBase);
  const accentShadow = colorWithAlpha(accent, isDark ? 0.32 : 0.25, accentShadowBase);
  const muted =
    settings.textColor || settings.backgroundColor
      ? mixColors(text, background, isDark ? 0.72 : 0.38) || mutedBase
      : mutedBase;

  const codeContext = {
    accent,
    text,
    background,
    inlineBg: inlineBgBase,
    inlineColor: inlineColorBase,
    blockBg: blockBgBase,
    blockBorder: blockBorderBase,
    badgeBg: badgeBgBase,
    badgeText: badgeTextBase,
    hlKeyword: hlKeywordBase,
    hlString: hlStringBase,
    hlTitle: hlTitleBase,
    hlNumber: hlNumberBase,
    hlComment: hlCommentBase,
    tableBorder: tableBorderBase,
    tableHeaderBg: tableHeaderBgBase,
    tableRowEven: tableRowEvenBase,
  };

  const themeKey = VALID_CODE_THEMES.has(settings.codeTheme)
    ? settings.codeTheme
    : DEFAULT_SETTINGS.codeTheme;
  const codeTokens = CODE_THEME_PRESETS[themeKey](codeContext) || {};

  const tableBorder = codeTokens.tableBorder || tableBorderBase;
  const tableHeaderBg = codeTokens.tableHeaderBg || tableHeaderBgBase;
  const tableRowEven = codeTokens.tableRowEven || tableRowEvenBase;
  const codeInlineBg = codeTokens.codeInlineBg || inlineBgBase;
  const codeInlineColor = codeTokens.codeInlineColor || inlineColorBase;
  const codeBlockBg = codeTokens.codeBlockBg || blockBgBase;
  const codeBlockBorder = codeTokens.codeBlockBorder || blockBorderBase;
  const codeBadgeBg = codeTokens.codeBadgeBg || badgeBgBase;
  const codeBadgeText = codeTokens.codeBadgeText || badgeTextBase;
  const codeBlockText = codeTokens.codeBlockText || text;
  const hlKeyword = codeTokens.hlKeyword || hlKeywordBase;
  const hlString = codeTokens.hlString || hlStringBase;
  const hlTitle = codeTokens.hlTitle || hlTitleBase;
  const hlNumber = codeTokens.hlNumber || hlNumberBase;
  const hlComment = codeTokens.hlComment || hlCommentBase;
  const checkboxBorder =
    colorWithAlpha(
      mixColors(text, background, isDark ? 0.68 : 0.42) || text,
      isDark ? 0.68 : 0.5,
      checkboxBorderBase
    ) || checkboxBorderBase;

  const fontSans = resolveFontFamily(settings.fontFamily);
  const headingFont = resolveHeadingFont(settings.headingFont, fontSans);
  const headingWeight = VALID_HEADING_WEIGHTS.has(String(settings.headingWeight))
    ? String(settings.headingWeight)
    : DEFAULT_SETTINGS.headingWeight;

  return {
    fontSans,
    headingFont,
    headingWeight,
    monoFont,
    fontScale: settings.textScale,
    lineHeight: settings.lineHeight,
    paragraphSpacing: `${settings.paragraphSpacing}rem`,
    contentWidth: `${settings.contentWidth}ch`,
    accent,
    accentSoft,
    accentShadow,
    text,
    muted,
    background,
    surfaceAlt,
    tableBorder,
    tableHeaderBg,
    tableRowEven,
    codeInlineBg,
    codeInlineColor,
    codeBlockBg,
    codeBlockBorder,
    codeBadgeBg,
    codeBadgeText,
    codeBlockText,
    hlKeyword,
    hlString,
    hlTitle,
    hlNumber,
    hlComment,
    checkboxBorder,
  };
}

function setPreviewVar(name, value) {
  const targets = [];
  if (appRoot) targets.push(appRoot);
  if (settingsPanel) targets.push(settingsPanel);
  if (targets.length === 0) return;
  targets.forEach((target) => {
    if (!target) return;
    if (value === undefined || value === null || value === '') {
      target.style.removeProperty(name);
    } else {
      target.style.setProperty(name, value);
    }
  });
}

const PREVIEW_TOKEN_VAR_MAP = [
  ['fontSans', '--preview-font-sans'],
  ['headingFont', '--preview-heading-font'],
  ['headingWeight', '--preview-heading-weight'],
  ['fontScale', '--preview-font-scale', (value) => String(value)],
  ['lineHeight', '--preview-line-height', (value) => String(value)],
  ['paragraphSpacing', '--preview-paragraph-spacing'],
  ['contentWidth', '--preview-content-width'],
  ['text', '--preview-text'],
  ['muted', '--preview-muted'],
  ['background', '--preview-surface'],
  ['surfaceAlt', '--preview-surface-alt'],
  ['accent', '--preview-accent'],
  ['accentSoft', '--preview-accent-soft'],
  ['accentShadow', '--preview-accent-shadow'],
  ['codeInlineBg', '--preview-code-inline-bg'],
  ['codeInlineColor', '--preview-code-inline-color'],
  ['codeBlockBg', '--preview-code-block-bg'],
  ['codeBlockBorder', '--preview-code-block-border'],
  ['codeBadgeBg', '--preview-code-badge-bg'],
  ['codeBadgeText', '--preview-code-badge-text'],
  ['codeBlockText', '--preview-code-block-text'],
  ['tableBorder', '--preview-table-border'],
  ['tableHeaderBg', '--preview-table-header-bg'],
  ['tableRowEven', '--preview-table-row-even'],
  ['hlKeyword', '--preview-hljs-keyword'],
  ['hlString', '--preview-hljs-string'],
  ['hlTitle', '--preview-hljs-title'],
  ['hlNumber', '--preview-hljs-number'],
  ['hlComment', '--preview-hljs-comment'],
  ['checkboxBorder', '--preview-checkbox-border'],
];

function applyPreviewTokenVars(tokens) {
  PREVIEW_TOKEN_VAR_MAP.forEach(([tokenKey, cssVar, transform]) => {
    if (!(tokenKey in tokens)) return;
    const raw = tokens[tokenKey];
    const value = typeof transform === 'function' ? transform(raw, tokens) : raw;
    setPreviewVar(cssVar, value);
  });
}

function applyPreviewSettings(settings = previewSettings) {
  const tokens = computePreviewTokens(settings);
  if (!tokens) return;
  currentPreviewTokens = tokens;
  applyPreviewTokenVars(tokens);
  updateSettingsValueDisplays();
  markSettingsPreviewDirty();
}

function savePreviewSettingsSafely() {
  storageSet(STORAGE_KEYS.SETTINGS, previewSettings, {
    serialize: (value) => JSON.stringify(value),
    onErrorMessage: 'Unable to persist preview settings',
  });
}

function loadPreviewSettings() {
  const stored = storageGet(STORAGE_KEYS.SETTINGS, {
    parse: (value) => JSON.parse(value),
    fallback: null,
    onErrorMessage: 'Unable to read preview settings',
  });

  previewSettings = normalizePreviewSettings(stored);
}

function updateSettingsValueDisplays() {
  if (!settingsForm) return;
  const nodes = settingsForm.querySelectorAll('[data-display-for]');
  nodes.forEach((node) => {
    const key = node.getAttribute('data-display-for');
    if (!key) return;
    const text = formatSettingDisplay(key);
    if (text) {
      node.textContent = text;
    }
  });
}

function syncSettingsPreviewMarkup(force = false) {
  if (!settingsPreview) return;
  if (!force && settingsPanel && settingsPanel.hidden) {
    return;
  }
  settingsPreview.innerHTML = SETTINGS_PREVIEW_SNIPPET.trim();
  settingsPreview.scrollTop = 0;
  const codeBlocks = settingsPreview.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    hljs.highlightElement(block);
    decorateCodeBlock(block);
  });
}

function markSettingsPreviewDirty() {
  syncSettingsPreviewMarkup();
}

function preventSandboxCheckboxToggle(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
    return;
  }
  if (event.type === 'keydown' && ![' ', 'Spacebar', 'Enter'].includes(event.key)) {
    return;
  }
  event.preventDefault();
}

function populateSettingsForm() {
  if (!settingsForm) return;
  const tokens = getPreviewTokens() || computePreviewTokens(previewSettings);
  const controls = settingsForm.querySelectorAll('[data-setting]');
  controls.forEach((control) => {
    const key = control.getAttribute('data-setting');
    if (!key || !(key in previewSettings)) return;
    const value = previewSettings[key];
    if (control instanceof HTMLInputElement) {
      if (control.type === 'range' || control.type === 'number') {
        control.value = String(value);
      } else if (control.type === 'color') {
        let fallbackColor = '#FF4A2F';
        if (tokens) {
          if (key === 'accentColor') fallbackColor = tokens.accent;
          if (key === 'backgroundColor') fallbackColor = tokens.background;
          if (key === 'textColor') fallbackColor = tokens.text;
        }
        control.value = normalizeColorInputValue(value || fallbackColor, fallbackColor);
      } else {
        control.value = String(value);
      }
    } else if (control instanceof HTMLSelectElement) {
      control.value = String(value);
    }
  });
  updateSettingsValueDisplays();
}

function updateSettingValue(key, rawValue) {
  switch (key) {
    case 'fontFamily':
      if (!VALID_FONT_KEYS.has(rawValue)) return false;
      if (previewSettings.fontFamily === rawValue) return false;
      previewSettings.fontFamily = rawValue;
      return true;
    case 'headingFont':
      if (!VALID_HEADING_KEYS.has(rawValue)) return false;
      if (previewSettings.headingFont === rawValue) return false;
      previewSettings.headingFont = rawValue;
      return true;
    case 'headingWeight': {
      const next = String(rawValue);
      if (!VALID_HEADING_WEIGHTS.has(next) || previewSettings.headingWeight === next) return false;
      previewSettings.headingWeight = next;
      return true;
    }
    case 'codeTheme':
      if (!VALID_CODE_THEMES.has(rawValue) || previewSettings.codeTheme === rawValue) return false;
      previewSettings.codeTheme = rawValue;
      return true;
    case 'textScale': {
      const next = clampNumber(rawValue, 0.9, 1.2, previewSettings.textScale);
      if (previewSettings.textScale === next) return false;
      previewSettings.textScale = next;
      return true;
    }
    case 'lineHeight': {
      const next =
        Math.round(clampNumber(rawValue, 1.4, 2, previewSettings.lineHeight) * 100) / 100;
      if (previewSettings.lineHeight === next) return false;
      previewSettings.lineHeight = next;
      return true;
    }
    case 'contentWidth': {
      const next = Math.round(clampNumber(rawValue, 60, 90, previewSettings.contentWidth));
      if (previewSettings.contentWidth === next) return false;
      previewSettings.contentWidth = next;
      return true;
    }
    case 'paragraphSpacing': {
      const next =
        Math.round(clampNumber(rawValue, 0.8, 1.6, previewSettings.paragraphSpacing) * 100) / 100;
      if (previewSettings.paragraphSpacing === next) return false;
      previewSettings.paragraphSpacing = next;
      return true;
    }
    case 'accentColor': {
      const next = sanitizeColorValue(rawValue);
      if (previewSettings.accentColor === next) return false;
      previewSettings.accentColor = next;
      return true;
    }
    case 'backgroundColor': {
      const next = sanitizeColorValue(rawValue);
      if (previewSettings.backgroundColor === next) return false;
      previewSettings.backgroundColor = next;
      return true;
    }
    case 'textColor': {
      const next = sanitizeColorValue(rawValue);
      if (previewSettings.textColor === next) return false;
      previewSettings.textColor = next;
      return true;
    }
    default:
      return false;
  }
}

function handleSettingsInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
    return;
  }
  const key = target.dataset.setting;
  if (!key || !(key in previewSettings)) return;
  const rawValue = target.type === 'color' ? target.value : target.value;
  const changed = updateSettingValue(key, rawValue);
  if (!changed) {
    updateSettingsValueDisplays();
    return;
  }
  savePreviewSettingsSafely();
  applyPreviewSettings(previewSettings);
  updateSettingsValueDisplays();
}

function resetSingleSetting(key) {
  if (!(key in previewSettings)) return;
  previewSettings[key] = DEFAULT_SETTINGS[key];
  savePreviewSettingsSafely();
  applyPreviewSettings(previewSettings);
  populateSettingsForm();
  syncSettingsPreviewMarkup(true);
}

function restoreDefaultSettings() {
  previewSettings = { ...DEFAULT_SETTINGS };
  savePreviewSettingsSafely();
  applyPreviewSettings(previewSettings);
  populateSettingsForm();
  syncSettingsPreviewMarkup(true);
}

function handleSettingsKeydown(event) {
  if (!settingsPanel || settingsPanel.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSettingsPanel();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = settingsPanel.querySelectorAll(SETTINGS_FOCUSABLE_SELECTOR);
  if (!focusable.length) return;
  const focusables = Array.from(focusable).filter((element) => !element.hasAttribute('disabled'));
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey) {
    if (active === first || !settingsPanel.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }
  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

function openSettingsPanel() {
  if (!settingsPanel) return;
  if (!settingsPanel.hidden && settingsPanel.classList.contains('is-visible')) return;
  populateSettingsForm();
  syncSettingsPreviewMarkup(true);
  lastFocusedSettingsTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  settingsPanel.hidden = false;
  requestAnimationFrame(() => {
    settingsPanel.classList.add('is-visible');
  });
  document.body.classList.add('is-settings-open');
  if (btnOpenSettings) {
    btnOpenSettings.setAttribute('aria-expanded', 'true');
  }
  document.addEventListener('keydown', handleSettingsKeydown);
  const firstControl = settingsPanel.querySelector('[data-setting]');
  const focusTarget =
    firstControl instanceof HTMLElement
      ? firstControl
      : btnCloseSettings instanceof HTMLElement
      ? btnCloseSettings
      : null;
  if (focusTarget) {
    setTimeout(() => focusTarget.focus(), 30);
  }
}

function closeSettingsPanel() {
  if (!settingsPanel || settingsPanel.hidden) return;
  settingsPanel.classList.remove('is-visible');
  document.body.classList.remove('is-settings-open');
  if (btnOpenSettings) {
    btnOpenSettings.setAttribute('aria-expanded', 'false');
  }
  document.removeEventListener('keydown', handleSettingsKeydown);
  setTimeout(() => {
    if (!settingsPanel.classList.contains('is-visible')) {
      settingsPanel.hidden = true;
    }
  }, SETTINGS_TRANSITION_DURATION);
  if (lastFocusedSettingsTrigger && typeof lastFocusedSettingsTrigger.focus === 'function') {
    lastFocusedSettingsTrigger.focus();
  }
}

function initializeSettingsUI() {
  if (btnOpenSettings) {
    btnOpenSettings.setAttribute('aria-haspopup', 'dialog');
    btnOpenSettings.setAttribute('aria-expanded', 'false');
    btnOpenSettings.addEventListener('click', openSettingsPanel);
  }
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', closeSettingsPanel);
  }
  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', closeSettingsPanel);
  }
  if (settingsForm) {
    settingsForm.addEventListener('input', handleSettingsInput);
    settingsForm.addEventListener('change', handleSettingsInput);
    const resetButtons = settingsForm.querySelectorAll('[data-settings-reset]');
    resetButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-settings-reset');
        if (!key) return;
        resetSingleSetting(key);
      });
    });
  }
  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', restoreDefaultSettings);
  }
  syncSettingsPreviewMarkup(true);
  if (settingsPreview) {
    settingsPreview.addEventListener('click', preventSandboxCheckboxToggle);
    settingsPreview.addEventListener('keydown', preventSandboxCheckboxToggle);
  }
}

function generateExportCss(tokens, target = 'fragment') {
  const fontScale = tokens.fontScale || 1;
  const lines = [];
  const isDocTarget = target === 'document';
  if (isDocTarget) {
    lines.push(
      `body { margin: 0; padding: 0; font-family: ${tokens.fontSans}; color: ${tokens.text}; line-height: ${tokens.lineHeight}; }`
    );
  }

  const surfaceBackgroundLine = isDocTarget ? '' : `  background: ${tokens.background};\n`;
  lines.push(
    `.dotfun-markdown {
  font-family: ${tokens.fontSans};
  color: ${tokens.text};
${surfaceBackgroundLine}  line-height: ${tokens.lineHeight};
  letter-spacing: 0.01em;
  max-width: ${tokens.contentWidth};
  margin: 0 auto;
  padding: 0;
}
.dotfun-markdown > *:first-child {
  margin-top: 0;
}
.dotfun-markdown > * {
  max-width: ${tokens.contentWidth};
  margin-left: auto;
  margin-right: auto;
}
.dotfun-markdown h1,
.dotfun-markdown h2,
.dotfun-markdown h3,
.dotfun-markdown h4,
.dotfun-markdown h5,
.dotfun-markdown h6 {
  font-family: ${tokens.headingFont};
  font-weight: ${tokens.headingWeight};
  line-height: 1.2;
  margin: calc(2rem * ${fontScale}) 0 calc(1rem * ${fontScale});
}
.dotfun-markdown h1 {
  font-size: calc(clamp(2rem, 4vw, 2.6rem) * ${fontScale});
  letter-spacing: -0.012em;
}
.dotfun-markdown h2 {
  font-size: calc(clamp(1.7rem, 3.4vw, 2.2rem) * ${fontScale});
}
.dotfun-markdown h3 {
  font-size: calc(clamp(1.4rem, 2.8vw, 1.8rem) * ${fontScale});
}
.dotfun-markdown p,
.dotfun-markdown ul,
.dotfun-markdown ol {
  font-size: calc(1.05rem * ${fontScale});
}
.dotfun-markdown p {
  margin: calc(${tokens.paragraphSpacing} * ${fontScale}) 0;
}
.dotfun-markdown ul,
.dotfun-markdown ol {
  margin: calc(1.2rem * ${fontScale}) 0 calc(1.2rem * ${fontScale}) 1.6rem;
  padding-left: 1.2rem;
}
.dotfun-markdown blockquote {
  margin: calc(1.8rem * ${fontScale}) 0;
  padding: 1rem 1.5rem;
  border-left: 4px solid ${tokens.accent};
  background: ${tokens.accentSoft};
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  font-style: italic;
}
.dotfun-markdown blockquote p {
  margin: 0;
}
.dotfun-markdown input[type='checkbox'] {
  appearance: none;
  width: 18px;
  height: 18px;
  margin-right: 0.6rem;
  border: 2px solid ${tokens.checkboxBorder};
  border-radius: 6px;
  display: inline-grid;
  place-content: center;
  vertical-align: middle;
  background: ${tokens.background};
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.dotfun-markdown input[type='checkbox']:hover {
  border-color: ${tokens.accent};
}
.dotfun-markdown input[type='checkbox']:checked {
  background: ${tokens.accent};
  border-color: ${tokens.accent};
  box-shadow: 0 6px 14px ${tokens.accentShadow};
}
.dotfun-markdown input[type='checkbox']:checked::after {
  content: '✓';
  color: #fffdf8;
  font-size: 0.7rem;
  font-weight: 700;
}
.dotfun-markdown code {
  font-family: ${tokens.monoFont};
  font-size: calc(0.95rem * ${fontScale});
  background: ${tokens.codeInlineBg};
  color: ${tokens.codeInlineColor};
  padding: 0.2em 0.45em;
  border-radius: 6px;
}
.dotfun-markdown pre {
  margin: calc(1.8rem * ${fontScale}) 0;
  padding: 1.5rem;
  padding-top: 2.6rem;
  background: ${tokens.codeBlockBg};
  border: 1px solid ${tokens.codeBlockBorder};
  border-radius: 16px;
  overflow-x: auto;
  font-family: ${tokens.monoFont};
  font-size: calc(0.95rem * ${fontScale});
  line-height: 1.6;
  position: relative;
}
.dotfun-markdown pre code {
  background: none;
  padding: 0;
  display: block;
}
.dotfun-markdown pre[data-lang]::before {
  content: attr(data-lang);
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  padding: 0.3rem 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  background: ${tokens.codeBadgeBg};
  color: ${tokens.codeBadgeText};
  font-family: ${tokens.headingFont};
}
.dotfun-markdown pre code.hljs {
  color: ${tokens.codeBlockText};
}
.dotfun-markdown .hljs-comment,
.dotfun-markdown .hljs-quote {
  color: ${tokens.hlComment};
  font-style: italic;
}
.dotfun-markdown .hljs-keyword,
.dotfun-markdown .hljs-selector-tag,
.dotfun-markdown .hljs-literal,
.dotfun-markdown .hljs-section,
.dotfun-markdown .hljs-link {
  color: ${tokens.hlKeyword};
  font-weight: 600;
}
.dotfun-markdown .hljs-string,
.dotfun-markdown .hljs-template-variable,
.dotfun-markdown .hljs-addition {
  color: ${tokens.hlString};
}
.dotfun-markdown .hljs-number,
.dotfun-markdown .hljs-attr,
.dotfun-markdown .hljs-attribute,
.dotfun-markdown .hljs-symbol,
.dotfun-markdown .hljs-built_in,
.dotfun-markdown .hljs-bullet {
  color: ${tokens.hlNumber};
}
.dotfun-markdown .hljs-title,
.dotfun-markdown .hljs-name,
.dotfun-markdown .hljs-type,
.dotfun-markdown .hljs-selector-id,
.dotfun-markdown .hljs-selector-class,
.dotfun-markdown .hljs-meta,
.dotfun-markdown .hljs-doctag,
.dotfun-markdown .hljs-template-tag {
  color: ${tokens.hlTitle};
}
.dotfun-markdown a {
  color: ${tokens.accent};
  text-decoration: none;
  font-weight: 600;
}
.dotfun-markdown a:hover,
.dotfun-markdown a:focus {
  text-decoration: underline;
}
.dotfun-markdown .footnote-ref {
  font-size: 0.75em;
  vertical-align: super;
}
.dotfun-markdown .footnote-ref a,
.dotfun-markdown .footnote-backref {
  color: ${tokens.accent};
  text-decoration: none;
  font-weight: 600;
}
.dotfun-markdown .footnote-backref:hover,
.dotfun-markdown .footnote-ref a:hover {
  text-decoration: underline;
}
.dotfun-markdown .footnotes {
  margin-top: 2.5rem;
  font-size: 0.9rem;
  color: ${tokens.muted};
}
.dotfun-markdown .footnotes hr {
  border: none;
  border-top: 1px solid ${tokens.tableBorder};
  margin-bottom: 1.5rem;
}
.dotfun-markdown .footnotes ol {
  margin: 0;
  padding-left: 1.5rem;
  display: grid;
  gap: 0.75rem;
}
.dotfun-markdown table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: calc(1.5rem * ${fontScale}) 0;
  font-size: calc(0.95rem * ${fontScale});
  border: 1px solid ${tokens.tableBorder};
  border-radius: 16px;
  overflow: hidden;
  background: ${tokens.background};
}
.dotfun-markdown th,
.dotfun-markdown td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-right: 1px solid ${tokens.tableBorder};
  border-bottom: 1px solid ${tokens.tableBorder};
}
.dotfun-markdown th:last-child,
.dotfun-markdown td:last-child {
  border-right: none;
}
.dotfun-markdown tbody tr:last-child td {
  border-bottom: none;
}
.dotfun-markdown table thead {
  background: ${tokens.tableHeaderBg};
}
.dotfun-markdown table tbody tr:nth-child(even) {
  background: ${tokens.tableRowEven};
}
.dotfun-markdown img {
  max-width: 100%;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}
.dotfun-markdown .export-attribution {
  margin-top: calc(2.5rem * ${fontScale});
  padding-top: 1.5rem;
  border-top: 1px solid ${tokens.tableBorder};
  font-size: 0.92rem;
  color: ${tokens.muted};
}
.dotfun-markdown .export-attribution a {
  color: ${tokens.accent};
  font-weight: 600;
  text-decoration: none;
}
.dotfun-markdown .export-attribution a:hover {
  text-decoration: underline;
}`
  );

  return lines.join('\n\n');
}

function generateExportPayload(target = 'fragment') {
  const tokens = getPreviewTokens() || computePreviewTokens(previewSettings);
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
  checkboxes.forEach((checkbox, index) => {
    const task = currentTaskItems[index];
    checkbox.removeAttribute('disabled');
    if (!task) return;
    checkbox.dataset.taskIndex = String(index);
    checkbox.checked = task.checked;
  });
}

function updatePreview(markdown) {
  currentTaskItems = extractTaskItems(markdown);
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
  storageSet(STORAGE_KEYS.CONTENT, markdown, {
    onErrorMessage: 'Unable to persist markdown content',
  });
}

function hydrateEditor() {
  const saved = storageGet(STORAGE_KEYS.CONTENT, {
    fallback: null,
    onErrorMessage: 'Unable to read saved markdown',
  });
  const initial = typeof saved === 'string' && saved ? saved : sampleDoc;
  editor.value = initial;
  updatePreview(initial);
  updateStats(initial);
}

function setTheme(nextTheme) {
  const theme = nextTheme === 'dark' ? 'dark' : 'light';
  appRoot.dataset.theme = theme;
  document.body.dataset.theme = theme;
  themeIndicator.textContent = theme === 'dark' ? 'Dark' : 'Light';
  storageSet(STORAGE_KEYS.THEME, theme, {
    onErrorMessage: 'Unable to persist theme preference',
  });
  applyPreviewSettings(previewSettings);
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
  const task = currentTaskItems[index];
  if (!task) return;
  const original = editor.value;
  const before = original.slice(0, task.start);
  const after = original.slice(task.end);
  const updatedLine = task.text.replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
  const nextValue = before + updatedLine + after;
  const cursorStart = editor.selectionStart;
  const cursorEnd = editor.selectionEnd;
  isPreviewSyncing = true;
  editor.value = nextValue;
  editor.setSelectionRange(cursorStart, cursorEnd);
  editor.dispatchEvent(new Event('input'));
  isPreviewSyncing = false;
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
  const stored = storageGet(STORAGE_KEYS.THEME, {
    fallback: null,
    onErrorMessage: 'Unable to read stored theme',
  });
  let theme = typeof stored === 'string' && stored ? stored : null;
  if (!theme) {
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  setTheme(theme);
}

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
  // Reset input to allow re-importing the same file consecutively
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

function flashMessage(target, message) {
  const original = target.textContent;
  target.textContent = message;
  target.classList.add('is-active');
  setTimeout(() => {
    target.textContent = original;
    target.classList.remove('is-active');
  }, 1400);
}

loadPreviewSettings();
hydrateTheme();
applyPreviewSettings(previewSettings);
hydrateEditor();
initializeSettingsUI();

// Respond to OS theme changes dynamically
const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemTheme = (event) => {
  const stored = storageGet(STORAGE_KEYS.THEME, { fallback: null });
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

// Bookmark toast notification
const bookmarkCallout = document.getElementById('bookmark-callout');
const dismissBookmark = document.getElementById('dismiss-bookmark');

// Timer in milliseconds (60000 = 1 minute)
const BOOKMARK_TOAST_DELAY = 60000;

function showBookmarkToast() {
  const dismissed = storageGet(STORAGE_KEYS.BOOKMARK_DISMISSED, {
    fallback: 'false',
    onErrorMessage: 'Unable to check bookmark toast state',
  });
  if (dismissed === 'true') {
    return;
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

  storageSet(STORAGE_KEYS.BOOKMARK_DISMISSED, 'true', {
    onErrorMessage: 'Unable to save bookmark toast state',
  });

  setTimeout(() => {
    bookmarkCallout.classList.add('is-hidden');
  }, 400);
}

if (dismissBookmark) {
  dismissBookmark.addEventListener('click', hideBookmarkToast);
}

// Initialize bookmark toast
showBookmarkToast();
