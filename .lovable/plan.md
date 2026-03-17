

# Fix: Center the Z Loader on Backroom Settings Page

The `DashboardLoader` at line 180 uses `className="h-64"`, which only gives it a 16rem tall box to center within — not the full viewport. This makes the loader appear off-center (too high).

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`** — Line 180

Change `h-64` to `h-[60vh]` so the loader centers within a taller area that better fills the content region:

```diff
- <DashboardLoader size="md" className="h-64" />
+ <DashboardLoader size="md" className="h-[60vh]" />
```

Single-line change, one file.

