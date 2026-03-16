

# Hero Section — UI Layout + Danger Jones Brand Swap

## Changes

### 1. Replace all Wella product references with Danger Jones
Danger Jones is a vivid/fashion color brand. Replace throughout the hero card steps and product preview:

| Current (Wella) | New (Danger Jones) |
|---|---|
| Koleston 7/0 | Danger Jones Liberator 7 |
| Welloxon 6% | Danger Jones Activator 20 Vol |
| Blondor | Danger Jones Cosmic Crystal Lightener |
| 7N + 8G (1:1.5) | Liberator 7 + Activator (1:1.5) |

Affects: hero steps 1–5 (lines 470–575), ProductPreview mock (lines 146–178)

### 2. UI layout improvements to hero section
- **Headline typography**: Tighten line-height from `leading-[1.1]` to `leading-[1.05]` and increase max font size to `lg:text-[60px]` for more visual impact matching the screenshot's bold presence
- **Card vertical centering**: Ensure the card aligns better with the headline by adding `lg:mt-4` offset
- **Weight display**: Make the `0.0g` display larger (`text-5xl`) in the bowl-on-scale step for stronger visual anchor
- **Step label styling**: Make the footer step label slightly bolder with `font-medium` for better readability
- **Subtitle spacing**: Reduce gap between headline and subtitle for tighter cohesion

### Files Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — Hero steps (lines 458–575), ProductPreview (lines 119–178), headline (line 417)

