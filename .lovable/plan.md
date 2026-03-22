

## Add Gradient Fade Above Floating Bottom Nav

**Problem:** The floating glass bottom nav sits directly over the appointment cards with no visual separation — cards are fully visible right up to the nav, making it feel cluttered.

**Approach:** Add a gradient overlay above the bottom nav that fades from transparent to the platform background color. This creates a natural "fade out" effect on the last visible cards, giving the nav breathing room.

**File:** `src/components/dock/DockLayout.tsx`

**Change:** Inside the `absolute bottom-0 inset-x-0 z-30` wrapper that holds `DockBottomNav`, add a gradient div above the nav:

```tsx
<div className="absolute bottom-0 inset-x-0 z-30">
  {/* Gradient fade above nav */}
  <div className="h-16 bg-gradient-to-t from-[hsl(var(--platform-bg))] via-[hsl(var(--platform-bg)/0.7)] to-transparent pointer-events-none" />
  <DockBottomNav activeTab={activeTab} onTabChange={onTabChange} onLockStation={onLogout} />
</div>
```

This adds a 64px tall gradient that darkens cards as they approach the nav, creating clear visual separation. The `pointer-events-none` ensures it doesn't block card interactions. Single addition, no other files affected.

