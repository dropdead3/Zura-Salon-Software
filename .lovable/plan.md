

## iOS Mail–Style Swipe Actions on Dock Appointment Cards

### What We're Building

Replace the 3-dot kebab menu with an iOS Mail–style swipe-left gesture that reveals two action icons behind the card:
- **Complete** (checkmark icon, green/violet background) — marks appointment completed
- **View Client** (user icon, blue background) — opens client quick view

Swiping left slides the card content to expose these icons. Tapping an icon triggers the action. Releasing mid-swipe snaps back. Cards in terminal status only show the "View Client" action.

### Implementation

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

1. **Structure change:** Wrap the card in a container with `overflow-hidden`. Behind the card content, place a right-aligned action tray (`absolute right-0`) with the two icon buttons.

2. **Swipe mechanics via `framer-motion`:**
   - Card content is a `motion.div` with `drag="x"`, `dragConstraints={{ left: -140, right: 0 }}`, `dragElastic={0.1}`
   - On drag end: if offset > 60px left, snap to `-140px` (open); otherwise snap back to `0`
   - Spring transition matching dock standard (`damping: 26, stiffness: 300, mass: 0.8`)

3. **Action tray:** Two circular icon buttons stacked horizontally:
   - `CheckCircle2` — `bg-emerald-600` (hidden when terminal)
   - `UserCircle` — `bg-blue-600`
   - Icons are `w-10 h-10 rounded-full` with centered white icons

4. **Remove kebab menu:** Delete the `MoreVertical` dropdown, `menuOpen` state, `menuRef`, and outside-click effect entirely.

5. **Tap still works:** The card `onClick` fires normally when there's no drag. `framer-motion` distinguishes taps from drags automatically.

### Single file change

| File | Change |
|------|--------|
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Replace kebab with swipe-to-reveal action tray |

