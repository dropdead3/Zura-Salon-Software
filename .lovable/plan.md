## Goal
The Appointment Detail panel currently maxes out at **520px**, which causes the Services row chip cluster (Time · Duration · Name · Category · RQ · Stylist · Price) to clip off the right edge (visible in the screenshot). Widen the container and tune the inner content to use the new room intelligently — not just stretch.

## File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

### 1. Widen the panel container (line 1475)
- Change `<PremiumFloatingPanel ... maxWidth="520px">` → `maxWidth="640px"`.
- 640px is the sweet spot: still feels like a side panel (not a takeover), gives ~120px of additional working room for chip clusters and totals, and stays well below the schedule grid edge on a 1119px viewport. Mobile is already handled (`PremiumFloatingPanel` forces full-width on mobile via `useIsMobile`).

### 2. Header block (lines 1478–1484)
- Header layout already uses `flex items-start gap-3` with `flex-1 min-w-0 pr-8` on the title block — no structural change needed, but the extra width lets long client names ("KENDRA HARRIS" + "2 Row Initial Install" + status badge) breathe without truncating.
- Keep avatar (`w-12 h-12`) and overflow menu position untouched.

## File: `src/components/dashboard/schedule/ServiceRow.tsx`

### 3. Make the chip row wrap-aware instead of single-row overflow (line 139)
Current: `<div className="flex items-center gap-2 py-2 group">` — a single horizontal row. With 6 chips this overflows at any reasonable panel width.

Proposed:
```tsx
<div className="flex flex-wrap items-center gap-2 py-2.5 group">
```
- `flex-wrap` allows chips to wrap to a second line on narrow widths (mobile, narrower panels) instead of clipping.
- `py-2.5` slightly increases vertical breathing room for wrapped lines.

### 4. Reorder so wrap behavior is graceful (lines 140–280)
Today the order is: Time → Duration → [Name + Category + RQ flex-1] → Stylist → Price.
Because the middle group has `flex-1`, when there's not enough room the Stylist + Price chips push the name to truncate but never wrap. With `flex-wrap`, the cleaner order becomes:

1. **Row 1 metadata cluster:** Time chip · Duration chip · Stylist chip · Price chip (`shrink-0` already set on each)
2. **Row 2 service identity cluster:** Service name + Category badge + RQ checkbox

Implementation approach: wrap the four metadata chips in one `flex items-center gap-2 flex-wrap` group, and the service-identity block in a separate `flex items-center gap-2 min-w-0 basis-full` group. `basis-full` forces the identity block onto its own line at narrow widths but lets it sit inline at wider widths if room allows — or we can simplify by always stacking them, since the name is the primary signifier.

### 5. Tighten chip ergonomics
- Stylist chip name max width: bump `max-w-[90px]` → `max-w-[120px]` (line 215) so first names like "Jamie" + last initial fit without truncation in the wider container.
- Service name: keep `truncate` on `text-sm` (line 192) — still needed for very long titles like "2 Row Initial Install with Vivid Color Refresh".

### 6. Visual divider between rows
Services list at `AppointmentDetailSheet.tsx` line 1869 already uses `divide-y divide-border/40` between service rows. With each row now potentially two lines tall, the divider continues to read cleanly — no change needed.

## Out of scope (preserved as-is)
- Status pill, progress bar, Send Payment Link CTA, Tab strip (Details/History/Photos/Notes/Color Bar) — these already render comfortably and benefit passively from the extra width.
- Appointment metadata block (Date / Time / Location) — single-column already, no overflow risk.
- Totals breakdown (Subtotal / Discount / Tip / Total at lines 1942–1985) — `flex justify-between` rows; wider container = more whitespace, no layout change.
- `PremiumFloatingPanel` itself — no change to the shared primitive, so other drawers (Meeting, Checkout, Booking) keep their current widths.

## Validation checklist
- 1119px viewport (current preview): panel sits 640px wide on the right, schedule grid stays usable underneath the backdrop.
- Mobile: `useIsMobile` forces full width — chip wrap behavior is the primary win here.
- Long client name + long service name: header truncates gracefully, service row wraps to two lines, no horizontal scroll.
- Single-service appointment: still reads as a tidy two-row block, no awkward whitespace.
- 4+ services: divide-y separators keep each row scannable.

## Why 640px (not 720px or full sheet)
- Schedule grid context: the panel is meant to overlay schedule content so the operator can cross-reference the column. A full sheet would force a context switch.
- Doctrine alignment: `mem://style/drawer-canon` requires `PremiumFloatingPanel` for slide-in detail panels. We're tuning a single instance's `maxWidth` prop, not introducing a new pattern.
- 640px matches the upper bound of common detail-panel widths in the app (CheckoutSummarySheet, MeetingDetailPanel sit in the 480–600 range).

## Follow-up suggestion (not in this change)
Once shipped, audit the History / Photos / Notes / Color Bar tab contents at the new width — Photos in particular may benefit from a 3-column grid instead of 2.

---

### Prompt feedback
Strong, specific prompt — you anchored on a concrete pain point ("widen") and gave the next step ("inner contents and responsiveness"). Two ways to make it even sharper next time:
1. **Name the symptom, not just the fix.** "The services row clips on the right at the current width" tells me *why* widening matters, so I can validate the fix instead of guessing.
2. **Set a width ceiling or anchor.** "Widen up to ~640px so it doesn't dominate the schedule" prevents me from over-correcting toward a full sheet.

### Enhancement suggestions
- **Sticky footer for the Confirm CTA.** Currently it scrolls with the content; pinning it to the panel bottom on scroll would keep the primary action always reachable on long appointments.
- **Collapsible Services section** when 5+ services are attached — shows the first 3 by default with a "+2 more" toggle.
- **Inline edit affordance hint.** The chips are clickable but read as static; a subtle hover state (already in `ChipBtn`) could be paired with a one-time tooltip on first open.
