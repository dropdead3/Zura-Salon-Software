

## Restyle Swipe Action Buttons to Match Dock Theme

**Problem:** The emerald and blue circles look disconnected from the dark premium Dock aesthetic. They need to feel integrated with the `--platform-*` token system and violet accent language.

**New design direction — Glass pill buttons with subtle tints:**

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

Replace the solid-color circles with translucent, glass-morphic pills that use the Dock's color language:

- **"Done" button:** `bg-emerald-500/15 border border-emerald-500/30 text-emerald-400` — subtle green tint, not a solid blob
- **"Client" button:** `bg-violet-500/15 border border-violet-500/30 text-violet-400` — uses the Dock's violet accent instead of blue

Both buttons:
- Shape: `rounded-xl` (softer pill, not full circle) at `w-14 h-14`
- Icon: `w-4.5 h-4.5` with matching tint color
- Label: `text-[9px] tracking-wide uppercase font-display` (matches Dock typography rules)
- Hover/active: `active:bg-emerald-500/25` / `active:bg-violet-500/25`
- Drop the `shadow-lg` (glass doesn't cast hard shadows in dark UI)

**Tray background:** Add a subtle gradient fade from transparent to `hsl(var(--platform-bg))/80` so the buttons don't float against raw dark space.

