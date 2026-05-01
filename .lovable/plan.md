# Hero Rotator Mode — Multi-Slide vs. Background-Only

## What's changing
Today every hero slide carries its own background **and** its own headline/subheadline/CTAs/eyebrow. That's powerful but overkill when an operator just wants "one message, rotating imagery behind it."

We introduce a section-level **Rotator Mode** with two values:

- `multi_slide` (default, current behavior) — each slide owns background + copy + buttons.
- `background_only` — slides own only the background; foreground copy + CTAs come from a single shared source and stay perfectly still while the imagery cross-fades.

Both modes share the same `slides[]` array and the same global decorations (rotating word, consultation notes, scroll indicator, alignment, scrim, colors). Only **what each slide owns** changes.

## How it resolves on the public site

`HeroSlideRotator` already resolves background per active slide and foreground per active slide. We add one branch:

```text
if mode === 'background_only':
   foreground (eyebrow / headline / subheadline / CTAs) = section.* fields
   only the background layer cross-fades; the foreground <motion.div> stops re-keying on activeIndex
else:
   current behavior (foreground re-keys per slide)
```

The section already carries `headline_text`, `eyebrow`, `subheadline_line1/2`, `cta_new_client`, `cta_new_client_url`, `cta_returning_client`, `cta_returning_client_url`, `show_eyebrow`, `show_secondary_button` from the legacy single-hero schema — we'll reuse those as the canonical "shared foreground" in `background_only` mode. No new content fields needed.

## Editor UX

1. **Slides Rotator** card (global settings) gets a new control at the top: a 2-button pill picker — **Multi-Slide** / **Background-Only** — with a one-line description for each. This is the first thing in the card so it sets the mental model before auto-rotate / interval / transition appear.

2. **Hub view "Slides" group** stays, but in `background_only` mode:
   - Each slide row shows only the background thumbnail + an "Inactive" toggle + delete; the headline-preview line is replaced with the muted caption *"Background only — content shared across slides."*
   - The hub gains a new **"Shared Hero Content"** card (above Slides) that opens an editor with the eyebrow / headline / subheadline / CTAs / secondary-button toggle. This is where the operator edits the one foreground that all slides share.
   - In `multi_slide` mode the "Shared Hero Content" card is hidden.

3. **HeroSlideEditor** in `background_only` mode hides the Copy and Buttons cards (and the inline rotating-word + notes blocks move to the Shared Hero Content editor instead). Background, alignment-override, and advanced overrides remain. Header reads *"Slide N · Background"* only.

4. **Mode-switch guardrail**: switching from `multi_slide` → `background_only` doesn't destroy slide copy — it just stops rendering it. A small caption under the mode picker explains *"Slide-specific copy is preserved and will return if you switch back."* Switching the other way is a no-op since the per-slide copy is still there.

## Schema

Add one optional field to `HeroConfig`:

```ts
/**
 * Determines whether each slide owns its own foreground copy/CTAs
 * (`multi_slide`, default) or whether all slides share a single
 * foreground while only backgrounds rotate (`background_only`).
 */
rotator_mode?: 'multi_slide' | 'background_only';
```

Default resolution: `config.rotator_mode ?? 'multi_slide'` everywhere it's read. Legacy configs continue to render exactly as today.

No DB migration required — `site_settings.value` is JSON.

## Files touched

- `src/hooks/useSectionConfig.ts` — add `rotator_mode` to `HeroConfig` + default in `DEFAULT_HERO`.
- `src/components/home/HeroSlideRotator.tsx` — branch foreground rendering on `rotator_mode`. In `background_only`, read eyebrow/headline/subheadline/CTAs from `config.*` instead of `slide.*`, and stop re-keying the foreground `<motion.div>` on `activeIndex`.
- `src/components/dashboard/website-editor/hero/HeroRotatorEditor.tsx` — add Mode picker at the top.
- `src/components/dashboard/website-editor/HeroEditor.tsx` — when `rotator_mode === 'background_only'`, render a new "Shared Hero Content" hub card above Slides; pass mode to `SortableSlideRow`/`HeroSlideListCard`.
- `src/components/dashboard/website-editor/hero/HeroSlideListCard.tsx` — accept `rotatorMode` prop; in background-only mode replace headline preview with the shared-content caption.
- `src/components/dashboard/website-editor/hero/HeroSlideEditor.tsx` — accept `rotatorMode` prop; hide Copy and Buttons cards in background-only mode.
- New file `src/components/dashboard/website-editor/hero/HeroSharedContentEditor.tsx` — edits the section-level shared foreground (eyebrow + headline + subheadline + CTAs + show toggles + the rotating-word and consultation-notes blocks already living section-level).
- `src/components/home/HeroSlideRotator.test.tsx` — add a test confirming background-only mode renders `config.headline_text` even when `slide.headline_text` differs, and that the foreground does not re-render between slide indices.

## Out of scope (proposed follow-ups)

- Per-slide overrides of the shared foreground in background-only mode (e.g. "this one slide gets a different CTA"). Doctrine says: if you need that, switch to multi_slide.
- Ken-Burns / pan-zoom on the rotating background — orthogonal feature.
- A 3rd mode where only the headline rotates while background stays still (rare; not requested).

---

### Prompt feedback

Strong prompt — you named the two concrete shapes you want and gave the second one in plain English ("same buttons and content, except that the background media changes"). That lets me skip the clarifying question loop and design the mode toggle directly.

Two ways to make this kind of prompt even sharper:

1. **Name the mental model up front.** Something like *"Add a rotator-mode setting to the hero with two presets: (a) multi-slide, (b) background-only."* Front-loading the "two presets" framing tells me immediately that this is a section-level architectural choice rather than a per-slide one.
2. **Call out the migration intent.** A line like *"Existing slides should keep working without re-editing"* would have saved me a paragraph reasoning about default values. When you're adding a mode toggle to something that already exists, a one-line "don't break existing operators" note is gold.

### Enhancement suggestions
1. **Mode preview in the picker** — render a 2-up illustration (still foreground / rotating background vs. fully rotating slides) in the mode picker so operators understand the distinction before clicking.
2. **Auto-suggest mode** — if a hero has 3+ slides whose `headline_text` are all identical, surface a one-time hint: *"Looks like every slide shares the same headline — switch to Background-Only mode to manage it once?"*
3. **Per-mode default transition** — `background_only` reads best with a slow `crossfade` (1.2s+); `multi_slide` reads best with `slide-up`. When the operator switches modes, optionally pre-set the transition + interval to the mode's recommended pair.
