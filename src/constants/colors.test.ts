import { describe, expect, it } from 'vitest';
import { THEMES } from './colors';

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map(offset => {
    const srgb = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Theme color tokens WCAG 2.2 AA contrast', () => {
  it('enforces >= 4.5:1 contrast for primary, muted, dim, and onPrimary text across all 4 themes', () => {
    for (const [themeKey, t] of Object.entries(THEMES)) {
      expect(contrastRatio(t.text, t.background), `${themeKey} text/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.text, t.card), `${themeKey} text/card`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textMuted, t.background), `${themeKey} textMuted/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textMuted, t.surfaceMuted), `${themeKey} textMuted/surfaceMuted`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textDim, t.background), `${themeKey} textDim/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textDim, t.card), `${themeKey} textDim/card`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.textDim, t.surfaceMuted), `${themeKey} textDim/surfaceMuted`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.primary, t.card), `${themeKey} primary/card`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.primary, t.primaryLight), `${themeKey} primary/primaryLight`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.onPrimary, t.primary), `${themeKey} onPrimary/primary`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses layered dark charcoal instead of pure #000000 for Midnight dark mode', () => {
    expect(THEMES.midnight.isDark).toBe(true);
    expect(THEMES.midnight.background.toLowerCase()).not.toBe('#000000');
    expect(THEMES.midnight.surface.toLowerCase()).not.toBe('#000000');
    expect(THEMES.midnight.card.toLowerCase()).not.toBe('#000000');
  });
});
