

# Decisional Inventory Command Center — 10-Point Upgrade

## Overview
Transform the Stock tab from an informational reporting view into a decisional command interface. The changes span three files with one new component.

---

## 1. Decision Header (replaces summary chips area)

**File: `StockTab.tsx` (lines 312-343)**

Replace the current summary chips row with a prominent decision header block:
- Large count: "191 Items Need Action" in `text-2xl font-display`
- Inline severity breakdown: "187 Critical · 4 Low" with color-coded text
- Estimated PO value shown prominently
- Primary CTA: "Auto Build PO" as a large, filled button (not toolbar-sized)
- Secondary: "Review Items" scrolls/focuses the table
- Sits inside a subtle card with left accent bar when items need action

The existing summary chips (Needs Reorder, Critical, Low) become the severity breakdown inside this header rather than standalone filter buttons. Filter behavior preserved — clicking "Critical" still filters.

## 2. Suggested Order Column — Visual Dominance

**File: `CommandCenterRow.tsx` (lines 276-344)**

- Increase the suggested order number from `text-lg` to `text-xl font-semibold` 
- Add a subtle warm background pill (`bg-primary/[0.06] px-2 py-0.5 rounded-md`) when value > 0
- Keep the current click-to-edit behavior
- Add micro-label "Order" as `text-[9px] text-muted-foreground/40 uppercase tracking-wider` above the number in the header (`StockTab.tsx` TableHead)

## 3. Row Highlighting — Reduce Aggression

**File: `CommandCenterRow.tsx` (lines 204-211)**

Current: `bg-destructive/[0.04]` for critical rows (full row tint)  
New approach:
- Critical: `bg-destructive/[0.02]` (halve the tint) — barely perceptible warm wash
- Low: `bg-warning/[0.015]` (even subtler)
- Keep the left severity bar (3px) — this carries urgency alone
- Keep "Out of Stock" text in red — text-level urgency stays
- Hover states: critical `hover:bg-destructive/[0.04]`, low `hover:bg-warning/[0.03]`

## 4. Days Remaining — Promoted to Main Row

**File: `CommandCenterRow.tsx`**

Currently `~Xd remaining` is a tiny `text-[10px]` line under the product name (line 238-251). Promote it:
- Move from under product name to the **Stock column** (after the on-hand number)
- Display as `"~14d"` in a slightly larger `text-[11px]` with severity coloring
- Out of Stock shows `"0d"` in destructive
- No usage data shows nothing (no "∞")
- Remove the duplicate from the expanded detail row (lines 463-484) — keep just `Avg Daily Usage` there

## 5. Pending Orders — Surface in Main Row

**File: `CommandCenterRow.tsx` (Stock column, lines 257-273)**

Currently `open_po_qty` only shows in the Suggested Order column (line 335-339) and expanded row (line 486-491).  
New: In the Stock column, after the on-hand number:
```
12
(8 on order)
~14d
```
Show `(X on order)` in `text-[10px] text-primary/60` when `open_po_qty > 0`.  
Remove the duplicate from the Suggested Order column (keep it cleaner).

## 6. "Add to PO" — Upgraded Presence

**File: `CommandCenterRow.tsx` (lines 382-412)**

- Increase button height from `h-7` to `h-8`
- When `needsReorder`: always show the button (not just on hover or when needsReorder) — currently correct, just ensure consistent visibility
- Added state: show green checkmark with `bg-success/10` background, not just ghost
- Un-added state: show with `bg-primary/10` subtle fill instead of ghost
- Both states: `min-w-[96px]` for stability

## 7. Supplier Grouping — Identity Upgrade

**File: `StockTab.tsx` — `SupplierSection` component (lines 640-727)**

Upgrade the supplier header row:
- Show supplier name more prominently: `text-sm font-medium` (from `tokens.label.tiny`)
- Show item count and estimated total inline: "42 items · $380 est."
- For Unassigned: show "Unassigned Supplier" (add "Supplier" suffix)
- When assigned and has reorder items: add `[ Create PO ]` button on right (stages all supplier items into PO Builder)
- Increase padding slightly for visual weight

## 8. Auto vs Manual Confidence Layer

**File: `CommandCenterRow.tsx` (lines 320-332)**

Currently "Auto" is `text-muted-foreground/40` and "Edited" is `text-primary/70`.  
Refine the distinction:
- Auto: keep muted — `text-muted-foreground/30` with no background (system confidence, should feel invisible)
- Manual override: `text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded-full` — slightly brighter, accent-colored to signal human intent
- This builds trust: "the system suggested this, but I chose differently"

## 9. Expanded Row — Decision-Focused Content

**File: `CommandCenterRow.tsx` (lines 416-495)**

Add to the expanded detail row (after existing fields):
- "Last movement: X days ago" — computed from the intelligence data or a new lightweight query
- For now, derive from `intelligence.dailyUsage`: if dailyUsage > 0, show "Active — used daily" or "Slow mover — <1/day"
- Reorder the fields: Reorder Point, Par Level first (action-relevant), then Brand/Category/Container (reference), then PO History + Intelligence last

## 10. Auto Build PO — Preview Mode Dialog

**File: `StockTab.tsx` + `AutoCreatePODialog.tsx`**

The `AutoCreatePODialog` already exists and does most of this (shows supplier groupings with checkboxes, estimated costs, and "Create X Draft POs" button). It IS the preview mode.

Wire the toolbar "Auto Build PO" button to open `AutoCreatePODialog` instead of silently adding items to the PO Builder panel. Currently (lines 388-411) it adds to PO Builder directly.

Change: clicking "Auto Build PO" opens the dialog for review first. User confirms, then POs are created. This makes it intentional, not automatic.

---

## Files Changed

| File | Changes |
|------|---------|
| `StockTab.tsx` | Decision header, supplier identity upgrade, Auto Build PO → dialog flow |
| `CommandCenterRow.tsx` | Row tint reduction, days remaining promotion, pending orders in stock column, suggested order emphasis, Add to PO upgrade, auto/manual styling, expanded row reorder |
| `AutoCreatePODialog.tsx` | No structural changes — already serves as preview mode |

## Principles
- Every change reduces cognitive load and increases action clarity
- Urgency communicated through left bar + text color, not full-row backgrounds
- Time-based intelligence (days remaining) promoted to first-class citizen
- "What to order" is the loudest signal on every row

