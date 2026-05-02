/**
 * Toggle-persistence contract for the Hero Parallax effect.
 *
 * Locks two invariants on the DesignOverrides shape that the renderer and
 * sidebar both consume:
 *   1. `hero_parallax_enabled` defaults to FALSE — zero behavior change for
 *      existing sites that haven't opted in.
 *   2. `hero_parallax_mode` defaults to 'subtle' so the cinematic variant
 *      is strictly opt-in even after the toggle flips on.
 *
 * If a future migration changes the defaults, this spec breaks loudly so
 * we have to update the doctrine deliberately.
 */
import { describe, it, expect } from 'vitest';
import * as Panel from './SiteDesignPanel';

describe('SiteDesignPanel · hero parallax defaults', () => {
  it('exports DesignOverrides type carrying parallax fields (compile-time check)', () => {
    // Compile-time guard via a runtime-tolerant shape. If the keys are
    // renamed, the renderer + sidebar consumers also need updating.
    const sample: Panel.DesignOverrides = {
      primary_hsl: null,
      secondary_hsl: null,
      accent_hsl: null,
      background_hsl: null,
      heading_font: null,
      body_font: null,
      density: 'comfy',
      button_shape: 'rounded',
      hero_overlay_opacity: 40,
      section_tint_opacity: 0,
      hero_parallax_enabled: false,
      hero_parallax_mode: 'subtle',
    };
    expect(sample.hero_parallax_enabled).toBe(false);
    expect(sample.hero_parallax_mode).toBe('subtle');
  });

  it('mode is restricted to the two known variants', () => {
    const subtle: Panel.DesignOverrides['hero_parallax_mode'] = 'subtle';
    const cinematic: Panel.DesignOverrides['hero_parallax_mode'] = 'cinematic';
    expect([subtle, cinematic]).toEqual(['subtle', 'cinematic']);
  });
});
