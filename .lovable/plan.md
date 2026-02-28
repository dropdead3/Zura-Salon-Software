

## Fix Navigation Manager: Auto-Seed + Functional Gaps

### Root Cause: Empty Menu State
The `useSeedMenus` auto-seed `useEffect` in `NavigationManager.tsx` includes `seedMenus` in its dependency array. Since `useMutation` returns a new object every render, this creates a loop where the effect fires repeatedly but the mutation either gets cancelled or never completes. The menu selector shows "Choose menu..." because the database tables are empty.

### Changes

**1. Fix auto-seed infinite loop (`NavigationManager.tsx`, lines 27-31)**
- Replace `seedMenus` dependency with a stable ref-based approach using `useRef` to track whether seeding was attempted
- Only call `seedMenus.mutate()` once, guarded by a `hasSeeded` ref

**2. Add a "parent item" selector to `AddMenuItemDialog.tsx`**
- Currently new items can only be added at top level — no way to add children under a dropdown parent
- Add a "Parent Item" dropdown that lists all `dropdown_parent` items from the current menu
- When a parent is selected, set `parent_id` on the new item

**3. Add "Duplicate Item" action to `MenuItemInspector.tsx`**
- Add a "Duplicate" button next to Delete for quickly cloning a menu item
- Copies label (appending " (copy)"), type, URL, visibility, and places it after the original in sort order

**4. Add nesting via drag-drop support (`MenuTreeEditor.tsx` + `MenuItemNode.tsx`)**
- Currently drag-and-drop only reorders top-level items (`depth > 0` is disabled)
- Enable dragging child items within their parent group
- This is a targeted improvement — full cross-level nesting is complex and deferred

**5. Deselect item when switching menus (`NavigationManager.tsx`)**
- Already handled (line 71) but confirm `selectedItemId` resets are consistent

**6. Add "Contact Us" link type to seed data (`useWebsiteMenus.ts`)**
- Add `Contact Us` as a default seeded item in primary nav to match common salon nav patterns

### Technical Detail

The critical fix is item 1. The current code:
```tsx
useEffect(() => {
  if (menus && menus.length === 0 && !seedMenus.isPending) {
    seedMenus.mutate();
  }
}, [menus, seedMenus]); // seedMenus changes every render
```

Fix:
```tsx
const seedAttempted = useRef(false);
useEffect(() => {
  if (menus && menus.length === 0 && !seedAttempted.current) {
    seedAttempted.current = true;
    seedMenus.mutate();
  }
}, [menus]); // stable dependency
```

### Identified Gaps (Recommendations for Future)
- **No page-to-nav sync**: When a page is enabled with `show_in_nav: true`, it doesn't auto-create a menu item. Users must manually add it. A "Sync from Pages" button would bridge this.
- **No menu preview highlighting**: Editing a nav item doesn't highlight it in the canvas preview.
- **No "Contact Us" page link in nav**: The seeded nav items reference pages by URL string, not by `target_page_id`. This means broken-link validation can't catch mismatches. Seed should use page IDs where possible.
- **No undo/revert**: The version snapshot system exists but there's no UI to rollback to a previous version.
- **Footer menu has no dedicated editor**: The footer menu exists in the dropdown but has no specialized layout options (column grouping, social links section).

