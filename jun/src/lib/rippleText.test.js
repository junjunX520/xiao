import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getRippleTextLayout } from './rippleText.js';

describe('ripple text layout', () => {
  it('keeps three title lines inside the available stage', () => {
    const layout = getRippleTextLayout(1200, 430, 3);
    const bottom = layout.startY + layout.lineHeight * 2 + layout.fontSize;

    expect(layout.fontSize).toBeGreaterThan(100);
    expect(layout.lineHeight).toBeLessThan(layout.fontSize);
    expect(layout.startY).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(430);
  });

  it('scales down for a narrow mobile title stage', () => {
    const desktop = getRippleTextLayout(1200, 430, 3);
    const mobile = getRippleTextLayout(360, 280, 3);

    expect(mobile.fontSize).toBeLessThan(desktop.fontSize);
    expect(mobile.fontSize).toBeGreaterThan(50);
  });

  it('keeps refraction and glint inside the rendered glyph pixels', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/RippleText.jsx'),
      'utf8',
    );
    const maskIndex = source.indexOf('float textMask');
    const glintIndex = source.indexOf('if (uGlint');

    expect(maskIndex).toBeGreaterThan(-1);
    expect(glintIndex).toBeGreaterThan(-1);
    expect(maskIndex).toBeLessThan(glintIndex);
    expect(source).toMatch(/uGlint\s*\*\s*textMask/);
  });
});
