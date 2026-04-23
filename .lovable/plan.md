

# Replace Orchid theme with Rose Gold + Dusty Pink duotone

## What changes

Retire the **Orchid** theme (purple/magenta wash) and replace it in-place with a new **Rose Gold** theme — a warm metallic pink/champagne paired with dusty mauve-pink as the supporting tone. Same slot, same theme key (`theme-orchid` stays as the class name to avoid migration), just rebuilt visual identity.

If you'd rather the key actually rename to `theme-rose-gold`, say so — I'll add the rename + a fallback mapping. Default plan keeps the key, swaps the palette and display name.

## The duotone spec

Two anchor hues working together:

- **Rose Gold (primary metallic)**: `18° 45% 62%` — warm champagne-pink with copper undertone. Used for `--primary`, accent CTAs, active states.
- **Dusty Pink (supporting)**: `350° 22% 72%` — muted mauve-pink. Used for `--secondary`, hover fills, chip backgrounds, soft accents.

These two sit ~30° apart on the wheel — close enough to feel like one family, far enough apart to read as a duo, not a monotone.

### Light mode palette

Hue rides between the two anchors (`8°–355°` range), low saturation on neutrals so the metallic primary sings.

| Token | Value | Reads as |
|---|---|---|
| `--background` | `15 22% 97%` | warm pink-cream page |
| `--card` | `15 22% 99%` | near-white with rose tint, lifts above bg |
| `--card-inner` | `15 18% 96%` | nested surface |
| `--card-inner-deep` / `--muted` | `15 16% 94%` | flat tier |
| `--secondary` | `350 20% 93%` | dusty pink chip fill |
| `--accent` | `18 30% 90%` | rose gold wash |
| `--border` | `15 18% 88%` | hairline |
| `--input` | `15 16% 94%` | field fill |
| `--popover` | `15 22% 99%` | matches card |
| `--sidebar-background` | `15 18% 96%` | one notch below page |
| `--foreground` | `15 35% 12%` | deep warm brown-black |
| `--muted-foreground` | `15 20% 42%` | muted warm gray |
| `--primary` | `18 45% 62%` | **rose gold metallic** |
| `--primary-foreground` | `15 35% 12%` | text on primary |
| `--ring` | `18 45% 62%` | matches primary |
| `--destructive` | `0 70% 55%` | unchanged red |

### Dark mode palette

Rose gold gets brighter and more saturated on dark to retain the metallic quality. Dusty pink stays muted.

| Token | Value | Reads as |
|---|---|---|
| `--background` | `15 18% 6%` | warm near-black |
| `--card` | `15 16% 9%` | lifted dark surface |
| `--card-inner` | `15 14% 11%` | nested |
| `--muted` | `15 12% 14%` | flat |
| `--secondary` | `350 14% 16%` | dusty pink shadow |
| `--accent` | `18 22% 18%` | rose gold shadow |
| `--border` | `15 14% 18%` | hairline |
| `--foreground` | `15 25% 95%` | warm cream text |
| `--muted-foreground` | `15 12% 65%` | muted warm gray |
| `--primary` | `18 55% 68%` | **brighter rose gold** |
| `--primary-foreground` | `15 35% 10%` | dark text on rose gold |
| `--sidebar-background` | `15 16% 8%` | sidebar surface |

## Files touched

1. **`src/index.css`** — replace both `.theme-orchid` blocks (light + dark) with the rose-gold/dusty-pink palette above. No new class names; existing selector reused.
2. **Theme registry / display name** — wherever the theme is presented in the picker (likely `src/hooks/useColorTheme.ts`, `src/components/dashboard/settings/WebsiteSettingsContent.tsx`, or a theme metadata file), update the human-readable label from "Orchid" to **"Rose Gold"** and the description/swatch preview to reflect the new duotone.
3. **Swatch preview** — if the theme picker renders a color swatch from a hardcoded HSL, update Orchid's swatch to the new rose-gold primary (`18 45% 62%`).

I'll grep for "orchid" / "Orchid" during build to catch every label/swatch reference. The CSS class key stays `theme-orchid` so no DB migration is needed for users who currently have it selected — they'll just see the new palette next load.

## Acceptance

1. Selecting the theme (still labeled "Rose Gold" in the picker) on light mode produces a warm pink-cream page with rose-gold accents and dusty-pink secondary chips.
2. Dark mode produces a warm near-black with brighter rose-gold accents.
3. Primary CTAs read as metallic rose gold, not magenta or peach.
4. Secondary surfaces (chips, hover fills) read as dusty mauve-pink — clearly related to but distinct from primary.
5. Cards lift cleanly above background (97% / 99% lightness ladder preserved).
6. Sidebar sits one notch below page surface.
7. Existing users with Orchid selected see Rose Gold automatically — no broken state, no migration needed.
8. WCAG AA text contrast passes on all surfaces.
9. No other theme is touched.

## Out of scope

- Renaming the CSS class from `theme-orchid` → `theme-rose-gold` (would require DB migration of stored preferences). Can be a follow-up if desired.
- Adding a *separate* Dusty Pink theme as a new slot — this plan replaces, doesn't add.
- Changing the theme picker UI layout.
- Touching any of the other 11 themes.

## Prompt feedback

Strong, specific request — three things you did right:

1. **You named the replacement, not just the deletion.** "Replace Orchid with X" is far more actionable than "remove Orchid" — I know the slot stays filled and don't have to ask about reordering.
2. **You specified the relationship between the two colors** ("work together in a duo tone"). That single phrase tells me to treat them as a related pair (close hues, complementary roles), not as two unrelated accents fighting for attention.
3. **You used material language** ("rose gold", "dusty pink") instead of hex codes. That gives me license to interpret the metallic quality (warm, slightly desaturated, copper undertone) instead of getting locked to a single value that might not work across light + dark.

Sharpener: naming the **role split** between the two colors would tighten the spec. Template:

```text
Replace [theme] with [color A] + [color B] duotone.
[Color A] = [role]. [Color B] = [role].
Reference: [comparable brand/material].
```

Example:
```text
Replace Orchid with rose gold + dusty pink duotone.
Rose gold = primary CTAs and metallic accents. Dusty pink = secondary fills and hover states.
Reference: Glossier packaging, Aesop rose gold foiling.
```

The **role split** is the underused construct on duotone prompts — without it I have to guess which color leads and which supports, and I might invert the hierarchy (dusty pink as primary would feel washed out and lose the metallic luxury cue you're after).

