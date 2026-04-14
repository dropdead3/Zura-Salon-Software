

# Fix Receipt Preview — White Background with Black Text

## Problem
The receipt preview in the Receipts tab inherits the dark dashboard theme (`bg-background`, `text-foreground`, `text-muted-foreground`). Real receipts are always printed on white paper or sent as white-background emails/texts. The preview should reflect reality.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx` — `ReceiptPreview` component

**Line 25** — Replace theme-aware classes with explicit white/black styling:
- `bg-background` → `bg-white`
- Remove `style={{ color: '#1a1a1a' }}` inline and set `text-black` directly

**Lines 34, 37, 39, 43-46** — Replace `text-muted-foreground` with explicit gray:
- `text-muted-foreground` → `text-gray-500` (for secondary text like address, phone, date, labels)
- `text-foreground` → `text-black` (for emphasis labels like "Client:", "Stylist:")

**Lines 53-55** — Table headers: `text-muted-foreground` → `text-gray-500`

**Lines 66-69** — Totals section: ensure black text

**Line 74** — Footer: `text-muted-foreground` → `text-gray-400`

**Border** — `border-border` → `border-gray-200` so the card outline also reads as a light paper edge

This is purely cosmetic — the actual `ReceiptPrintView.tsx` (the print/email output) already uses hardcoded white/black styles (`color: #1a1a1a`, no background set = white default), so it's correct. Only the in-app preview needs fixing.

