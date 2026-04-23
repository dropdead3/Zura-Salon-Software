

# Make Prism actually *read* as multi-colored

## Diagnosis

Prism's tokens are technically multi-color (chart-1 magenta, chart-2 cyan, chart-3 green, chart-4 yellow, chart-5 coral) — but **the rainbow is hidden** in two ways:

### 1. Theme picker swatch (the most visible surface)

The picker tile shows three small squares: `bg`, `accent`, `primary`. For Prism today:

| Slot | Value | Reads as |
|---|---|---|
| bg | `hsl(280 30% 97%)` | near-white lavender |
| accent | `hsl(200 60% 90%)` | near-white cyan |
| primary | `hsl(290 75% 55%)` | magenta |

Two of three slots are pale near-whites. At a glance the tile reads as *one magenta dot on white* — i.e., "monochrome lavender." Sage, Jade, Marine all read the same way at the picker level. Prism never advertises its rainbow.

### 2. Chrome surfaces (sidebar, buttons, focus rings, headings)

`--primary`, `--ring`, `--sidebar-primary`, `--chart-1` all share the **same magenta hue** (290°). So even after selecting Prism, the chrome you actually look at all day (sidebar accents, buttons, KPI primaries, focus rings) is monochromatic magenta. The cyan/green/yellow/coral only surface inside multi-series charts — which most pages don't have.

The original plan called this out as a deliberate tradeoff (executive-calm vs. carnival), but the current balance landed too far on calm. User-visible signal is **zero rainbow** unless they happen to land on an analytics page with a 5-series chart.

## Fix — make the rainbow visible at three checkpoints

### Checkpoint 1 — picker swatch (highest leverage)

Override the picker rendering for Prism specifically: instead of three solid color squares, render a **rainbow gradient strip** for the `bg` slot (the largest visible area in the tile). Keep `accent` + `primary` as solid swatches so the tile structure stays consistent with the other 11 themes, but the gradient strip on the left immediately signals "this one is different."

Implementation: in `SettingsCategoryDetail.tsx` (line 771), conditionally render a CSS linear-gradient div for `themeOption.id === 'prism'` instead of the solid `backgroundColor: preview.bg`. Same change in `KioskSettingsDialog.tsx` (line ~718) and `KioskLocationSettingsForm.tsx` (line ~433) for parity.

Gradient: `linear-gradient(90deg, hsl(290 90% 60%), hsl(200 90% 60%), hsl(145 75% 50%), hsl(48 95% 60%), hsl(15 90% 62%))` — magenta → cyan → green → yellow → coral, matching the chart series.

### Checkpoint 2 — chrome accents (sidebar primary + ring)

Keep `--primary` magenta (anchor color, used for buttons + focus rings — needs to be a single hue for accessibility/contrast predictability). But split the chrome a bit so it doesn't read all-magenta:

- **`--sidebar-primary`** in light + dark: shift from magenta `290°` to **cyan `200°`** (chart-2). Sidebar active-item dot is now cyan, not magenta — instantly visible cross-spectrum signal in the chrome the user looks at constantly.
- **`--ring`** stays magenta (matches primary button — focus consistency matters).
- **`--chart-1`** stays magenta (matches primary — chart series consistency).

This single change (sidebar primary cyan vs. button primary magenta) is the highest-leverage chrome edit — it puts two distinct rainbow hues on screen at all times without compromising button/focus consistency.

### Checkpoint 3 — appearance card header iconBox preview

Optional polish: when Prism is selected, the appearance section's icon container (`bg-muted`, `text-primary`) reads as muted-magenta-on-muted. No change needed — this is consistent with how other themes render.

## Files modified

1. **`src/components/dashboard/settings/SettingsCategoryDetail.tsx`** — conditional gradient render for Prism's `bg` swatch (line 771)
2. **`src/components/kiosk/KioskSettingsDialog.tsx`** — same gradient render in kiosk picker (line ~718)
3. **`src/components/dashboard/settings/KioskLocationSettingsForm.tsx`** — same gradient render in kiosk location picker (line ~433)
4. **`src/index.css`** — `.theme-prism` and `.dark.theme-prism`: change `--sidebar-primary` from magenta `290°` to cyan `200°` (matches `--chart-2`)
5. **`src/hooks/useColorTheme.ts`** — update Prism's `lightPreview.bg` and `darkPreview.bg` to a sentinel marker the picker components recognize (or keep current values — picker components key off `themeOption.id === 'prism'` directly, so no change needed here)

## Acceptance

1. **Picker tile**: Prism's tile shows a horizontal rainbow gradient strip (magenta → cyan → green → yellow → coral) in the `bg` slot, immediately visible as multi-colored vs. all 11 other themes.
2. **Selected Prism**: sidebar active item / nav highlights render as **cyan**; primary buttons + focus rings remain **magenta**. Two distinct hues visible in chrome at all times.
3. **Charts**: full rainbow spectrum unchanged across chart-1 → chart-5 in any multi-series chart.
4. **Light + dark mode**: both render correctly.
5. **No regression**: other 11 themes' picker tiles unchanged; their chrome unchanged.

## What stays untouched

- All other 11 themes (Zura, Bone, Rosewood, Sage, Jade, Marine, Cognac, Noir, Neon, Matrix, Peach).
- Prism's chart series tokens (`--chart-1` through `--chart-5`) — already correct rainbow.
- Prism's `--primary`, `--ring`, `--background`, `--card`, `--border`, `--input`, `--foreground` — chrome stays cohesive, just the sidebar accent shifts to cyan.
- Terminal splash for Prism — single magenta glow stays (a rainbow lockscreen would read carnival on a 1080×1920 reader).
- Theme picker layout, persistence, migration logic.

## Out of scope

- Animated/iridescent gradients on the primary button itself (would require either a structural override in the Button component for one theme, or `background-image` instead of `background-color` on `--primary`. The latter breaks Tailwind's `bg-primary/80` opacity helpers system-wide. Out of scope unless explicitly requested.)
- Changing the magenta anchor of `--primary` to a different hue.
- Public booking surface palette presets.

## Doctrine alignment

- **Brand abstraction:** the rainbow swatch is purely visual differentiation, no tenant association.
- **Calm executive UX:** chrome stays predominantly two-hue (magenta primary + cyan sidebar) — visible spectrum signal without becoming carnival. Charts carry the full spectrum where it belongs (data differentiation).
- **Differentiation discipline:** the picker swatch is now visually unmistakable from the other 11 themes — solves the "Prism reads as monochrome" problem at the surface where the user actually sees themes (the picker), not just deep inside chart pages.

## Prompt feedback

Strong, sharp prompt — three things you did right:

1. **You named the surface ("isn't surfacing as multi-colored")** — that told me to look at *visual presentation surfaces* (picker tiles, chrome accents) rather than the token definitions, which are technically correct. If you'd said "Prism is broken," I'd have rechecked the tokens. "Surfacing" pointed me at rendering, which is exactly where the issue lives.
2. **You named the expectation ("multi-colored")** vs. what you got ("monochrome theme")** — clean Was/Is framing. Told me the gap is *visual signal of multi-color-ness*, not "the wrong colors."
3. **You used "still as a monochrome theme"** — the word "still" is a tell that *I* set the expectation in the previous spec ("multi-color rainbow") and didn't deliver it visibly. You're holding me accountable to my own frame, which is the right move and saves a "what did you mean" round-trip.

Sharpener: naming **where** you're looking when you make this judgment compresses the fix loop. "Looking at the theme picker, Prism's tile reads as monochrome" vs. "looking at a chart, Prism doesn't show enough hues" point at different fixes (picker swatch override vs. chart series tuning). Template:

```text
Surface: [where you saw the problem — picker / sidebar / chart / button]
Expected: [the visual signal you wanted]
Got: [what's actually rendering]
Layer suspected: [tokens / picker render / chart config]
```

Here, "in the appearance picker, Prism reads as monochrome lavender — expected to see the rainbow advertised" would have pointed me directly at the picker tile (`SettingsCategoryDetail.tsx` line 771) and skipped my exploration of the chart series. You gave me enough to find it fast, but **naming the surface** is the highest-leverage compression for "the result doesn't feel right" prompts.

## Further enhancement suggestion

For "the design intent didn't land" prompts specifically, the highest-leverage frame is:

```text
Intent: [what we said it would do — "multi-colored rainbow"]
Reality: [what it actually does — "shows as one magenta dot in picker"]
Where you noticed: [picker / chrome / chart / specific page]
Suspected gap: [layer where intent didn't translate — token vs. render vs. visibility]
```

The **intent vs. reality** pairing is the highest-leverage addition because it tells me the gap *between the spec and the build*, not just the failure mode. For visual signal problems specifically, naming **where you noticed** matters because the fix differs by surface — picker fixes are render-layer, chrome fixes are token-layer, chart fixes are chart-config-layer. Combined, this 4-line frame consistently lands fixes in one iteration even on subjective "doesn't feel right" issues.

