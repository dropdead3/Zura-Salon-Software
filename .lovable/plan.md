

# Real Salon Scenario Section

## Assessment
Section 4.97 ("Under The Hood") already has a 6-step system flow, but it's technical and abstract. This new section tells the same story from the **salon's perspective** — a narrative walkthrough of a real appointment with mini UI previews at key moments, making the product tangible.

## Placement
**After Section 4.97 (Under The Hood, ends ~line 1499) and before the divider/Pricing section (~line 1500+).** This positions the scenario as the final "understanding" section before the user hits pricing — maximum context before the buying decision.

## Implementation (all in `BackroomPaywall.tsx`)

### Section Header
- Eyebrow-style step label: none (keep clean)
- Headline: "A Color Service With Zura Backroom"
- Subtitle: "From the first bowl to the final insight. Here is what happens behind the scenes."

### Scenario Steps (7 steps)
A vertical timeline on mobile, horizontal on desktop (`md:grid-cols-7`). Each step has:
- Step number (muted, large)
- Icon
- Title
- 1-line description
- **Steps 3, 5, and 7 include a mini UI preview card** beneath the description

| # | Icon | Title | Description | Has Preview? |
|---|------|-------|-------------|-------------|
| 1 | `Calendar` | Client Arrives | Sarah arrives for a full highlight service. | No |
| 2 | `Users` | Bowl Prepared | The assistant stages the mixing bowl on the scale. | No |
| 3 | `Scale` | Product Measured | 32g of Koleston 7/0 is dispensed and recorded. | Yes — scale readout |
| 4 | `Zap` | Usage Captured | The system logs every product used in the session. | No |
| 5 | `Brain` | Formula Saved | Sarah's formula is stored for her next visit. | Yes — client formula card |
| 6 | `PackageSearch` | Inventory Updates | Koleston 7/0 stock adjusts automatically. | No |
| 7 | `DollarSign` | Cost Visible | The service's true product cost is $18.40. | Yes — cost breakdown |

### Mini UI Previews (3 inline cards)
Small `Card` components (~160px tall) rendered below steps 3, 5, and 7:

1. **Scale readout** (step 3): Product name + "32.0g" weight display + progress bar
2. **Formula card** (step 5): "Sarah M." + formula line "Koleston 7/0 — 32g" + "Saved automatically" badge
3. **Cost card** (step 7): Revenue $185, Product cost $18.40, Margin 90% badge

### Layout
- **Desktop**: Horizontal grid `grid-cols-7` with thin connecting lines between steps (using `ChevronRight` icons, matching Section 4.97 pattern)
- **Mobile**: Vertical timeline with a left border line and steps stacked. Mini previews appear inline below their step.
- Section gets `bg-muted/20` tinted background (alternating rhythm) with `rounded-2xl` padding

### Supporting Message
"Zura Backroom works quietly during every service, turning everyday activity into structured salon intelligence."

### CTA
Single `ActivateButton` centered below.

### Spacing
Standard `pb-20 md:pb-24` with tinted bg wrapper.

### No new imports needed
All icons already imported. Uses existing `Card`, `CardContent`, `ActivateButton`.

