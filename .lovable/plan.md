

# Add "Dock App Preview" Tab to Platform Backroom Admin

## What
Add a new tab called **"Dock App"** (with a Tablet icon) to the platform-level Backroom Admin page (`/dashboard/platform/backroom`). This tab will serve as the development workspace for building the user-facing Zura Dock experience — the iPad/mobile mixing station UI where staff weigh products, create formulas, and manage bowls in real time.

## Why
Currently, the `MixSessionManager` and related mixing components exist but are only embedded inside the admin Backroom Hub. There is no dedicated space to build and preview the touch-optimized iPad/mobile mixing interface. This tab gives us a contained area inside the platform backend to prototype and iterate on the Dock UI.

## Implementation

### 1. Create the Dock App tab component
**New file:** `src/components/platform/backroom/DockAppTab.tsx`

A placeholder landing page with:
- Hero section: "Zura Dock — Mixing Station App" with subtitle explaining it's the user-facing iPad + scale experience
- Three feature cards outlining the core modules to build:
  - **Live Mixing** — Weighing, bowl management, product dispensing
  - **Formula Memory** — Client formula recall, clone, and save
  - **Session Review** — Reweigh, waste logging, session completion
- A "Launch Dock Preview" button (disabled/coming soon) that will eventually open a full-screen iPad-optimized view
- Device mockup context: badges for "iPad Optimized" and "BLE Scale Ready"

### 2. Add the tab to BackroomAdmin.tsx
- Import `DockAppTab` and the `Tablet` icon from lucide-react
- Add a new `TabsTrigger` with value `"dock-app"` and the Tablet icon + label "Dock App"
- Add corresponding `TabsContent`

### Files Changed
1. `src/components/platform/backroom/DockAppTab.tsx` — **new** (placeholder tab)
2. `src/pages/dashboard/platform/BackroomAdmin.tsx` — add tab trigger + content

