

## Unify Specialty Bubble Selectors and Fix Badge Display Logic

Two issues to address:

### 1. Unify bubble styling in MyProfile.tsx

The **Specialties** section uses rounded-full `<button>` elements with `border-2`, while the **Highlighted Services** section uses `<Badge>` components with different styling (solid fill vs outline, `opacity-60`, `border-dashed`). Both should use the same bubble style — rounded-full buttons with consistent border/selected states.

**File: `src/pages/dashboard/MyProfile.tsx`** (lines 1209-1230)
- Replace the `<Badge>` components in Highlighted Services with the same `<button>` style used in the Specialties section
- Selected highlighted items: `border-primary bg-primary/10 text-primary font-medium`
- Unselected highlighted items: `border-border hover:border-primary/50 text-foreground` (with `opacity-60 border-dashed` to differentiate as "available to highlight")
- Disabled items (at max 3): `opacity-40 cursor-not-allowed`

### 2. Only show highlighted_services on website card — never fall back to specialties

**File: `src/components/home/StylistFlipCard.tsx`** (lines 76-103)
- Remove the fallback logic that shows `specialties` when `highlighted_services` is empty
- Remove the extensions-sorting logic (leftover from the old special treatment)
- Only display badges if `highlighted_services` has items; show nothing otherwise

