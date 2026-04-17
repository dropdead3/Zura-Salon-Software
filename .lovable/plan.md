

## Goal
Allow operators to close the checkout sheet during the rebook gate **without** being forced to mark a skip reason. Skip-reason capture should only be required when actively settling the checkout — not when backing out.

## Root cause
`handleOpenChange` in `CheckoutSummarySheet.tsx` (line 632–638) intercepts every close attempt during `gatePhase === 'gate'` and force-opens the decline dialog. This treats "wrong appointment, let me out" the same as "I'm settling without a rebook" — punishing both with mandatory reason capture.

```tsx
// Current (overzealous):
const handleOpenChange = (next: boolean) => {
  if (!next && open && gatePhase === 'gate' && !rebooked && appointment) {
    setDeclineDialogOpen(true);  // ← blocks any close, including misclicks
    return;
  }
  onOpenChange(next);
};
```

## Doctrine alignment
The structural gate's job is to block the **Charge button** (the irreversible action), not the **close button** (the reversible exit). The Charge button is already correctly gated — it only renders when `gatePhase === 'checkout'`. So the close interception is redundant *and* harmful: nothing money-affecting can happen while the gate is up, so closing is safe.

This aligns with: *Structural gates block the irreversible action, not the escape route. Misclicks are a normal cost of operation