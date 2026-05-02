## Diagnosis: what "behavior is unchanged" actually means

The user toggles Rotator Mode → Background-Only and the live hero in the preview iframe **looks and feels identical** to Multi-Slide. The code path that should differ (`HeroSlideRotator.tsx`) does branch on `rotator_mode`, but three concrete bugs make the differentiation invisible to the operator:

### Bug 1 — Shared content is empty on first switch (the headache the user is feeling)

When a salon has only ever used Multi-Slide mode, all the headline/subheadline/CTA copy lives **per-slide** at `slides[N].headline_text`. The section-level fields `config.headline_text`, `config.cta_new_client`, etc. are empty (the migration in `migrateLegacyToFirstSlide` runs only when there are zero slides, never when slides already exist).

When the user flips to Background-Only, `HeroSlideRotator` (lines 95–125) overwrites the active slide's foreground with **section-level fields that are empty strings**. Result: the headline, subheadline and buttons either go blank or fall through to placeholders. The operator reads this as "switching modes broke my hero" and toggles back — and from a quick glance the live preview looks the same because Drop Dead's master headline is still partially populated at the section level from older config.

### Bug 2 — The mode change is too subtle on the live site

In Background-Only mode the foreground IS held stable (`key='fg-shared'` keeps AnimatePresence from re-mounting it across `activeIndex` changes), but the ONLY visible behavior difference is "the headline doesn't crossfade." With matching headlines copied across slides the user can't see that the foreground stopped re-animating — it just looks like a normal rotator.

We need a clearer, more honest visual signal that BG-only is doing something distinct: the pagination/arrow strip needs to relabel as **Backgrounds** (not Slides), the dots should reflect background count, and aria labels need to follow.

### Bug 3 — Master slide's own background is silently part of the rotation

The data model treats `slides[0]` as both "master copy owner" AND "BG 1." In the editor the gallery shows BG 2, BG 3… (the slice from index 1), but the live rotator iterates the full array. When the user picks just one rotating background (BG 2), they see master's BG and BG 2 alternating — which is correct, but the editor never shows them BG 1 as a tile, so they don't realize their master image is also rotating. This isn't a bug per se, but it's the third reason BG-only feels "the same as Multi-Slide" — both modes rotate the same set of background sources.

---

## Plan

### 1. Seed shared content from the master slide on first switch (HeroEditor.tsx)

When the user flips `rotator_mode` to `background_only`, lift the master slide's copy fields up to section-level **only if the section-level fields are empty**. Idempotent: a second toggle never overwrites operator edits. This closes Bug 1 — the operator sees their existing headline immediately, and the Shared Hero Content card is pre-populated.

```text
multi_slide → background_only (one-time per field):
  config.headline_text          ←  config.headline_text       || slides[0].headline_text
  config.subheadline_line1      ←  config.subheadline_line1   || slides[0].subheadline_line1
  config.subheadline_line2      ←  config.subheadline_line2   || slides[0].subheadline_line2
  config.eyebrow                ←  config.eyebrow             || slides[0].eyebrow
  config.show_eyebrow           ←  config.show_eyebrow        ?? slides[0].show_eyebrow
  config.cta_new_client(_url)   ←  per the same rule
  config.cta_returning_client…  ←  per the same rule
  config.show_secondary_button  ←  ?? slides[0].show_secondary_button
```

Implementation: wrap the current `updateField('rotator_mode', ...)` call site in a small handler that runs the seed logic before the state update. Per-slide copy is intentionally preserved so toggling back to Multi-Slide restores everything.

### 2. Harden the foreground decoupling (HeroSlideRotator.tsx)

Two small fixes that make BG-only behavior unambiguous:

**a. Foreground source short-circuit.** In BG-only mode the `slide` derivation currently still spreads `rawSlide` then overrides foreground fields. If a non-master slide's `text_colors` override exists, it'll bleed into the shared foreground. Replace with: in BG-only mode, the foreground always reads from the master slide (`slides[0]`) merged with section overrides — never from `slides[activeIndex]`. The active slide is consulted ONLY for background fields (url/poster/type/focal/fit/overlay/scrim/media_width).

**b. Suppress the foreground re-mount even more aggressively.** Today `key='fg-shared'` is correct, but the surrounding `<AnimatePresence mode="wait" initial={false}>` still wraps it. Mode-aware: in BG-only render the foreground OUTSIDE AnimatePresence entirely so framer-motion can never trigger an exit/enter on it. This makes the difference between modes visually obvious — backgrounds crossfade behind a stationary foreground.

### 3. Relabel pagination as Backgrounds in BG-only mode (HeroSlideRotator.tsx)

In the bottom-left pagination strip:
- aria-label "Previous slide" → "Previous background" (BG-only)
- aria-label "Go to slide N" → "Go to background N"
- aria-label "Next slide" → "Next background"
- Visible dot count is unchanged (still one per slide), but the meaning is now consistent with the editor's "Rotating Backgrounds" terminology.

This is the visible signal that the rotator now thinks in backgrounds, not slides. No layout change.

### 4. Add a regression test (HeroSlideRotator.test.tsx)

Extend the existing test file with two cases:
- BG-only mode: foreground text remains stable across `activeIndex` changes (assert headline `data-testid` does not unmount/remount across simulated rotation).
- BG-only mode with empty section-level headline: foreground falls back to master slide copy (validates that the seed step in HeroEditor is the only seed point, and the rotator itself doesn't silently fill from slide 0 when section is empty — it should render whatever section has).

### Files touched

- `src/components/dashboard/website-editor/HeroEditor.tsx` — wrap rotator_mode change with seed logic
- `src/components/home/HeroSlideRotator.tsx` — foreground source short-circuit + AnimatePresence skip + pagination labels
- `src/components/home/HeroSlideRotator.test.tsx` — two new cases

### Out of scope

- Renaming the data model (`slides` → `backgrounds`) — back-compat work for what is essentially terminology. Can be done later as a doctrine task.
- Hiding BG 1 from the gallery (master's own background) — would require splitting master's BG out as a section-level field. Larger change; address only if the user reports it after these fixes ship.
- Deferral Register entry for the rename: revisit when a third mode arrives or when the gallery starts showing master's BG as a tile.
