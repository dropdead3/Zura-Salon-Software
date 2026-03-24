

## Align New Bowl Sheet with Standard Dock Sheet Tokens

### Problem
The New Bowl sheet uses custom inline classes (`bg-[hsl(var(--platform-bg-elevated))]`, no backdrop blur, `max-h-[85vh]`) instead of the shared `DOCK_SHEET` tokens. This creates a visible color mismatch — the drawer appears as a separate, lighter panel against the darker page background.

### Change — `src/components/dock/mixing/DockNewBowlSheet.tsx`

Replace inline classes with standard tokens:

1. **Backdrop**: Change bare