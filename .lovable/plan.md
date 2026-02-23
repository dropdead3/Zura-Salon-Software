

## Canonize the Premium Floating Bento Panel Pattern

### Problem

The Appointments Hub detail drawer uses the default shadcn `Sheet` component (plain slide-in, no glass effect, no spring physics). Meanwhile, three other panels in the app already use the correct premium floating bento pattern:

- **AppointmentDetailSheet** (Schedule) -- `motion.div` with spring physics, glass bg, rounded-xl
- **ClientDetailSheet** -- Same pattern
- **BookingWizard** -- Same pattern

These three implementations each duplicate the same ~30 lines of backdrop + panel markup with slight inconsistencies (different damping values, different backdrop opacities, different z-index). There is no shared, reusable component.

### Solution

1. **Create a canonical `PremiumFloatingPanel` component** that encapsulates the full pattern as a single reusable wrapper.
2. **Refactor the Appointments Hub drawer** to use this new component instead of `Sheet`.
3. **Refactor the three existing panels** to use the shared component, eliminating duplication.

### 1. New Component: `src/components/ui/premium-floating-panel.tsx`

A headless wrapper that provides:

- **Backdrop**: `fixed inset-0 bg-black/20 backdrop-blur-sm` with fade animation
- **Panel**: `fixed right-4 top-4 bottom-4 rounded-xl bg-card/80 backdrop-blur-xl border-border shadow-2xl` with spring slide-in (`damping: 26, stiffness: 300, mass: 0.8`)
- **Mobile adaptation**: Full-width `rounded-none` on mobile via `useIsMobile`
- **Close button**: Floating pill in top-right corner
- **Props**: `open`, `onOpenChange`, `className` (for width override), `children`, optional `maxWidth` (default `440px`)

This becomes the single source of truth for the pattern.

### 2. Refactor: `AppointmentDetailDrawer.tsx` (Appointments Hub)

Replace the `Sheet`/`SheetContent` wrapper with `PremiumFloatingPanel`. The inner content (header, tabs, sections) stays the same -- only the shell changes. This gives the Appointments Hub drawer the same luxurious glass slide-in as the schedule panels.

### 3. Refactor: Existing Panels

Update these files to import and use `PremiumFloatingPanel` instead of their inline `motion.div` backdrop+panel markup:

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (lines ~650-675)
- `src/components/dashboard/ClientDetailSheet.tsx` (lines ~498-524)
- `src/components/dashboard/schedule/booking/BookingWizard.tsx` (lines ~270-290)

Each keeps its own internal content but delegates the shell to the shared component.

### Technical Details

**New file**: `src/components/ui/premium-floating-panel.tsx`

```text
Props:
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  maxWidth?: string        // default "440px"
  className?: string       // merged onto panel div
  backdropClassName?: string
  zIndex?: number          // default 50

Canonical animation values:
  backdrop: { opacity: 0 } -> { opacity: 1 }, duration 0.2
  panel: { opacity: 0, x: 80 } -> { opacity: 1, x: 0 }
         spring: damping 26, stiffness 300, mass 0.8
  mobile: right-0 top-0 bottom-0 w-full rounded-none
  desktop: right-4 top-4 bottom-4 w-[calc(100vw-2rem)] max-w-[440px] rounded-xl
```

**Files modified**:
| File | Change |
|------|--------|
| `src/components/ui/premium-floating-panel.tsx` | New canonical component |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Replace Sheet with PremiumFloatingPanel |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Replace inline motion.div shell with PremiumFloatingPanel |
| `src/components/dashboard/ClientDetailSheet.tsx` | Replace inline motion.div shell with PremiumFloatingPanel |
| `src/components/dashboard/schedule/booking/BookingWizard.tsx` | Replace inline motion.div shell with PremiumFloatingPanel |

No database changes. No new dependencies (framer-motion already installed).
