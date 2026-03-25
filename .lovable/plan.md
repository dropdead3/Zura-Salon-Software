

## Make "On This Appointment" Chips Purple

### Change — `src/components/dock/appointment/DockEditServicesSheet.tsx`

**Line 198**: Replace the chip background/border classes:
- From: `bg-[hsl(var(--platform-bg-card))] ... border border-[hsl(var(--platform-border)/0.3)]`
- To: `bg-violet-500/20 text-violet-300 border border-violet-500/30`

This gives the selected service chips a purple tint consistent with the Dock's violet accent system, making them visually distinct from the neutral category cards below.

