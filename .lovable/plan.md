

# Merge "Need Action" Bar Into the Inventory Table

## Problem
The "need action" summary bar, filters row, and table are three visually separate blocks, creating a scattered layout.

## Approach
Wrap the decision header and filters into the `Card` that already contains the table, making it one cohesive unit with a unified border and background.

## Changes — `StockTab.tsx`

**1. Move the decision header (lines 444-512) inside the Card**
- Remove the standalone `div` wrapper and place the content as the first child inside the `<Card>` that wraps the table (line 673).
- Apply horizontal padding (`px-4 py-3`) and a bottom border (`border-b border-border`) instead of the current `rounded-full` pill styling, so it sits flush at the top of the card.

**2. Move the filters row (lines 515-595) inside the Card as well**
- Place it directly below the decision header, also with `px-4 py-3 border-b border-border`.

**3. Adjust the Card**
- Move the `<Card>` opening tag up to wrap all three sections (header, filters, table).
- The empty state stays outside/replaces the card when no results exist.

**Result layout:**
```text
┌─────────────────────────────────────────────────┐
│  191 need action  ·  191 Critical  ·  Est. PO   │  ← decision header
│─────────────────────────────────────────────────│
│  🔍 Search...  │ Category ▼ │ Status ▼ │ PDF │  │  ← filters
│─────────────────────────────────────────────────│
│  ☐  Product  │ Stock │ Suggested │ Status │ ... │  ← table header
│  ───────────────────────────────────────────────│
│  Row 1                                          │
│  Row 2                                          │
└─────────────────────────────────────────────────┘
```

Single file edit, purely structural — no logic or data changes.

