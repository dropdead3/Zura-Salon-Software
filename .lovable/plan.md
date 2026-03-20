

## Big Tappable Empty State for Bowl Mixing

### Change

**`src/components/dock/appointment/DockServicesTab.tsx`** — lines 238-258

Replace the empty state + separate "Add Bowl" button with a single large tappable area that fills the available space:

1. **Merge the empty state and Add Bowl button** into one full-area tap target when `allBowlCount === 0`
2. **Large FlaskConical icon** (w-16 h-16) with a pulsing violet glow ring around it
3. **Single line of text**: "Tap to start mixing your first bowl" in `text-base` weight
4. **The entire area is clickable** — triggers `setShowNewBowl(true)`
5. **Keep the separate "Add Bowl" button only when bowls already exist** (it's still needed for adding subsequent bowls)

```text
┌──────────────────────────────┐
│                              │
│                              │
│         🧪 (large icon)      │
│                              │
│  Tap to start mixing your    │
│        first bowl            │
│                              │
│                              │
└──────────────────────────────┘
  ↑ entire area is one big button
```

