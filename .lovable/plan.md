

## Auto-Collapse on Configure + Green Ghost Badge

### Changes

**1. Auto-collapse after "Finalize Configuration" click**

In the `onClick` handler for the "Finalize Configuration" button (~line 829–832), after the mutation, collapse the row by removing its ID from `expandedIds` with a short delay (e.g., 400ms) so the user sees the "Configured" state briefly before it collapses smoothly via the existing `AnimatePresence` animation.

```tsx
onClick={(e) => {
  e.stopPropagation();
  updateService.mutate({ id: service.id, updates: { backroom_config_dismissed: true } });
  setTimeout(() => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(service.id);
      return next;
    });
  }, 400);
}}
```

**2. Green ghost "Configured ✓" badge in main row**

Update the badge on line 632 from `variant="outline"` with `text-primary` to a bright green ghost style:

```tsx
<Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
  Configured ✓
</Badge>
```

**3. Apply same auto-collapse to untracked footer** (if exists, around line 905–916)

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

