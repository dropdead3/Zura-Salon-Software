

## Fix Edit/Preview Toggle Sizing

The Edit/Preview segmented control buttons are visually inconsistent with the adjacent viewport toggles (Desktop/Tablet/Mobile). The viewport buttons are compact icon-only pills, while Edit/Preview uses stacked icon+text at different proportions, making them look oversized.

### Change: `src/components/dashboard/website-editor/panels/CanvasHeader.tsx` (lines 150–183)

Update the Edit/Preview toggle buttons to use the same compact `px-2` sizing as viewport buttons, with the label placed inline to the right of the icon using a horizontal flex layout and matched `text-[10px]` sizing. Remove the `flex-initial` override that was causing inconsistent widths.

```tsx
{/* Edit / Preview mode toggle */}
<div className={editorTokens.segmented.container}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={() => onCanvasModeChange('edit')}
        className={cn(
          editorTokens.segmented.button,
          'inline-flex items-center gap-1.5 px-2.5',
          canvasMode === 'edit' && editorTokens.segmented.active
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span>Edit</span>
      </button>
    </TooltipTrigger>
    <TooltipContent>Edit mode — section cards &amp; controls</TooltipContent>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={() => onCanvasModeChange('view')}
        className={cn(
          editorTokens.segmented.button,
          'inline-flex items-center gap-1.5 px-2.5',
          canvasMode === 'view' && editorTokens.segmented.active
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        <span>Preview</span>
      </button>
    </TooltipTrigger>
    <TooltipContent>Preview mode — exact public site</TooltipContent>
  </Tooltip>
</div>
```

Key changes:
- Icon size bumped from `h-3 w-3` to `h-3.5 w-3.5` to match viewport icons
- `inline-flex items-center gap-1.5` ensures horizontal icon+label alignment
- `px-2.5` provides balanced padding matching viewport buttons
- Removed `flex-initial` and the redundant `text-[10px]` (inherits from `editorTokens.segmented.button` which already sets `text-xs`)

