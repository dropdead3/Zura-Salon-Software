

## Add "Reset Configuration" Button Next to Finalize Configuration

### Understanding
The footer bar that shows "Review complete? Mark as configured..." with the "Finalize Configuration" button needs a companion "Reset Configuration" button. This button resets the service back to its fully unconfigured state — clearing tracking, chemical flag, containers, allowance, and assistant features — and restores the "Needs Attention" amber styling.

### Changes

**File:** `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

**Both footer blocks** (tracked ~line 881, untracked ~line 968):

1. Add a "Reset Configuration" button to the left of "Finalize Configuration" in the non-dismissed (`else`) branch
2. The button uses `variant="ghost"` with muted/destructive-subtle styling (e.g., `text-muted-foreground hover:text-red-500 hover:bg-red-500/10`)
3. On click, it mutates the service back to unconfigured defaults:
   ```ts
   updateService.mutate({
     id: service.id,
     updates: {
       is_backroom_tracked: false,
       is_chemical_service: false,
       container_types: [],
       assistant_prep_allowed: false,
       smart_mix_assist_enabled: false,
       formula_memory_enabled: false,
       backroom_config_dismissed: false,
     }
   });
   ```
4. Import `RotateCcw` from lucide-react for the reset icon
5. Wrap both buttons in a `flex items-center gap-2` container on the right side

**Also update the "Reviewed" state** (dismissed branch): Replace the plain "Undo" text link with the same "Reset Configuration" button for consistency.

### Layout
```text
┌─────────────────────────────────────────────────────────────────┐
│ Review complete? Mark as configured...   [Reset]  [> Finalize] │
└─────────────────────────────────────────────────────────────────┘
```

### Scope
- 1 file, ~20 lines added/modified
- No database changes

