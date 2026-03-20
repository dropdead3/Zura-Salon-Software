

## Make "Tap to start mixing" a Full-Screen Centered Prompt

### Problem

The empty state renders as a small dashed-border card in the top-left. It should fill the entire content area and act as one big invisible tap target with the icon and text centered.

### Change

**`src/components/dock/appointment/DockServicesTab.tsx`** — lines 239-253

Replace the card-styled button with a borderless, full-area button that fills the remaining space:

- Remove `rounded-2xl border border-dashed border-violet-500/30 bg-violet-600/5 hover:bg-violet-600/10 min-h-[200px]`
- Use `flex-1 flex flex-col items-center justify-center` with no border, no background, no min-height — just the icon + text floating in the center of the available space
- On hover/active: subtle opacity shift only (`hover:opacity-80 active:opacity-60`)
- Keep the pulsing icon circle and text as-is, just centered in the full viewport area

