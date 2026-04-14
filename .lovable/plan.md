
You're right — the top-left glow is effectively missing in the current render.

What I found
- In `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`, the top-left glow is being drawn, but its center is exactly at `(0, 0)` with only `0.10` opacity and a `500px` radius.
- That means most of the glow sits off-canvas, so only a faint quarter of it appears inside the image.
- On a pure black background and reduced preview scale, it becomes so subtle that it reads like there is no glow at all.

Plan
1. Fix the corner-glow geometry in `handleGenerateFromLogo`
   - move the top-left glow center inward from the edge
   - move the bottom-right glow inward symmetrically
   - increase the glow radius so the light actually spreads into the visible canvas
   - slightly increase the opening opacity so the tan reads in the preview
   - use explicit fade stops so the glow falls off softly, without creating a band
2. Keep the background strictly black
   - retain the solid `#000000` fill
   - no linear gradient, no center reflection, no extra overlays
3. Rebalance visually
   - make the top-left glow clearly visible
   - keep the bottom-right glow matched in strength
   - preserve the subtle luxury look rather than making either corner bright or foggy

File to update
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`

Likely implementation shape
```ts
const glowInset = 180;
const glowRadius = 760;

const tlGlow = ctx.createRadialGradient(
  glowInset, glowInset, 0,
  glowInset, glowInset, glowRadius
);
tlGlow.addColorStop(0, p.accentRgba(0.18));
tlGlow.addColorStop(0.55, p.accentRgba(0.06));
tlGlow.addColorStop(1, p.accentRgba(0));

const brGlow = ctx.createRadialGradient(
  TARGET_W - glowInset, TARGET_H - glowInset, 0,
  TARGET_W - glowInset, TARGET_H - glowInset, glowRadius
);
```

Prompt feedback
- Your prompt was clear. The miss here was implementation, not instruction quality.
- An even tighter version for future visual requests would be:
  `Pure black background. Two visible tan radial glows only. Centers should sit inside the canvas near the top-left and bottom-right corners so both glows are clearly visible in the preview. No center gradient.`

Possible enhancement after this fix
- I’d recommend moving the glow values into named constants so future edits can’t accidentally push the glow back off-canvas again.
