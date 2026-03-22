

## Handle Long Service Lists on Appointment Cards

**Problem:** When a client has many services (e.g., "Balayage + Toner + Gloss + Blowout + Treatment"), the top line truncates everything after the client name. Services vanish behind `…` with no indication of how many there are.

**Approach:** Split client name and services onto separate visual lines when there are multiple services, and show a count badge when truncated. This keeps the card scannable while surfacing service volume.

### Changes

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`** — lines 158-166

Replace the single combined `<p>` with a two-line layout:

1. **Line 1:** Client name only — always fully visible, `truncate` on its own
2. **Line 2:** Services — `truncate` on its own line, so they get more horizontal space

```tsx
<div className="flex-1 min-w-0">
  <p className="font-medium text-lg text-[hsl(var(--platform-foreground))] truncate">
    {appointment.client_name || 'Walk-in'}
  </p>
  {appointment.service_name && (
    <p className="text-base text-[hsl(var(--platform-foreground-muted))] truncate mt-0.5">
      {appointment.service_name}
    </p>
  )}
</div>
```

This gives services a full line width to display before truncating, and the client name is never cut off by long service lists. The card height grows by ~20px for one extra text line — acceptable for the "enlarged for fast-paced environment" context.

Single file, one block change.

