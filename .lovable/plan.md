

## Add Styling / Content Toggle Tabs to Section Editors

### Problem
The "Section Styling" collapsible button at the top of the inspector is easy to overlook. Users miss it and only see the content fields.

### Solution
Replace the current layout (collapsible SectionStyleEditor above a divider above the content editor) with a two-tab toggle at the top: **Styling** and **Content**. Default to Content since that's the most common action.

### Implementation

**File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`** (~lines 623-648)

1. Add local state `inspectorTab: 'content' | 'styling'` (default `'content'`), reset to `'content'` when `activeTab` changes
2. Replace the current Zone A + divider + Zone B layout with:
   - A `FilterTabsList` (compact toggle tabs from the existing tabs component) with two triggers: "Content" and "Styling"
   - Conditionally render either the `SectionStyleEditor` or the `EditorComponent` based on the selected tab
3. When no `resolvedSection` exists (no styling available), skip the tabs and render the editor directly

**Visual structure:**
```text
┌─────────────────────────┐
│  [ Content ] [ Styling ]│  ← FilterTabsList toggle
├─────────────────────────┤
│                         │
│  (active tab content)   │
│                         │
└─────────────────────────┘
```

### Technical Details

- Uses existing `Tabs`, `FilterTabsList`, `FilterTabsTrigger`, `TabsContent` from `@/components/ui/tabs` — no new components needed
- The `inspectorTab` state resets when `activeTab` changes (via `useEffect`) so switching sections always lands on Content
- The Paintbrush icon + "Active" badge from `SectionStyleEditor` can be moved into the tab trigger for the Styling tab to preserve the visual indicator
- `SectionStyleEditor` internals will be unwrapped from the `Collapsible` and rendered directly inside the Styling tab content (the collapsible trigger is no longer needed since tabs handle the visibility)

### Scope
One file changed (`WebsiteSectionsHub.tsx`), one file simplified (`SectionStyleEditor.tsx` — remove the Collapsible wrapper, export the inner content directly since the tabs now handle show/hide).

