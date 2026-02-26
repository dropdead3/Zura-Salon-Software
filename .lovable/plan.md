

## Make Website Preview Frame Rounded + Luxury Bento (Editor Only)

### Current State

The canvas surface (lines 134-155 of `CanvasPanel.tsx`) renders the iframe directly inside a `div` with `bg-muted/30`. Desktop mode goes full-width edge-to-edge with no breathing room, no rounded corners, and no elevation. Tablet/mobile modes add `rounded-lg` and a border, but desktop is raw and unframed.

### Plan

Two files changed. No public site modifications.

---

### 1. Add preview frame token to `editor-tokens.ts`

Add a new `previewFrame` token inside the `canvas` group:

```typescript
canvas: {
  surface: '...',
  controlStrip: '...',
  savedIndicator: '...',
  /** Luxury bento preview frame — wraps the iframe */
  previewFrame: 'rounded-[24px] overflow-hidden border border-border/20 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] bg-background',
}
```

- `rounded-[24px]`: luxury tier radius, slightly larger than panel `rounded-xl` (20px)
- `overflow-hidden`: clips all iframe content to the rounded boundary
- `border-border/20`: very subtle inner stroke
- Soft shadow for floating elevation
- `bg-background`: clean surface behind the iframe

### 2. Refactor `CanvasPanel.tsx` canvas surface (lines 133-155)

Replace the current canvas surface with a two-layer structure:

**Outer layer** (canvas background): provides breathing space and centering.
- `flex-1 overflow-hidden bg-muted/30 flex items-start justify-center p-6` (32px breathing space on all sides via `p-6`, with `p-8` / 48px at `lg:`)

**Inner layer** (preview frame): the luxury bento container.
- Uses the new `editorTokens.canvas.previewFrame` token
- Applies viewport width constraints (`max-w-[1280px]`, `max-w-[834px]`, `max-w-[390px]`)
- Applies zoom scaling
- `overflow-hidden` ensures scrollbars stay inside the rounded boundary
- `h-full` is replaced with a calculated height that accounts for padding

**Iframe**: unchanged, `w-full h-full border-0` inside the frame.

Concrete markup:

```tsx
{/* Canvas Surface */}
<div className="flex-1 overflow-hidden bg-muted/30 flex items-start justify-center p-6 lg:p-8">
  <div
    className={cn(
      'w-full h-full transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
      VIEWPORT_WIDTHS[viewportMode],
      editorTokens.canvas.previewFrame,
      viewportMode !== 'desktop' && 'mx-auto'
    )}
    style={{
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: 'top center',
    }}
  >
    <iframe
      ref={iframeRef}
      key={refreshKey}
      src={previewUrl || '/?preview=true'}
      className="w-full h-full border-0"
      title="Website Preview"
      onLoad={handleIframeLoad}
    />
  </div>
</div>
```

Key differences from current:
- Desktop now gets rounded corners + shadow + stroke (previously raw)
- Tablet/mobile remove the old `my-4 rounded-lg border shadow-lg` in favor of the unified token
- All viewport modes share the same luxury frame
- 32-48px breathing space ensures the frame floats, never touches edges
- `overflow-hidden` on the frame clips scrollbars inside the rounded boundary

### 3. Remove old viewport-specific styling

The current conditional on line 139:
```tsx
viewportMode !== 'desktop' && 'my-4 rounded-lg overflow-hidden border border-border shadow-lg bg-background'
```
This is removed entirely. The unified `previewFrame` token handles all modes.

### Files

| File | Change |
|---|---|
| `src/components/dashboard/website-editor/editor-tokens.ts` | Add `previewFrame` token to `canvas` group |
| `src/components/dashboard/website-editor/panels/CanvasPanel.tsx` | Refactor canvas surface to two-layer structure with breathing space and unified luxury frame |

No public site files. No database changes. Editor-only.

