

## Improve "Tap to Start Mixing" Empty State

### Changes

**`src/components/dock/appointment/DockServicesTab.tsx`** — lines 239-253

1. **Floating animation on icon** — wrap the icon container in a `motion.div` with a gentle `y` oscillation (0 → -6 → 0, 3s loop) for a breathing/floating feel instead of the flat pulse

2. **Better text hierarchy** — split into two lines:
   - Primary: **"Start Mixing"** in `text-lg font-semibold` with violet-300 color
   - Subtitle: "Tap anywhere to add your first bowl" in `text-sm text-muted-foreground`

3. **Replace pulse with a softer glow ring** — swap `animate-pulse` for a slower custom keyframe glow (`opacity 0.3 → 0.6`, 2.5s ease) so it feels premium rather than urgent

4. **Larger icon circle** — bump from `w-20 h-20` / `w-10 h-10` to `w-24 h-24` / `w-12 h-12` for more visual presence on the iPad screen

