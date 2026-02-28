

## Fix: HeroEditor Missing Dirty State / Save Button

The HeroEditor already has `useEditorSaveAction` wired up (it responds to save requests), but it never tells the Hub that changes exist. Without dispatching `editor-dirty-state`, the Save button in the canvas header stays hidden.

### Change: `src/components/dashboard/website-editor/HeroEditor.tsx`

1. Import `useEditorDirtyState`
2. Track dirty state by comparing `localConfig` against `data` (the server state)
3. Call `useEditorDirtyState(isDirty)` so the Hub shows the Save button
4. Clear dirty state after successful save

Specifically:
- Add `import { useEditorDirtyState } from '@/hooks/useEditorDirtyState'` (line 7 area)
- Add a computed `isDirty` that checks `JSON.stringify(localConfig) !== JSON.stringify(data)` (after line 25)
- Call `useEditorDirtyState(isDirty)` right after the dirty computation
- This is zero-risk: the save handler already works via `useEditorSaveAction` — we're just surfacing the Save button that triggers it

