

## Redesign Bowl Dispensing: Visual Ingredient-Focused Flow (Vish-Inspired)

### Concept
Replace the current flat list-based dispensing view with an immersive, single-ingredient-at-a-time flow. When you tap an ingredient, instead of jumping to a bare numpad, you see a **teardrop/droplet visual** that fills proportionally as weight is entered — giving real-time visual feedback of progress toward the target weight.

### New UX Flow
1. **Bowl overview** (current list view) — tap an ingredient
2. **Ingredient dispensing screen** — full-screen with:
   - Top: Formula/Ingredient toggle (segmented control)
   - Center: Large teardrop SVG that fills from bottom to top based on `currentWeight / targetWeight`
   - Below teardrop: Product name + `{current}g / {target}g` pill
   - Pagination dots for swiping between ingredients
   - Action bar: Balance, Notes, More, Done buttons
   - Bottom: Horizontal ingredient carousel showing all bowl items with fill status
3. Scale readings (or manual numpad entry) fill the teardrop in real-time

### Technical Changes

**1. New file: `src/components/dock/mixing/DockIngredientDispensing.tsx`**
- Full-screen view shown when an ingredient is selected
- Props: `line: BowlLine`, `allLines: BowlLine[]`, `onDone`, `onBack`, `onWeightUpdate`, `currentWeights: Map<string, number>`
- SVG teardrop shape with a `clipPath` fill that animates based on fill percentage (`currentWeight / targetWeight`)
- Product name + weight pill (`0g / 30g`) below the droplet
- Swatch color tints the fill (falls back to violet-500)
- Pagination dots for multi-ingredient navigation
- Bottom carousel: horizontal scroll of ingredient cards showing name, category, and `current / target` weight
- Action bar with: Balance (scale icon), Notes, More (ellipsis), Done (checkmark) — large touch buttons

**2. New file: `src/components/dock/mixing/TeardropFill.tsx`**
- Reusable SVG teardrop component
- Props: `fillPercent: number` (0–1), `fillColor: string`, `size: number`
- SVG path for teardrop shape with a `clipRect` that rises from bottom based on fill
- Smooth CSS transition on the clip (`transition-all duration-300`)
- Subtle glow/shadow effect when fill > 0

**3. Modified: `src/components/dock/mixing/DockLiveDispensing.tsx`**
- When `activeView === 'weight-input'`, render `DockIngredientDispensing` instead of the bare `DockWeightInput`
- Track `currentWeights` state as a `Map<string, number>` for each line's actual dispensed weight
- Pass all lines + current weights to enable carousel navigation
- "Done" from ingredient view updates the line weight and returns to bowl overview
- Keep numpad accessible: tapping the weight pill on the ingredient screen opens `DockWeightInput` as an overlay/modal for manual entry (scale would update automatically in production)

**4. Modified: `src/components/dock/mixing/DockWeightInput.tsx`**
- Add optional `targetWeight` prop to show target context
- Add optional `initialValue` prop to pre-fill with current weight

### Visual Details
- Teardrop: ~200px tall SVG, centered, with subtle radial gradient for 3D depth (matching the Vish reference — gray/silver base with color fill rising)
- Fill color: uses `swatch_color` from the product if available, otherwise violet-500
- Overfill (>100%): teardrop fully filled + subtle red/amber glow border to indicate excess
- Weight pill: dark rounded-full badge showing `{current}g / {target}g`
- Bottom carousel: cards ~140px wide with small swatch circle + weight status, active card has a white/light border

### Files
- `src/components/dock/mixing/TeardropFill.tsx` — new
- `src/components/dock/mixing/DockIngredientDispensing.tsx` — new
- `src/components/dock/mixing/DockLiveDispensing.tsx` — modified
- `src/components/dock/mixing/DockWeightInput.tsx` — minor additions

