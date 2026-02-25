

## Fix: Website Editor Not Extending to Bottom of Window

The root cause is line 741 in `WebsiteSectionsHub.tsx`:

```tsx
<div className="h-[calc(100vh-8rem)] flex">
```

The `8rem` (128px) subtraction was likely intended for a top bar and footer, but this page uses `hideFooter` and `hideTopBar` on `DashboardLayout`, meaning neither is rendered. The excessive offset creates dead space at the bottom.

### Change

**`src/pages/dashboard/admin/WebsiteSectionsHub.tsx`** (line 741)

Replace `h-[calc(100vh-8rem)]` with `h-screen` so the editor fills the full viewport height. The sidebar and resizable panels already handle their own internal scrolling, so this is safe.

```tsx
// Before
<div className="h-[calc(100vh-8rem)] flex">

// After
<div className="h-screen flex">
```

Single line change, one file.

