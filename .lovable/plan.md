

## Improve Service Editor Layout & Add Info Tooltips

### Changes

#### 1. Widen Dialog — `ServiceEditorDialog.tsx`
- Change `max-w-lg` → `max-w-2xl` to give all tabs more breathing room (especially Seasonal which has 2-col date pickers and Stylist Overrides with search + price inputs)

#### 2. Add MetricInfoTooltip to Every Field Group — `ServiceEditorDialog.tsx` (Details tab)

Add info circle tooltips next to these labels/sections:

| Field | Tooltip |
|-------|---------|
| Duration (min) | "Total chair time including processing. Used for scheduling and calendar blocking." |
| Price ($) | "Default service price before level, location, or seasonal adjustments." |
| Cost ($) | "Internal cost of supplies/product for this service. Used for margin reporting." |
| Finishing (min) | "Time allocated after processing for blowout, styling, and finishing. Not included in processing time." |
| Content (min) | "Time reserved for photos or social content creation during the appointment." |
| Processing (min) | "Chemical or treatment processing time where the stylist may serve other clients." |
| Requires Qualification | "When enabled, only team members with this service's qualification can be booked for it." |
| Bookable Online | "Controls whether this service appears on your website and can be booked by clients online." |
| Same-Day Booking | "When disabled, clients must book this service at least the specified lead time in advance." |
| Requires New-Client Consultation | "New clients must complete a consultation appointment before booking this service." |
| Backroom Container Types | "Determines which vessel types (bowls, bottles) appear in Zura Backroom when mixing formulations for this service." |
| Requires Deposit | "Collect a deposit or prepayment to confirm the booking. Helps reduce no-shows for high-value services." |

#### 3. Add Info Tooltips to Sub-Tab Content

**LevelPricingContent.tsx** — tooltip next to the description:
- "Override the base price per stylist level. The most specific price wins: stylist override > level price > base price."

**StylistOverridesContent.tsx** — tooltip next to the description:
- "Set a custom price for an individual stylist on this service. Takes priority over both level pricing and the base price."

**LocationPricingContent.tsx** — tooltip next to the description:
- "Set a different price for this service at a specific location. Applies before level and stylist overrides."

**SeasonalAdjustmentsContent.tsx** — tooltip next to the description:
- "Time-bound price modifiers applied on top of the resolved price. Use positive values for surcharges and negative for discounts."

#### 4. Layout Polish
- Add `MetricInfoTooltip` import to all 5 files
- Place tooltips inline with labels using `flex items-center gap-1.5` wrappers
- For the toggle sections, place the tooltip after the emphasis text in the same flex row

### Files
1. `src/components/dashboard/settings/ServiceEditorDialog.tsx` — widen dialog, add tooltips to all Details fields
2. `src/components/dashboard/settings/LevelPricingContent.tsx` — add tooltip
3. `src/components/dashboard/settings/StylistOverridesContent.tsx` — add tooltip
4. `src/components/dashboard/settings/LocationPricingContent.tsx` — add tooltip
5. `src/components/dashboard/settings/SeasonalAdjustmentsContent.tsx` — add tooltip

