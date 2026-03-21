

## Fix Dock Nav Indicator Centering

**Problem:** The glow circle indicator is centered relative to the full button height (`h-12`), but the icon sits in the upper portion of that space since the label occupies the bottom. This makes the glow appear displaced downward relative to the icon.

**File:** `src/components/dock/DockBottomNav.tsx`

**Approach:** Instead of centering the indicator relative to the button container, make the icon the positioning anchor. Wrap the icon `motion.div` in a relative container and place the indicator inside it, centered on the icon itself.

**Changes (lines 38-60):**

Replace the current indicator + icon structure with:

```tsx
{/* Icon wrapper — serves as anchor for indicator */}
<div className="relative flex items-center justify-center">
  {/* Sliding circle indicator — centered on icon */}
  {isActive && (
    <motion.div
      layoutId="dock-indicator"
      transition={SPRING}
      className="absolute w-11 h-11 rounded-full bg-violet-500/[0.12] shadow-[0_0_20px_rgba(139,92,246,0.15)]"
    />
  )}

  {/* Icon with scale morph */}
  <motion.div
    animate={{ scale: isActive ? 1.15 : 1 }}
    transition={SPRING}
  >
    <Icon className={cn(
      'w-5 h-5 transition-colors duration-150',
      isActive
        ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]'
        : 'text-white/40 hover:text-white/60'
    )} />
  </motion.div>
</div>
```

By nesting the indicator inside a wrapper that's sized to the icon (not the full button), the `absolute` positioning naturally centers the glow circle directly behind the icon. No translate hacks needed — a `flex items-center justify-center` parent with an `absolute` child centers it perfectly.

The label remains absolutely positioned relative to the outer button, unaffected by this change.

