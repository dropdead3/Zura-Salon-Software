

## Add Search Filter + Animated Drill-Down to Dock Service Selection

### What changes

**1. Search bar within the service list (Level 2)**
When drilled into a category, add a small search input at the top that filters services by name. Uses the existing `useDebounce` hook for smooth filtering. With categories like Blonding having 36 services, this is valuable for power users.

**2. Animated category↔service transition with framer-motion**
Wrap the Level 1 (category grid) and Level 2 (service list) views in `AnimatePresence` with `motion.div`. When drilling into a category, the category grid slides out left while the service list slides in from the right. Going back reverses the animation. Uses the project's standardized spring physics (damping: 26, stiffness: 300, mass: 0.8) per motion standards.

### Technical details

**File: `src/components/dock/schedule/DockNewBookingSheet.tsx`** — `ServiceStepDock` function

- Add `searchQuery` state and wire it to a `PlatformInput` with a `Search` icon placed above the service list in Level 2
- Filter `dedupedByCategory[selectedCategory]` by `searchQuery` (case-insensitive substring match on `name`)
- Wrap the conditional render (category grid vs service list) in `<AnimatePresence mode="wait">` with `motion.div` using `x` axis slide transitions:
  - Category grid: `initial={{ x: -40, opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`, `exit={{ x: -40, opacity: 0 }}`
  - Service list: `initial={{ x: 40, opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`, `exit={{ x: 40, opacity: 0 }}`
  - Transition: `type: "spring", damping: 26, stiffness: 300, mass: 0.8`
- Reset `searchQuery` to `''` when navigating back to categories

