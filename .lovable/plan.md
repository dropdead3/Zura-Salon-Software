

## Convert EditServicesDialog to Dock Bottom Sheet Pattern

### Problem
The `EditServicesDialog` renders as a centered Radix `Dialog` (fixed positioning, overlay escaping the device frame). In the Dock, all overlays must use the `absolute inset-0` bottom-sheet pattern with `framer-motion` slide-up, pull-to-dismiss, and platform dark tokens — exactly like `DockNewBookingSheet`, `DockClientQuickView`, and `DockNewClientSheet`.

### Approach
Create a **dedicated Dock variant** — `DockEditServicesSheet` — that reuses the service picker logic but renders as a proper Dock bottom sheet. The shared `EditServicesDialog` stays untouched for dashboard/hub use.

### New File: `src/components/dock/appointment/DockEditServicesSheet.tsx`

Follows the exact same skeleton as `DockNewBookingSheet` (lines 408-446):
- `AnimatePresence` wrapper
- `motion.div` backdrop: `absolute inset-0 bg-black/40 backdrop-blur-sm z-[60]` with tap-to-close
- `motion.div` sheet: `absolute inset-x-0 bottom-0 z-[61]` with `bg-[hsl(var(--platform-bg))]`, `rounded-t-2xl`, spring transition (`damping: 26, stiffness: 300, mass: 0.8`)
- Drag handle bar (`h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)]`)
- Pull-to-dismiss via `drag="y"` + `onDragEnd` threshold
- `maxHeight: '92%'`

**Content** — same logic as `EditServicesDialog` but with native Dock styling:
- Header: `font-display uppercase tracking-wide` title + X close button
- Search input: `bg-[hsl(var(--platform-bg-card))]` with platform border tokens
- Selected chips: platform card bg with `border-[hsl(var(--platform-border)/0.3)]`
- Category headers: `font-display uppercase tracking-wider text-xs`
- Service rows: `bg-violet-500/10` when selected, `hover:bg-[hsl(var(--platform-bg-card))]`
- Checkboxes: `bg-violet-500` when checked
- Footer: sticky bottom with summary text + `rounded-full bg-violet-500` save button

### Modified File: `src/components/dock/appointment/DockAppointmentDetail.tsx`

- Replace `EditServicesDialog` import with `DockEditServicesSheet`
- Remove `variant="dock"` prop (no longer needed)
- Pass same props (`open`, `onClose`, `currentServices`, `locationId`, `onSave`, `isSaving`)

### Tokenization Rules (for future Dock components)

Establish a shared constants file `src/components/dock/dock-ui-tokens.ts`:

```ts
export const DOCK_SHEET = {
  backdrop: 'absolute inset-0 bg-black/40 backdrop-blur-sm',
  panel: 'absolute inset-x-0 bottom-0 flex flex-col bg-[hsl(var(--platform-bg))] border-t border-[hsl(var(--platform-border))] rounded-t-2xl',
  dragHandle: 'mx-auto mt-3 h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0 cursor-grab active:cursor-grabbing touch-none',
  maxHeight: '92%',
  spring: { type: 'spring', damping: 26, stiffness: 300, mass: 0.8 },
  dismissThreshold: { offset: 120, velocity: 500 },
} as const;

export const DOCK_TEXT = {
  title: 'font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  subtitle: 'text-sm text-[hsl(var(--platform-foreground-muted))]',
  category: 'text-xs font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]',
  body: 'text-sm text-[hsl(var(--platform-foreground))]',
  muted: 'text-xs text-[hsl(var(--platform-foreground-muted))]',
} as const;

export const DOCK_INPUT = {
  search: 'w-full h-10 pl-10 pr-3 text-sm rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:ring-1 focus:ring-violet-500/50',
} as const;

export const DOCK_BUTTON = {
  primary: 'bg-violet-500 hover:bg-violet-600 text-white rounded-full',
  close: 'p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors',
  iconColor: 'text-[hsl(var(--platform-foreground-muted))]',
} as const;
```

### Files

| Action | File |
|--------|------|
| Create | `src/components/dock/dock-ui-tokens.ts` |
| Create | `src/components/dock/appointment/DockEditServicesSheet.tsx` |
| Modify | `src/components/dock/appointment/DockAppointmentDetail.tsx` — swap dialog → sheet |

