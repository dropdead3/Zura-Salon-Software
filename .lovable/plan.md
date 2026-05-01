# Promotional popup: auto-minimize after 15s + FAB reads "See Offer"

Two small changes to `src/components/public/PromotionalPopup.tsx`.

## 1. Auto-minimize after 15 seconds of no interaction

Today the popup stays open until the visitor clicks Accept, Decline, hits Esc, or closes the X. If they ignore it, it just sits there blocking content — the same friction the FAB was designed to solve, just delayed.

Add a single effect that arms a 15s timer when `open` flips true and calls `handleSoftClose()` on expiry:

- `handleSoftClose` already does the right thing: records a `'soft'` response (respects frequency cap, no false "decline" signal), closes the modal, and sets `showFab = true` so the offer collapses into the bottom FAB.
- Skip the timer when `isPreview` is true so operators QA'ing copy aren't fighting a countdown.
- Skip in `'always'` frequency? No — `handleSoftClose` already calls `markSessionDismissed()` which only matters for `'once-per-session'`. Other frequencies behave correctly.
- Any user interaction that closes the popup (Accept/Decline/Esc/X) cancels the timer automatically because the effect cleanup clears it when `open` flips false.

```text
useEffect:
  if !open or isPreview → return
  t = setTimeout(handleSoftClose, 15_000)
  cleanup → clearTimeout(t)
```

## 2. FAB label: "See Offer"

Currently the FAB on desktop reads `cfg.headline` (e.g. "Free Haircut with Any Color Service"), truncated. After auto-minimize this can read like the popup just moved positions rather than collapsed into a re-entry control.

Change the FAB's visible label to a fixed `See Offer` so the affordance is unambiguous. The `aria-label` keeps the headline for screen readers (`Reopen offer: ${cfg.headline}`) so context isn't lost. No layout change — `See Offer` is shorter than the current truncated headline, so the existing `max-w-[180px] truncate` is now effectively a non-op.

## Files touched

- `src/components/public/PromotionalPopup.tsx`
  - Add the 15s auto-minimize `useEffect` next to the existing Esc-key effect.
  - Replace `{cfg.headline}` inside the FAB button with the literal `See Offer` (keep the `aria-label` referencing the headline).

No DB, no edge functions, no design tokens. No other call sites change. Editor preview behavior is preserved (no auto-minimize during QA).

## QA after merge

1. Public visitor: load page → popup opens → wait 15s → popup collapses to bottom FAB labeled `See Offer`.
2. Click `See Offer` → popup re-opens.
3. Visitor interacts (Accept/Decline/Esc/X) within 15s → timer is cancelled, FAB behavior matches today.
4. Editor preview at `/org/<slug>?preview=true` → popup stays open indefinitely (no auto-minimize during QA).
5. Frequency cap honored — `'once-per-session'` will not re-trigger the popup on next page load after auto-minimize, but the FAB remains as the re-entry path.

## Suggested follow-ups

1. Make the 15s threshold operator-configurable (`autoMinimizeMs`) on the popup settings, defaulting to 15000. Some offers warrant a longer dwell.
2. Pause the auto-minimize countdown while the visitor's mouse is hovered over the popup (`mouseenter`/`mouseleave`) — current rule auto-collapses even mid-read, which is the right default but a hover-pause respects active engagement.
3. Tiny progress hairline along the bottom of the popup that depletes over 15s, telegraphing the minimize behavior so it never feels like the offer "vanished".
