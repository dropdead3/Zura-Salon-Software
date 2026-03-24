

## Redesign Dock Hamburger Menu

**Current issues:** The menu feels flat and unstructured — nav items, quick actions, and lock station all blur together visually. The "Add Appointment" button looks like a duplicate nav item. Too much vertical space between elements. The title "Navigation" is generic.

### Design direction

Restructure into clear visual zones with subtle section grouping, tighter spacing, and better visual hierarchy:

1. **Header** — Remove the generic "Navigation" title. Show the staff member's name or station identifier instead (or simply remove the title and let the close button stand alone with the Demo badge).

2. **Nav items** — Tighten vertical rhythm from `py-3.5` to `py-3`. Use a subtle elevated card background (`bg-[hsl(var(--platform-bg-card))]`) as a grouped container around all nav items, with `rounded-2xl` and inner padding. This visually separates navigation from actions.

3. **Active indicator** — Replace the small dot with a left-edge accent bar (2px wide violet strip) for a more polished feel, similar to sidebar active states.

4. **Quick Actions section** — Give it a visible section label ("Quick Actions" in `DOCK_TEXT.category` style). Style the "Add Appointment" button as a distinct action — outlined/dashed border style rather than looking like another nav item.

5. **Lock Station** — Move into its own isolated zone at the bottom with more breathing room. Keep red styling but make it feel intentionally separated (not just another list item).

6. **Spacing & polish** — Reduce overall vertical gaps. Use `px-5` consistently (matching dock standard). The drag handle stays at the bottom.

### Files to change

**`src/components/dock/DockHamburgerMenu.tsx`**

- Remove "Navigation" heading (or replace with station name if available from props)
- Wrap nav items in a grouped card container: `bg-[hsl(var(--platform-bg-card)/0.5)] rounded-2xl p-1.5`
- Change active indicator from dot to left border accent
- Reduce item padding from `py-3.5` to `py-3`
- Add "Quick Actions" category label above the Add Appointment button using `DOCK_TEXT.category`
- Restyle Add Appointment as outlined: dashed border, no fill background, violet text
- Add more top margin before Lock Station for visual separation
- Standardize horizontal padding to `px-5`

One file updated. No logic changes — purely layout and visual hierarchy improvements.

