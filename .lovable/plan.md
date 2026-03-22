

## Remove Premature Truncation from Client + Services Line

**Problem:** The client name + services line has CSS `truncate` applied, which clips the text even though the card is full-width and there's ample horizontal room. The `+X more` logic already handles overflow by limiting the display to the first service — CSS truncation on top of that is double-constraining.

### Changes — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Remove `truncate` from the client+services `<p>` tag** (line 124) — the `+X more` suffix already handles long service lists programmatically, so CSS ellipsis is redundant.

2. **Show more services before collapsing** — since the card is wide, show up to 2-3 services inline before the `+X more` kicks in. Update the display logic:
   - If 1 service: show it
   - If 2 services: show both separated by ` + `
   - If 3+ services: show first two, then `+X more`

```tsx
const services = (appointment.service_name || '').split(' + ').filter(Boolean);
let serviceDisplay = '';
if (services.length === 1) {
  serviceDisplay = services[0];
} else if (services.length === 2) {
  serviceDisplay = services.join(' + ');
} else if (services.length > 2) {
  serviceDisplay = `${services[0]} + ${services[1]} +${services.length - 2} more`;
}
```

This uses the available card width to show real service names and only collapses when there are 3+ services.

Single file, one block update.

