
## Fix the real remaining light-mode theme bug: persistence is mostly working, but the authored light palettes and glass surfaces still collapse visually toward Bone

### What’s actually broken

This no longer looks like “the wrong theme class never applied.”

The recent evidence points to a different failure shape:

- the selected theme card changes
- the database is receiving the new `org_color_theme` values
- the page still reads as Bone-like in light mode for several themes

The remaining problem is that **many light-mode palettes are too neutral in their actual surface tokens**, and those already-subtle colors are being further washed out by the shared translucent glass material.

In other words: the app is often rendering the selected theme, but the selected theme’s light tokens are authored so softly that they visually collapse into the same oat/stone family as Bone.

### Why I’m confident this is the issue

1. `src/hooks/useColorTheme.ts` is still the only writer for `org_color_theme`, and the network snapshot shows the setting does update to the clicked theme.
2. `src/index.css` defines separate light tokens for every theme, so this is not a missing-class problem anymore.
3. The settings screenshots show the **mesh tint** changing by theme, while the **main cards / container surfaces** remain nearly the same neutral glass.
4. `src/components/ui/card.tsx` uses `premium-surface`, and `src/index.css` defines it as:
   - `background-color: hsl(var(--card) / 0.92)`
   - `backdrop-filter: blur(12px) ...`
   
   In light mode, that translucency makes subtle palettes read even more alike.
5. Several light themes are authored with very low-saturation surface tokens. Example: `theme-sage` is much muddier in real CSS than its preview card suggests.

### Root cause

Two layers are combining into the “Bone in light mode” effect:

#### 1. Light theme surface tokens are under-tuned
The affected themes need stronger differentiation in the tokens that actually drive the dashboard shell:

- `--background`
- `--card`
- `--popover`
- `--secondary`
- `--accent`
- `--sidebar-background`
- `--sidebar-accent`
- `--card-inner`
- `--border`

Right now, several of these are too close to pale neutral gray/oat, especially once rendered behind translucency.

#### 2. The shared glass card material is muting those palettes even further
`premium-surface` is excellent structurally, but in light mode its transparency is flattening theme identity. The mesh tint changes, but the cards remain so translucent that many themes converge visually.

### Files to update

#### 1. `src/index.css`
Retune the light-mode token sets for these affected themes:

- `.theme-zura`
- `.theme-rosewood`
- `.theme-sage`
- `.theme-marine`
- `.theme-cognac`
- `.theme-noir`
- `.theme-neon`
- `.theme-peach`

Scope of changes:
- strengthen light-mode `background/card/popover/sidebar/accent/secondary/border/card-inner`
- keep dark-mode themes unchanged unless a parity issue appears
- optionally tighten the per-theme mesh gradient to match the new light tokens

#### 2. `src/index.css`
Adjust the shared light-mode glass material so theme colors can actually read.

Recommended change:
- keep dark-mode `premium-surface` as-is
- make light-mode `premium-surface` slightly more opaque and less wash-heavy so `--card` is perceptible
- preserve the premium material feel without turning every card into the same frosted neutral panel

#### 3. `src/hooks/useColorTheme.ts`
Sync the preview swatches to the real tuned palettes so the picker honestly represents what the dashboard will look like.

If possible in this pass:
- update the hardcoded preview chips to match the new authored light tokens

### Implementation approach

#### Step 1 — treat state as solved enough, and stop debugging this as a persistence problem
Do not spend another round on theme class application unless new evidence contradicts it.

The implementation focus should move to:
- token design
- surface opacity
- preview fidelity

#### Step 2 — retune the affected light palettes
For each affected theme, increase hue identity in the actual surface layers:
- backgrounds should stay executive and calm, but clearly belong to their hue family
- cards/popovers/sidebar should no longer read as generic oat-gray
- borders should pick up a whisper of theme hue instead of default neutral

#### Step 3 — make light glass surfaces less theme-destructive
Update `premium-surface` so light-mode cards don’t wash every palette back into the same creamy neutral.

Likely direction:
- raise alpha from `0.92` to something closer to `0.96–0.98` in light mode
- keep blur/specular treatment
- avoid changing dark mode

#### Step 4 — align preview chips with authored CSS
The theme picker should preview:
- actual light background family
- actual light accent family
- actual primary family

That prevents the current “picker looks distinct, live page looks samey” mismatch.

### Verification

After implementation, verify all of these in light mode:

1. Select each of:
   - Zura
   - Rosewood
   - Sage
   - Marine
   - Cognac
   - Noir
   - Neon
   - Peach

2. Confirm:
   - page background is visibly in that theme’s family
   - main appearance card is visibly in that theme’s family
   - sidebar glass is visibly in that theme’s family
   - borders no longer default to Bone-like oat neutrals
   - the selected card in the picker matches the rendered dashboard feel

3. Re-check persistence:
   - one click updates the selected theme
   - refresh keeps the same theme
   - God Mode org switching still restores the correct org theme

### Out of scope

- re-architecting the theme storage model again
- website theme editor behavior
- dark-mode palette redesign
- unrelated ref warning in `SettingsCategoryDetail` / `AlertDialog`

### Why this is the right fix

This is the first explanation that matches all the current evidence at once:

- theme selection changes
- theme setting persists
- mesh tint changes
- light-mode cards still feel Bone-like

That combination points to **palette tuning + glass opacity**, not another theme-class bug.

### Prompt feedback

What you did well:
- you stopped accepting “theme updated” toasts as proof and kept anchoring on what the UI actually looks like
- your latest prompt was specific about which themes are still wrong, which is much better than “themes are broken”

An even stronger version next time:
- list the exact surfaces that look wrong, not just the theme name  
  Example: “Rosewood is selected, but the page background, main settings card, and sidebar still look neutral/oat in light mode.”

That would immediately separate:
- persistence bugs
- CSS token bugs
- shared material/opacity bugs

### Further enhancement suggestions

1. Add a tiny dev-only theme inspector showing:
   - current theme class on `<html>`
   - computed `--background`, `--card`, `--sidebar-background`, `--border`
   - whether each value comes from stylesheet or inline style

2. Add a theme-coherence canon:
   - preview swatches must stay within tolerance of the real CSS token family
   - light-mode `card/sidebar/background` tokens must not collapse into near-Bone neutrality unless explicitly intentional
