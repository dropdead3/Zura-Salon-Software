

## Fix: Gradient Should Sit Below the Bottom Nav, Not Above It

**Problem:** The gradient is placed above `DockBottomNav` in the absolute wrapper, creating a visible band between the last card and the nav. It should instead extend from the very bottom of the viewport upward, sitting behind the nav so cards fade out smoothly as they scroll under the entire nav area.

**File:** `src/components/dock/DockLayout.tsx`

**Change — lines 100-104:** Restructure the absolute wrapper so the gradient covers the full bottom area (nav height + fade zone) and sits behind the nav:

```tsx
<div className="absolute bottom-0 inset-x-0 z-30">
  <DockBottomNav activeTab={activeTab} onTabChange={onTabChange} onLockStation={onLogout} />
</div>
{/* Gradient fade — covers bottom area behind nav */}
<div className="absolute bottom-0 inset-x-0 z-20 h-32 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent pointer-events-none" />
```

Key changes:
1. Move gradient out of the nav wrapper into its own absolute div at `z-20` (below nav's `z-30`)
2. Increase height to `h-32` so the fade extends well above the nav
3. Remove the `via` stop — simple transparent-to-solid fade anchored at viewport bottom
4. Nav stays at `z-30`, gradient at `z-20` — cards fade smoothly under both

