

# Improve Capital Control Tower UI Alignment and Separation

## Problem

The Visibility Checklist and Two-Layer Reference sections have labels and descriptions that run together on a single line with a dash separator, making them hard to scan. The checklist items lack visual separation, and the Layer 1/Layer 2 sections could use better internal structure.

## Changes — `src/pages/dashboard/platform/CapitalControlTower.tsx`

### 1. Visibility Checklist — Stack label above detail
Currently: `✓ Feature Flag — capital_enabled is ON` (single line, label and detail blurred together)

After: Label on first line (brighter), detail on second line (muted, slightly indented). Add `py-2` spacing between items with a subtle divider or gap instead of `space-y-2`.

### 2. Layer 1 (Stripe Capital Requirements) — Separate label from description
Currently each requirement is: `icon Label — Description` on one line.

After: **Label** on first line with slightly brighter color, description on second line in muted color. This makes the 8 Stripe criteria scannable at a glance without reading every description. Keep the 2-column grid.

### 3. Layer 2 (Zura Operational Context) — Same treatment
Separate `[Blocker] No Critical Ops Alerts` from `— Unresolved critical operational alerts pause...` onto two lines. The severity tag (`[Blocker]`, `[Warning]`, `[Info]`) stays inline with the label.

### 4. Add visual dividers between sections
Add a subtle `border-t` between the Visibility Checklist and the "No opportunities detected" warning, and between Layer 1 and Layer 2 cards (already have separate cards, but add `gap-5` instead of `gap-4`).

### 5. EligibilityCheckList (opportunity expanded view) — Same stacking
Apply the same label/description stacking to the Hard Gate, Advisory, and Ranking sections when viewing an actual opportunity's details.

## Visual Result

```text
Visibility Checklist
─────────────────────────────────
✓  Feature Flag
   capital_enabled is ON

✗  Zura Pay Connected
   No locations connected to Zura Pay — Stripe Capital
   requires an active payment processing account

✗  Qualifying Opportunities
   No opportunities detected for this organization

✗  Sidebar Visible
   Zura Capital is NOT visible — all conditions above must pass
```

Layer 1 items become:
```text
◻ 3+ months processing history
  The connected account must have been processing payments
  on Stripe for at least 3 months.

◻ $5K+ annual processing volume
  At least $5,000 in annual processing volume and $1,000
  average over the last 3 months.
```

## Scope

Single file: `src/pages/dashboard/platform/CapitalControlTower.tsx`. No logic changes — purely layout and spacing adjustments.

