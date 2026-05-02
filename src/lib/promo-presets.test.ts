import { describe, it, expect } from 'vitest';
import {
  PROMO_PRESETS,
  PRESET_CONTENT_KEYS,
  getPromoPreset,
  applyPresetContent,
  type PromoPreset,
} from './promo-presets';
import { DEFAULT_PROMO_POPUP } from '@/hooks/usePromotionalPopup';

// ── Preset catalog locks ──
//
// These tests guard the contract documented in the file header:
//   - Presets only set content/offer fields (no enabled, no targeting, no schedule).
//   - Applying a preset preserves every field the preset doesn't own.
//   - Keys + labels are unique (no silent dupes in the picker).
//
// Adding a new preset? Add a row to PROMO_PRESETS and the assertions below
// will validate it for free.

describe('PROMO_PRESETS catalog', () => {
  it('has at least 6 archetypes', () => {
    expect(PROMO_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it('uses unique keys', () => {
    const keys = PROMO_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses unique labels', () => {
    const labels = PROMO_PRESETS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each(PROMO_PRESETS)('preset $key — only writes whitelisted content keys', (preset: PromoPreset) => {
    const writtenKeys = Object.keys(preset.content);
    for (const k of writtenKeys) {
      expect(PRESET_CONTENT_KEYS).toContain(k as (typeof PRESET_CONTENT_KEYS)[number]);
    }
  });

  it.each(PROMO_PRESETS)('preset $key — never sets `enabled` (would silently auto-publish)', (preset) => {
    expect((preset.content as Record<string, unknown>).enabled).toBeUndefined();
  });

  it.each(PROMO_PRESETS)('preset $key — never sets targeting/schedule (operator owns these)', (preset) => {
    const forbidden = ['appearance', 'trigger', 'triggerValueMs', 'showOn', 'audience', 'startsAt', 'endsAt', 'frequency', 'accentColor', 'imageUrl'];
    for (const f of forbidden) {
      expect((preset.content as Record<string, unknown>)[f]).toBeUndefined();
    }
  });

  it.each(PROMO_PRESETS)('preset $key — has a non-empty rationale', (preset) => {
    expect(preset.rationale.trim().length).toBeGreaterThan(0);
  });
});

describe('getPromoPreset', () => {
  it('returns the matching preset', () => {
    expect(getPromoPreset('new-client-discount')?.label).toBe('New Client Welcome');
  });

  it('returns null for unknown keys (silence is valid)', () => {
    expect(getPromoPreset('does-not-exist')).toBeNull();
  });
});

describe('applyPresetContent', () => {
  it('merges preset content over current form data', () => {
    const preset = PROMO_PRESETS[0];
    const result = applyPresetContent(DEFAULT_PROMO_POPUP, preset);
    expect(result.headline).toBe(preset.content.headline);
    expect(result.offerCode).toBe(preset.content.offerCode);
  });

  it('preserves every operator-owned field', () => {
    const current = {
      ...DEFAULT_PROMO_POPUP,
      enabled: true,
      appearance: 'corner-card' as const,
      showOn: ['booking'] as Parameters<typeof applyPresetContent>[0]['showOn'],
      audience: 'new-visitors-only' as const,
      frequency: 'daily' as const,
      accentColor: '#FF0000',
      imageUrl: 'https://example.com/x.jpg',
    };
    const preset = PROMO_PRESETS[0];
    const result = applyPresetContent(
      current as Parameters<typeof applyPresetContent>[0],
      preset,
    );
    expect(result.enabled).toBe(true);
    expect(result.appearance).toBe('corner-card');
    expect(result.showOn).toEqual(['booking']);
    expect(result.audience).toBe('new-visitors-only');
    expect(result.frequency).toBe('daily');
    expect(result.accentColor).toBe('#FF0000');
    expect(result.imageUrl).toBe('https://example.com/x.jpg');
  });
});
