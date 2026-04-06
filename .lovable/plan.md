

# Condensed Level Cards with Collapsible Details

## Current Problem
Each level card is ~120px tall even when not being edited because the description input, commission fields, and criteria section are always visible. With 7 levels, this creates excessive scrolling and visual noise.

## Design

Each level becomes a single-line row (~48px) with a chevron toggle to expand details:

```text
┌─────────────────────────────────────────────────────────────┐
│ ▲▼  ① New Talent  [Entry]  Svc 35% · Ret 10%  1 stylist ✎🗑 ▸ │
├─────────────────────────────────────────────────────────────┤
│ ▲▼  ② Studio Artist         Svc 38% · Ret 10%  2 stylists ✎🗑 ▾ │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Description: [input]                                    │   │
│   │ Commission: [Svc ___%]  [Ret ___%]                     │   │
│   │ ┌ Criteria ──────────────────────────────────────────┐  │   │
│   │ │ ↗ $5K rev · 12% retail · 60% rebook — 90d window  │  │   │
│   │ │ 🛡 Required to Stay: $3K rev · 8% retail — 30d    │  │   │
│   │ └───────────────────────────────────────────────────-┘  │   │
│   └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ ▲▼  ③ Core Artist            Svc 40% · Ret 10%           ✎🗑 ▸ │
└─────────────────────────────────────────────────────────────┘
```

**Collapsed state (default):** Single row — reorder arrows, number badge, name, entry tag, inline commission rates, stylist count, edit/delete icons, expand chevron.

**Expanded state:** Clicking the row or chevron reveals the description input, commission edit fields, and criteria summary/setup CTA below.

## Implementation

**File:** `src/components/dashboard/settings/StylistLevelsEditor.tsx`

1. Add `expandedLevels` state (`Set<string>`) to track which cards are open
2. Refactor each level card (lines 1062-1314):
   - Move the header row content into a clickable row that toggles expansion
   - Add a `ChevronRight` icon that rotates to `ChevronDown` when expanded
   - Wrap the "expanded content" div (description, commission fields, criteria) in a conditional render gated on `expandedLevels.has(level.id)`
   - When `editingIndex === index`, auto-expand that level
3. Remove the always-visible description input from the collapsed view — only show in expanded
4. Reduce card padding: `px-4 py-3` → `px-3 py-2` on collapsed, keep `px-4 pb-4` on expanded content
5. Keep all existing functionality (reorder, edit, delete, reassign, criteria wizard) unchanged

**No other files changed. No database changes.**

