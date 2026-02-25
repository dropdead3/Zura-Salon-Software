

## Adjust Default Editor/Preview Panel Split

The editor panel currently defaults to 55% width with the preview at 45%. The screenshot shows this makes the editor too wide — wasting horizontal space on the content side while squeezing the live preview. Since the editor content is optimized for narrow panels now, it doesn't need 55%.

### Change

**File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**

- **Line 790**: Change editor panel `defaultSize` from `55` to `42` (non-mobile)
- **Line 856**: Change preview panel `defaultSize` from `45` to `58`

This gives the live preview the majority of the space (58%) while the editor gets 42% — still plenty for single-column form inputs, and the preview becomes much more useful for seeing actual layout changes.

### Files Changed
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — default panel split adjustment

