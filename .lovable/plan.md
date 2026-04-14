

# Default Theme-Aware Splash Screen for Terminal Display

## What This Does
Organizations that haven't uploaded a custom splash screen will get a beautiful auto-generated default that uses their selected color theme palette (cream/rose/sage/ocean), their org logo centered, and the Zura "Z" icon anchored at the bottom. The simulator preview also becomes theme-aware with matching animated gradients.

## Current State
- `SplashScreen` and `IdleScreen` in `S710CheckoutSimulator.tsx` use hardcoded emerald-500 gradients
- `handleGenerateFromLogo` in `SplashScreenUploader.tsx` uses a hardcoded `#0f0f0f → #1a1a2e → #0f0f0f` gradient
- `colorThemes` in `useColorTheme.ts` already has dark-mode HSL values per theme (bg, accent, primary) — perfect gradient source
- No connection exists between the org's selected theme and the terminal display

## Plan

### 1. Create theme gradient palette map
**New utility: `src/lib/terminal-splash-palettes.ts`**

Maps each `ColorTheme` to concrete hex/HSL colors for canvas rendering and CSS:
```text
cream  → #0a0a08 → #2d2820 → #0a0a08, accent: #b8a77a
rose   → #140a0c → #3d1a24 → #140a0c, accent: #d4728a  
sage   → #0a100c → #1a3d26 → #0a100c, accent: #5cb87a
ocean  → #0a0c14 → #1a2640 → #0a0c14, accent: #4a8ad4
```
Each entry includes: `gradientStops` (3-stop vertical), `accentColor`, `accentGlow` (for subtle radial), `textColor`, `mutedColor`.

### 2. Update `S710CheckoutSimulator.tsx` — theme-aware screens
**Add `colorTheme` prop** to the simulator, passed from `CheckoutDisplayConcept`.

Update `SplashScreen`:
- Replace hardcoded `emerald-500/8` radial with theme accent glow
- Replace emerald gradient icon-box with theme accent gradient
- Replace `emerald-500/20` pulse ring with theme accent
- Org logo fades in with spring animation (existing), add a subtle continuous shimmer on the accent divider

Update `IdleScreen`:
- Replace `emerald-500/40` divider with theme accent
- Replace `emerald-500/20` pulse ring with theme accent
- Add a slow-moving gradient animation (CSS background-size animation) on the screen background

### 3. Update `SplashScreenUploader.tsx` — theme-aware generation
**Modify `handleGenerateFromLogo`** to:
- Import `useColorTheme` to get the current org theme
- Pull gradient stops from the palette map
- Paint the 1080×1920 canvas with the themed 3-stop gradient
- Add a subtle radial accent glow at center (behind logo)
- Draw org logo centered
- Draw business name below in theme text color
- Draw Zura "Z" icon at the bottom (load from SVG path data, render on canvas)
- Add "Powered by Zura" tiny text below the Z icon

### 4. Update `CheckoutDisplayConcept.tsx`
- Import `useColorTheme` and pass `colorTheme` to the simulator component
- Theme changes instantly reflect in the preview

### 5. Animations in the simulator (framer-motion, already available)
- **Splash**: Slow pulsing radial glow behind logo (scale 1→1.1→1 on the accent radial, 4s infinite)
- **Idle**: Breathing pulse ring uses theme accent instead of emerald
- **Transition**: Existing AnimatePresence crossfade between screens (already works)

Note: The actual physical S710 splash screen is a static image (Stripe limitation) — animations only appear in the dashboard simulator preview. The generated canvas image for upload will be a high-quality static frame.

## Files

| File | Action |
|------|--------|
| `src/lib/terminal-splash-palettes.ts` | New — theme-to-color palette map |
| `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` | Add `colorTheme` prop, replace all hardcoded emerald with palette-resolved colors |
| `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` | Use theme palette in `handleGenerateFromLogo`, add Zura Z icon to canvas |
| `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` | Pass `colorTheme` to simulator |

