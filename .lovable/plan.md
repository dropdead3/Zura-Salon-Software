

## Add Subtle Purple-Blue Gradient to PIN Entry Screen

### Change

**File:** `src/components/dock/DockPinGate.tsx`

**Line 95** — Add a radial gradient overlay emanating from the top-left corner behind all content. Update the root `div` to include a `::before`-style gradient using a nested absolute-positioned div:

```
<div className="platform-theme platform-dark absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
  {/* Gradient accent */}
  <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.12)_0%,rgba(59,130,246,0.06)_40%,transparent_70%)] pointer-events-none" />
```

This creates a soft violet-to-blue radial wash from the top-left that fades to transparent, staying subtle against the dark background. The `pointer-events-none` ensures it doesn't interfere with tap targets.

### Visual Effect
- Top-left corner: soft violet glow (`rgba(139,92,246,0.12)`)
- Transitions into blue (`rgba(59,130,246,0.06)`)
- Fades to fully transparent by ~70% of the ellipse radius
- Covers roughly the top-left 60% of the screen area

### Single file, single line insertion.

