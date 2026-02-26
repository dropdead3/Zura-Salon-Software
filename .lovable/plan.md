

## Fix Preview & Publish Button Sizing + Remove Dot Indicator

### Problem

From the screenshot:
1. **Preview** button uses `h-8 px-3` with `size="sm"` — compact
2. **Publish** button (from `PublishChangesButton`) uses `size="sm"` with default Button padding — slightly different sizing
3. The **pulsing dot** (`animate-pulse` circle at `-top-1 -right-1`) on the Publish button has no tooltip or context — it looks like a rendering artifact

### Changes

#### 1. `PublishChangelog.tsx` — `PublishChangesButton` (lines 108-125)

Update the Publish button to match Preview's exact sizing (`h-8 px-3`) and remove the dot indicator entirely:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setOpen(true)}
  className="h-8 px-3 gap-1.5"
>
  <Globe className="h-3.5 w-3.5" />
  Publish
</Button>
```

Removed:
- `relative` class (no longer needed without dot)
- The entire `{hasChanges && <span className="absolute ..." />}` dot indicator block
- `totalChanges` can stay in the destructured hook for the dialog, but is no longer used in the button

#### 2. `CanvasHeader.tsx` — Preview button (line 199)

Minor cleanup — add `gap-1.5` and remove the manual `mr-1.5` on the icon for consistency with Publish:

```tsx
<Button variant="outline" size="sm" className="h-8 px-3 gap-1.5" onClick={onPreview}>
  <ExternalLink className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Preview</span>
</Button>
```

### Files

| File | Change |
|---|---|
| `src/components/dashboard/website-editor/PublishChangelog.tsx` | Match button size to `h-8 px-3`, remove dot indicator |
| `src/components/dashboard/website-editor/panels/CanvasHeader.tsx` | Normalize Preview button gap styling |

Two small edits. Both buttons will render identically sized with consistent icon spacing.

