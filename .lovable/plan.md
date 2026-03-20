

## Plan: Morphing Dock — macOS-style Bottom Navigation

### Concept
Replace the flat 5-icon bottom bar with a **floating dock** that has a sliding backdrop bubble animating between tabs. The active icon scales up with a soft glow, while inactive icons remain smaller. The whole bar floats above the bottom edge as a rounded capsule — visually distinct from the standard iOS tab bar pattern that Vish uses.

### Visual Design
```text
 ┌──────────────────────────────────────────────┐
 │                                              │
 │              (content area)                  │
 │                                              │
 │                                              │
 │    ╭─────────────────────────────────────╮    │
 │    │  📅   🧪   ⬤👥⬤   ⚖️   ⚙️  │    │
 │    ╰─────────────────────────────────────╯    │
 └──────────────────────────────────────────────┘

  - Floating capsule with rounded-2xl, inset from edges
  - Active tab: icon scales to 1.2x, label appears below
  - Sliding pill indicator animates behind active icon
  - Inactive tabs: icon only, no label (saves space, cleaner)
  - Subtle violet glow on the sliding pill
```

### Key Differentiators vs Vish
1. **Floating** — detached from bottom edge with margin, rounded capsule shape
2. **Animated indicator** — `framer-motion` `layoutId` pill slides between tabs (spring physics per your motion standards: damping 26, stiffness 300, mass 0.8)
3. **Scale morphing** — active icon scales up to 1.2x; inactive icons are uniform and smaller
4. **Label reveal** — only the active tab shows its label (fades in); inactive tabs are icon-only
5. **Glassmorphism** — translucent backdrop blur with a subtle border glow

### Technical Changes

**`src/components/dock/DockBottomNav.tsx`** — Full rewrite
- Use `framer-motion`'s `motion.div` with `layoutId="dock-indicator"` for the sliding pill
- Active icon: `scale(1.2)` + violet glow shadow + label fades in with `AnimatePresence`
- Inactive icons: `scale(1)`, no label, muted color
- Container: `mx-4 mb-3 rounded-2xl` for the floating capsule effect
- Backdrop: `bg-[hsl(var(--platform-bg-elevated)/0.8)] backdrop-blur-xl border border-white/5`
- Spring config: `{ damping: 26, stiffness: 300, mass: 0.8 }` (matching existing motion standards)
- Respect `prefers-reduced-motion`: skip spring animation, use instant transitions

**`src/components/dock/DockLayout.tsx`** — Minor padding adjustment
- Add `pb-20` (or equivalent) to the content area to account for the floating nav no longer being flush with the bottom edge

### No other files affected
- Same tab IDs, same `onTabChange` contract, same icons
- Just a visual/interaction upgrade to the nav component

