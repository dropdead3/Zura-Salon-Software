

## Improve Visual Separation Between Bottom Nav and Appointment Cards

**Problem:** The bottom nav (FAB) and appointment cards share a very similar dark color palette (`platform-bg-elevated` with low-opacity borders), making them blend together visually despite the gradient overlay.

### Changes — `src/components/dock/DockBottomNav.tsx`

Increase the nav's visual prominence and contrast against the cards:

1. **Stronger background opacity:** `bg-[hsl(var(--platform-bg-elevated)/0.75)]` → `bg-[hsl(var(--platform-bg-elevated)/0.95)]` — makes the nav more opaque and solid vs the translucent cards

2. **Stronger border:** `border-white/[0.06]` → `border-white/[0.12]` — doubles border visibility

3. **Add a top glow/shadow:** Add an upward-facing box shadow to create depth separation from the cards above:
   ```
   shadow-[0_-4px_24px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.4)]
   ```

4. **Subtle violet tint on the nav background** to differentiate it from the neutral card surfaces:
   ```
   bg-[hsl(var(--platform-bg-elevated)/0.95)]
   ```
   Add an inner glow via a ring: `ring-1 ring-violet-500/[0.06]`

### Changes — `src/components/dock/DockLayout.tsx`

5. **Increase gradient height** from `h-52` to `h-56` for more fade runway between last card and nav.

Two files, class-level adjustments only.

