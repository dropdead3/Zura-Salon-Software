

## Enhance FAB Separation and Glass Effect in Dock

**Problem:** The FAB (AI Copilot button) on the schedule page blends into the cards beneath it. It uses `bg-card/80` which doesn't contrast well in the Dock's dark theme, and there's no visual separation between it and the content below.

**File:** `src/components/dashboard/HelpFAB.tsx` — line 50 and 60

### Changes

1. **Stronger glass effect on the FAB button** (line 60) — Replace the current button styling with Dock-aware dark glass:
   ```tsx
   className="h-14 w-14 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-300 bg-[hsl(var(--platform-bg-elevated)/0.6)] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.08] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-elevated)/0.8)] hover:scale-110 ring-1 ring-white/[0.04]"
   ```
   Key differences:
   - Uses `--platform-bg-elevated` instead of `bg-card` for proper dark theme integration
   - `backdrop-blur-2xl` (stronger blur) + `backdrop-saturate-150`
   - Double ring: `border border-white/[0.08]` + `ring-1 ring-white/[0.04]` for subtle depth
   - Deeper shadow with `rgba(0,0,0,0.5)` for lift off the surface

2. **Add a radial glow behind the FAB** (line 49-50) — Wrap the button area with a soft radial gradient pseudo-element to create separation from cards:
   ```tsx
   <motion.div
     className="fixed bottom-4 right-4 z-50"
     ...
   >
     {/* Radial glow behind FAB */}
     <div className="absolute inset-0 -m-6 rounded-full bg-[radial-gradient(circle,hsl(var(--platform-bg)/0.9)_0%,transparent_70%)] pointer-events-none" />
     <Tooltip>...</Tooltip>
   </motion.div>
   ```
   This creates a soft dark halo around the FAB that fades cards beneath it, providing clear visual separation without a harsh edge.

Single file change, two modifications.

