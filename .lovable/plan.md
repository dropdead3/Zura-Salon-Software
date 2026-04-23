

# Bone dark mode: restore correct cool oat tokens (remove rosewood contamination)

## Diagnosis

The `.dark.theme-bone` block in `src/index.css` (lines 179–247) is **contaminated with Rosewood values**. Roughly half the dark-mode tokens use rose hues (345°, 350°) and inverted lightness — these don't belong to Bone.

| Token | Current (wrong) | Reads as |
|---|---|---|
| `--border` | `350 6% 65%` | bright pinkish-gray (way too light for dark mode) |
| `--input` | `350 6% 74%` | bright pinkish-gray |
| `--ring` | `345 55% 42%` | **rose pink** focus rings |
| `--chart-1` | `345 55% 42%` | **rose pink** chart series |
| `--chart-2` | `345 35% 60%` | rose pink |
| `--sidebar-background` | `350 10% 83%` | **LIGHT pink sidebar** in dark mode |
| `--sidebar-foreground` | `350 20% 8%` | dark text on light sidebar (inverted) |
| `--sidebar-primary` | `345 55% 42%` | rose pink |
| `--sidebar-border` | `350 6% 65%` | bright pinkish |
| `--card-inner` | `350 6% 80%` | bright pinkish (way too light) |
| `--accent` | `40 30% 85%` | bright cream (too light) |

This is why:
1. Bone in dark mode has **bright strokes/borders** — borders are at 65–74% lightness instead of ~18%.
2. The schedule looks off — appointment cards inherit chart-1/chart-2 (rose pink) and ring/border tokens (pinkish-bright).
3. There are also **duplicate `--success` / `--warning` blocks** (lines 209–214 and 223–227).

## Fix

Rewrite `.dark.theme-bone` (lines 179–247) with proper cool-oat dark tokens — mirror Zura's dark structure, swap palette to oat/cool-gray (hue 30°, low saturation 8–16%), and restore the correct dark-mode lightness range (4–18% for chrome, 60–70% for accents).

### Corrected dark mode tokens

| Token | Fixed value |
|---|---|
| `--background` | `0 0% 4%` (kept) |
| `--foreground` | `40 20% 92%` (kept) |
| `--card` | `0 0% 11%` (kept) |
| `--popover` | `0 0% 11%` (kept) |
| `--primary` | `30 16% 65%` (kept — cool oat) |
| `--secondary` | `30 10% 16%` (kept) |
| `--muted` | `0 0% 20%` (kept) |
| `--muted-strong` | `0 0% 14%` (kept) |
| `--muted-foreground` | `40 10% 60%` (kept) |
| `--accent` | `30 12% 16%` (was `40 30% 85%` — fix: dark hover surface) |
| `--accent-foreground` | `40 20% 92%` (was `0 0% 4%` — fix: light text on dark accent) |
| `--oat` | `35 25% 30%` (kept) |
| `--gold` | `42 75% 45%` (kept) |
| `--chart-1` | `30 16% 65%` (was rose `345 55% 42%`) |
| `--chart-2` | `35 22% 60%` (was rose `345 35% 60%`) |
| `--chart-3` | `28 55% 45%` (kept) |
| `--chart-4` | `38 70% 45%` (kept — gold differentiator) |
| `--chart-5` | `280 50% 50%` (kept) |
| `--border` | `30 8% 18%` (was bright pink `350 6% 65%`) |
| `--input` | `30 8% 22%` (was bright pink `350 6% 74%`) |
| `--ring` | `30 16% 65%` (was rose `345 55% 42%`) |
| `--sidebar-background` | `0 0% 6%` (was light pink `350 10% 83%`) |
| `--sidebar-foreground` | `40 20% 92%` (was dark `350 20% 8%`) |
| `--sidebar-primary` | `30 16% 65%` (was rose) |
| `--sidebar-primary-foreground` | `30 12% 6%` |
| `--sidebar-accent` | `30 8% 14%` (was light `350 8% 78%`) |
| `--sidebar-accent-foreground` | `40 20% 92%` (was dark `350 20% 8%`) |
| `--sidebar-border` | `30 8% 16%` (was bright pink) |
| `--sidebar-ring` | `30 16% 65%` (was rose) |
| `--card-inner` | `0 0% 13%` (was light pink `350 6% 80%`) |
| `--card-inner-deep` | `0 0% 9%` (was light pink `350 4% 76%`) |

Also: **remove the duplicate `--success` / `--warning` block** at lines 223–227 (already declared at 209–214).

## Acceptance

1. Bone in dark mode: borders, strokes, and dividers read as **subtle dark dividers** (~18% lightness), not bright pink lines.
2. Bone in dark mode: sidebar reads as **deep dark surface** (~6% lightness), not a light pink panel.
3. Bone in dark mode: focus rings, primary buttons, chart-1 series read as **cool oat**, not rose pink.
4. Schedule appointment cards in dark mode bone: borders/strokes calm and dark, no bright pink leakage.
5. Light mode bone unchanged.
6. Rosewood theme unchanged (it has its own block correctly defined further down).
7. No duplicate token declarations in `.dark.theme-bone`.

## What stays untouched

- Light-mode `.theme-bone` block (lines 77–177) — already correct from prior pass.
- Rosewood, Sage, Marine, Cognac, Noir, Neon, Zura blocks — all separate from this fix.
- Theme picker swatches in `useColorTheme.ts` — already match the correct oat values.
- Terminal splash palette — already correct.

## Out of scope

- Any change to other themes.
- Adjusting the light-mode bone tokens.
- Changing the chrome darkness floor (background stays `0 0% 4%`).

## Root cause note

Likely happened during an earlier multi-theme edit where Rosewood's dark block was duplicated as a starting point for Bone's dark block and only partially overwritten. The light-mode block was rewritten cleanly; the dark-mode block kept the rosewood inheritance for ~12 tokens. Worth a quick scan of other themes' dark blocks (Sage, Marine, Cognac, Noir, Neon) to confirm none have the same contamination — but those are out of scope unless you flag them.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named two surfaces affected ("stroke color in bone theme... same with the schedule").** That told me the issue isn't isolated to one component — it's a *token-level* leak, not a component bug. Cut my search space from "find the broken component" to "find the broken token."
2. **You diagnosed the cause structurally ("Something got changed in the color files that should not have been").** You gave me the verdict (regression, not intended change) and the layer (color tokens). I went straight to `index.css` instead of debugging individual stroke usages.
3. **You used "way too bright"** — that's a specific failure mode (lightness wrong), not a vague "looks off." Told me to look at the lightness channel of the contaminated tokens, which is exactly where rosewood's 65–83% lightness leaked into bone's dark-mode chrome.

Sharpener: when reporting a regression, naming **what changed recently** (or "this used to look like X") narrows the diff. Template:

```text
Surface: [where you see it]
Symptom: [the failure mode]
Recent change: [what you asked for last that touched this area]
Suspected layer: [tokens / component / config]
```

Here, "the bone theme dark mode strokes are too bright — last edit was the bone palette refresh, suspect the dark-mode tokens didn't get fully rewritten" would have pointed me directly at the `.dark.theme-bone` block instead of needing to scan the whole file. You gave me enough to find it fast — this is purely a sharpener.

## Further enhancement suggestion

For "regression" prompts specifically, the highest-leverage frame is:

```text
Was: [how it looked before — "calm dark borders"]
Is: [how it looks now — "bright pink strokes"]
Last touched: [the recent change you remember]
Scope: [one theme / one mode / one component]
```

The **Was/Is** pairing is the highest-leverage addition — it tells me the *delta* directly instead of making me infer it from the failure mode. For token regressions specifically, naming the scope (`"only dark mode, only bone"`) confirms the contamination is *block-local* and prevents me from over-fixing into adjacent themes. You can also add a **suspected layer** (tokens vs component vs config) — for color regressions the answer is almost always "tokens," but naming it shaves a step. Combined with verdict structure ("less X, more Y") from prior rounds, this gives you a 4-element regression template that consistently lands the fix in one iteration.

