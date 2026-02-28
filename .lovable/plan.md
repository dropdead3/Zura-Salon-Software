

## Enhance Nav Tab: Move Navigation Manager Into the Left Panel

### Problem
When the "Nav" tab is selected in the Structure panel, it shows only a useless placeholder saying "Edit menus in the Inspector panel →". The actual NavigationManager (menu selector, menu tree, item inspector, mobile config, publish bar) renders in the right Inspector panel. This splits the user's attention and makes the Nav tab feel empty and non-functional.

### Solution
Replace the `StructureNavTab` placeholder with the full `NavigationManager` content rendered inline in the left Structure panel. The Inspector panel can still show the item inspector when an item is selected, but the primary menu tree and controls live in the left panel where users expect them.

### Changes

**1. `src/components/dashboard/website-editor/panels/StructureNavTab.tsx`**
- Remove the placeholder UI entirely
- Render `NavigationManager` directly inside the component (inline, not as an Inspector redirect)
- Remove the `isActive`/`onActivate` props since we no longer need to signal the Inspector
- The component becomes a thin wrapper that renders `NavigationManager`

**2. `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**
- Update the `StructureNavTab` usage to remove `isActive`/`onActivate` props
- Adjust the Inspector panel logic: when `structureMode === 'navigation'` and a menu item is selected, the Inspector can still show `MenuItemInspector` for the selected item. Otherwise, the Inspector can be empty or show a contextual hint.
- Remove the `'navigation': NavigationManager` entry from the Inspector tab map since the nav content now lives in the Structure panel

**3. `src/components/dashboard/website-editor/navigation/NavigationManager.tsx`**
- Remove the outer `EditorCard` wrapper for the menu selector (it adds unnecessary nesting inside the Structure panel which already has its own container)
- Keep the same internal structure: menu selector dropdown, `MenuTreeEditor`, `MenuItemInspector` (for selected items), `MobileNavConfig`, `MenuPublishBar`
- Expose `selectedItemId` via a callback prop so the parent can optionally route the Inspector panel

### Technical Detail

The `NavigationManager` currently uses `EditorCard` wrappers around each sub-section (Menu Items, Item Settings, Mobile Settings, Publish). Inside the Structure panel, these should use lighter styling — remove outer `EditorCard` for the top-level menu selector and use `border-t` dividers instead, matching the density patterns established in the Layers tab.

The `MenuItemInspector` will render inline below the tree in the Structure panel (same as it does now in the Inspector). This keeps everything in one panel and eliminates the split-attention problem.

### Result
Clicking the "Nav" tab immediately shows the menu selector, menu tree, item editor, mobile config, and publish controls — all in the left panel. No more empty placeholder. No more "go to Inspector" redirect.

