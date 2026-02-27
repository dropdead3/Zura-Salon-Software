

## Move Help Text Into the Alert Notice

The contextual help block (lines 397-401) should be merged into the existing destructive alert (lines 374-381), not floating as a separate element. Remove the standalone `div` and append the visibility management instruction directly inside the alert's `<p>` tag.

### Change — `src/components/dashboard/website-editor/StylistsContent.tsx`

**1. Update the alert text (lines 377-379)** to append the help instruction after the existing message:

```tsx
<p className="text-xs text-destructive">
  <span className="font-medium">Sample cards hidden:</span> You have {visibleStylists.length} real stylist(s) visible. Sample cards only appear when no real stylists are visible.
  <span className="block mt-1.5 text-muted-foreground">
    To hide or show individual stylists, use the <span className="font-medium text-foreground">Visible</span> tab below.
  </span>
</p>
```

**2. Remove the standalone help block (lines 397-401)** — the separate `bg-muted/50` div between the Card and Tabs.

Single file: `src/components/dashboard/website-editor/StylistsContent.tsx`

