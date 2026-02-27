

## Fix Per-Step State Persistence in Photo Wizard

Three bugs are causing the wizard to lose zoom/recomposition state between steps.

### Changes in `src/components/dashboard/ImageCropModal.tsx`

**1. Split rotation into per-step state**
- Replace single `rotation` state with `avatarRotation` and `cardRotation`
- Derive `currentRotation` / `setCurrentRotation` from `step` (same pattern as zoom/focal)
- Update all rotation references (`renderComposeFrame`, `renderControls`, `generateResizedBlob`, reset effect)

**2. Fix image load effect to not reset user-set zoom**
- Remove `setAvatarZoom(1)`, `setCardZoom(1)`, `setRotation(0)` from the `img.onload` callback (lines 127-129)
- These resets already happen in the modal-close effect (lines 98-100) and in `handleReplacePhoto` — no need to double-reset on image load, which can fire unexpectedly

**3. Make `handleFrameInteraction` use explicit step logic**
- Instead of capturing derived `setCurrentFocalX`/`setCurrentFocalY` via closure, use explicit conditionals inside the callback:
  ```ts
  if (step === 'card') {
    setCardFocalX(Math.round(x));
    setCardFocalY(Math.round(y));
  } else {
    setFocalX(Math.round(x));
    setFocalY(Math.round(y));
  }
  ```
- This eliminates any stale closure risk

