

## Persist Canvas Mode to localStorage

A small, focused change to mirror the existing viewport persistence pattern.

### Current State
- `viewportMode` is already persisted via `localStorage.getItem('editor-viewport')` (line 53-55)
- `canvasMode` initializes to `'edit'` with no persistence (line 57)

### Change

**File: `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`**

| Line | Current | Fixed |
|------|---------|-------|
| 57 | `useState<CanvasMode>('edit')` | `useState<CanvasMode>(() => (localStorage.getItem('editor-canvas-mode') as CanvasMode) \|\| 'edit')` |
| 65 | `setCanvasMode(mode);` | `setCanvasMode(mode); localStorage.setItem('editor-canvas-mode', mode);` |

Two lines. Follows the exact same pattern as `editor-viewport` on lines 53-55 and 73.

