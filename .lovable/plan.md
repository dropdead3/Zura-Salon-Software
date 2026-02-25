

## Website Editor Layout Redesign

Great prompt — you're identifying a real UX friction point. The top bar hover-trigger zone (`h-10` hot zone at the top of the viewport) overlaps with the editor header, so when you move your mouse toward the undo/redo/open-site buttons, the dashboard top bar slides down and covers them. Combined with the dense three-panel layout (380px sidebar + editor + preview all competing for space), the experience feels cramped.

### Problems Identified

1. **Top bar overlay**: `DashboardLayout` uses `hideFooter` mode, which hides the top bar but adds an invisible `h-10` hot zone at the very top. When your mouse enters it (trying to reach editor controls), the full dashboard top bar slides down (`translate-y-0`) and covers the editor header buttons.

2. **Editor header is too tall**: The editor panel has a full header block (~72px) with icon, title, subtitle, undo/redo, and Open Site button — all stacked with `py-4 px-6` padding. This eats into the already constrained vertical space.

3. **Three-panel congestion**: Sidebar (380px) + editor panel + live preview, all inside `h-[calc(100vh-8rem)]`, leaves very little room for the actual editor content area.

### Plan

**File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**

1. **Compact the editor header into a slim toolbar** (lines 792-864)
   - Reduce from a two-row header to a single slim bar (~40px): sidebar toggle + breadcrumb label on left, undo/redo/open-site on right
   - Remove the large icon container and `text-xl` title — the sidebar already provides context
   - Change padding from `px-6 py-4` to `px-4 py-2`
   - Keep the breadcrumb subtitle as the only label (e.g., "Stylists Manager")

2. **Merge the Save bar into the toolbar** (lines 871-880)
   - Move the Save button into the right side of the compact toolbar, eliminating the separate bottom bar
   - Show "Unsaved" indicator as a small dot or text next to the Save button
   - This reclaims ~48px of vertical space at the bottom

3. **Reduce sidebar width from 380px to 300px** (line 730)
   - The sidebar content (nav items, search) doesn't need 380px — 300px is sufficient and reclaims 80px for the editor/preview panels

**File: `src/components/dashboard/DashboardLayout.tsx`**

4. **Disable the top bar hot zone for the Website Editor** (lines 1182-1187)
   - The `hideFooter` prop triggers the auto-hide top bar with the `h-10` hot zone overlay
   - Add a new prop `hideTopBar` (or reuse `hideFooter` to also suppress the hot zone entirely)
   - When `hideTopBar` is true: don't render the hot zone trigger div and keep the top bar permanently hidden (`-translate-y-full` always), removing the overlay conflict entirely
   - The Website Editor has its own navigation (sidebar + toolbar) and doesn't need the dashboard top bar

### Technical Details

The hot zone is this element at line 1182-1187:
```tsx
{hideFooter && (
  <div className="hidden lg:block fixed top-0 left-0 right-0 h-10 z-50"
    onMouseEnter={() => setHeaderHovered(true)} />
)}
```

And the top bar itself at lines 1190-1201 uses `hideFooter && headerHovered` to toggle visibility. We'll add a `hideTopBar` prop that, when true, prevents both the hot zone and the top bar from rendering at all.

The compact toolbar replaces:
```
┌──────────────────────────────────────────────┐
│ [≡] [icon] WEBSITE EDITOR                   │
│            Stylists Manager                  │
│                         [↶] [↷] [Open Site] │
├──────────────────────────────────────────────┤
│                                              │
│              Editor Content                  │
│                                              │
├──────────────────────────────────────────────┤
│              [Save & Publish Changes]        │
└──────────────────────────────────────────────┘
```

With:
```text
┌──────────────────────────────────────────────┐
│ [≡] Stylists Manager  [↶][↷] [Open] [Save]  │
├──────────────────────────────────────────────┤
│                                              │
│              Editor Content                  │
│              (more vertical space)           │
│                                              │
└──────────────────────────────────────────────┘
```

### Files Changed
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — compact header, merge save bar, reduce sidebar width
- `src/components/dashboard/DashboardLayout.tsx` — add `hideTopBar` prop to suppress hot zone overlay

