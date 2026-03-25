

## Remove Redundant Demo Badge + Enlarge Edit Services Button

### Problem
Two "Demo" badges are stacking/overlapping in the appointment detail view — the global `DockDemoBadge` (absolute-positioned) and the inline one added to the appointment header.

### Fix — 2 files

**1. `src/components/dock/appointment/DockAppointmentDetail.tsx`**
- Remove the inline Demo badge from the header (lines 107–112) — the global `DockDemoBadge` already handles this
- Enlarge the Edit Services button: increase padding from `px-3 py-1.5` → `px-4 py-2`, text from `text-xs` → `text-sm`, icon from `w-3 h-3` → `w-3.5 h-3.5`

**2. No changes needed to `DockDemoBadge.tsx` or `DockLayout.tsx`** — the global badge continues to render as before

### Result
Single Demo badge (global), larger Edit Services button that's easier to tap.

