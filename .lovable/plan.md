

## Make Continue Button Sticky at Bottom of Client Step

### Change

**`src/components/dock/schedule/DockNewBookingSheet.tsx`** — `ClientStepDock` component (lines 572–686)

1. **Restructure layout**: Change the outer container from a single `flex flex-col` to separate the scrollable content from the sticky footer. The search results area (`flex-1 min-h-0`) needs `overflow-y-auto` so it scrolls independently.

2. **Make Continue button sticky**: Move the Continue button div (lines 674–684) outside the scrollable area. Give it a sticky/fixed bottom position with a subtle top gradient fade so it doesn't abruptly clip content. Style it to match other action buttons in the wizard (full-width, `rounded-full`, violet accent).

### Technical detail

```
Container (flex flex-col h-full)
├── Selected client banner (fixed height)
├── Search row (fixed height)
├── Results area (flex-1 overflow-y-auto) ← scrolls
└── Continue button (sticky bottom, bg gradient fade) ← always visible
```

- Remove `mt-auto` from the Continue wrapper — it's no longer needed since the button sits outside the scroll area
- Add `overflow-y-auto` to the search results div (line 621)
- Add a top gradient overlay (`bg-gradient-to-t from-[hsl(var(--platform-bg))]`) on the Continue wrapper for a clean fade effect

