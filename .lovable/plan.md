

## Collapsible Group Sections for Left Editor Menu

### Problem
The left menu is a long scrollable list with all groups always expanded. As sections grow, it becomes hard to navigate. Groups like "Global Elements" and "Content Managers" take up space even when the user is focused on homepage layout sections.

### Solution
Make each group header collapsible with a chevron toggle. Groups remember their open/closed state. The group containing the active item auto-expands.

### Changes

**1. `src/components/dashboard/website-editor/SectionGroupHeader.tsx`**
- Add `collapsible` (boolean), `isOpen` (boolean), `onToggle` callback props
- When collapsible, render a ChevronRight/ChevronDown icon that rotates on toggle
- Wrap children display logic in parent (the header itself just signals toggle)
- Keep existing non-collapsible behavior as default for backward compatibility

**2. `src/components/dashboard/website-editor/panels/StructureLayersTab.tsx`**
- Add local state for collapsed groups: `collapsedGroups: Set<string>` (default all open)
- Wrap each group's item list in a conditional render based on collapsed state
- Auto-expand the group containing the currently active tab
- Apply to all three top-level groups: Global Elements, Content Managers, and each Homepage Layout sub-group
- Add a subtle animated height transition (CSS `grid-rows` trick or simple conditional render)

### Visual Structure
```text
┌──────────────────────────┐
│ ▾ GLOBAL ELEMENTS        │  ← click to collapse
│   Announcement Bar       │
│   Footer CTA             │
│   Footer                 │
├──────────────────────────┤
│ ▸ CONTENT MANAGERS       │  ← collapsed, saves space
├══════════════════════════┤
│   HOMEPAGE LAYOUT        │
│ ▾ Above the Fold         │
│   Hero Section           │
│   Brand Statement        │
│ ▸ Social Proof           │  ← collapsed
│ ▾ Services & Portfolio   │
│   ...                    │
└──────────────────────────┘
```

### Scope
Two files: `SectionGroupHeader.tsx` (add toggle UI), `StructureLayersTab.tsx` (add collapse state + conditional rendering).

