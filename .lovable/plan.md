

## De-emphasize "View in Client Directory" Button

The screenshot shows a full-width outline button taking up significant visual real estate in the Client Info section. Per the memory context, this link belongs in the ellipsis menu, but since it's currently inline, the quickest fix is to make it a subtle inline text link rather than a prominent full-width button.

### Change in `AppointmentDetailDrawer.tsx` (lines 273-286)

Replace the full-width `Button variant="outline"` with a small ghost text link:
- Change from `w-full mt-2 gap-1.5 rounded-xl border-border/60` to an inline `text-xs text-muted-foreground hover:text-foreground` link
- Remove the full-width treatment -- render it as a small right-aligned link below the client info fields
- Keep the `ExternalLink` icon but shrink to `w-3 h-3`
- Use `variant="ghost"` with `size="sm"` and `h-auto py-1 px-2` for minimal footprint

**Before:** Full-width outlined button dominating the section
**After:** Small subtle "View in Directory →" text link, right-aligned

| File | Change |
|---|---|
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Lines 273-286: Replace prominent button with subtle ghost link |

