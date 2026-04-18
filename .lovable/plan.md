

## What's broken

1. **Emojis** in `InsightsNudgeBanner.tsx` lines 105 and 106 — the `🌱` violates the brand voice rule (no emojis in UI copy, ever).
2. **View Insights button** (line 109): `<Link to={dashPath('/')}>` just navigates to the same dashboard page. The Insights drawer isn't a route — it's local state (`activePanel`) inside `CommandCenterControlRow` (line 79). Clicking the button reloads the same view; the drawer never opens.

## Fix

### 1. Strip the emojis (`InsightsNudgeBanner.tsx` lines 105-106)
```ts
// before
`...growth tips ready for you — let's grow! 🌱`
`...growth tips waiting for you — let's grow! 🌱`

// after
`...growth tips ready for you.`
`...growth tips waiting for you.`
```

Also retones away from "let's grow!" — exclamation-led marketing copy violates brand voice (calm, declarative, no exclamation-heavy copy per `.cursor/rules/brand-voice.mdc`).

### 2. Wire "View Insights" to actually open the drawer

The drawer state is local to `CommandCenterControlRow`. Lifting it to a context just for one banner is overkill. Use a lightweight global event — same pattern already used in `src/lib/preview-utils.ts` (`triggerPreviewRefresh`).

**a. Banner** (`InsightsNudgeBanner.tsx`): replace `<Link>` with a `<Button onClick>`:
```tsx
<Button
  size={tokens.button.card}
  variant="outline"
  onClick={() => window.dispatchEvent(new CustomEvent('open-insights-panel'))}
  className="..."
>
  View Insights
</Button>
```

**b. Listener** (`CommandCenterControlRow.tsx`): add a `useEffect` that listens for `open-insights-panel`, sets `activePanel = 'insights'`, then scrolls the expansion area into view:
```ts
useEffect(() => {
  const handler = () => {
    setActivePanel('insights');
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  window.addEventListener('open-insights-panel', handler);
  return () => window.removeEventListener('open-insights-panel', handler);
}, []);
```

Smooth scroll respects `prefers-reduced-motion` natively in modern browsers; no extra work needed.

## Verification
- Banner copy: no emoji, no exclamation, calm declarative tone
- Click "View Insights" → page smooth-scrolls down to the control row → Insights drawer expands with personal/leadership content
- Click again or click the drawer trigger → toggles closed (existing behavior preserved)
- Works for both leadership (`AIInsightsPanel`) and non-leadership (`PersonalInsightsPanel`) since the event just flips `activePanel`

## Files
- **Modify**: `src/components/dashboard/InsightsNudgeBanner.tsx` (copy + button)
- **Modify**: `src/components/dashboard/CommandCenterControlRow.tsx` (event listener)

## Out of scope
- Lifting `activePanel` into a context (over-engineering for one cross-component trigger)
- Auto-scrolling to a specific insight category (banner is generic; opening the drawer is enough signal)
- Sweeping other emoji uses in the codebase (separate audit pass)

