

## Two-Column Quick Actions Row

### Change — `src/components/dock/DockHamburgerMenu.tsx`

Merge "Add Appointment" and "Lock Station" into a single two-column grid under the "Quick Actions" label. Remove the separate Lock Station section.

**Lines 133–156** replaced with:

```tsx
{/* Quick Actions — two-column grid */}
<div className="px-5 mt-5">
  <p className={cn(DOCK_TEXT.category, 'px-1 mb-2')}>Quick Actions</p>
  <div className="grid grid-cols-2 gap-3">
    {onAddAppointment && (
      <button
        onClick={() => { onAddAppointment(); setOpen(false); }}
        className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-violet-500/30 text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/[0.06] transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span className="font-sans text-xs">Add Appointment</span>
      </button>
    )}
    <button
      onClick={handleLock}
      className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/[0.06] transition-colors"
    >
      <Lock className="w-5 h-5" />
      <span className="font-sans text-xs">Lock Station</span>
    </button>
  </div>
</div>
```

Both buttons become equal-sized tiles in a `grid-cols-2` layout. Lock Station adopts the same dashed-border card style but in red. Text switches to `font-sans text-xs` with icons stacked above labels for a clean tile look. One file, one section replaced.

