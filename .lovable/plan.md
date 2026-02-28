

## Move AI Insights Button Above Structure Tab Bar

### Current State
The "AI" tab sits inside the 4-button segmented control alongside Pages, Sections, and Nav. It blends in and is easy to miss.

### Target
Extract the AI/Insights button from the segmented control and render it as a standalone, visually prominent element above the tab bar — a full-width banner-style button with a sparkle icon and gradient accent.

### Changes

**1. `StructurePanel.tsx`**
- Remove `insights` from the `TABS` array (keep only Pages, Sections, Nav)
- Add a dedicated AI Insights button above the segmented control in the expanded panel header
- Style it as a full-width pill/banner: subtle gradient background (primary/10 to primary/5), sparkle icon, "AI Insights" label, font-display uppercase tracking
- Clicking it calls `onModeChange('insights')` same as before
- When active, apply a ring or border-primary highlight so it's clearly selected
- In collapsed icon-rail mode, render the sparkle icon at the top of the rail (above the divider), visually separated from the other tab icons

**2. `WebsiteSectionsHub.tsx`**
- No logic changes needed — `structureMode === 'insights'` still works the same way
- The `StructureMode` type keeps `'insights'` as a valid value

### Visual Layout (Expanded)
```text
┌─────────────────────────────────┐
│  ✨ AI Insights    [active glow] │  ← standalone button
├─────────────────────────────────┤
│  [Pages] [Sections] [Nav]       │  ← 3-tab segmented control
│  🔍 Search all sections… ⌘K    │
├─────────────────────────────────┤
│  (tab content)                  │
└─────────────────────────────────┘
```

### Files
- `src/components/dashboard/website-editor/panels/StructurePanel.tsx` — extract AI from tabs, add banner button

