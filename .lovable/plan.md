

## Add Visibility Help to StylistsContent (Sample Cards Settings View)

The help block was added to `StylistsDisplayEditor` (the `stylists-section` tab), but the user is viewing `StylistsContent` (the `stylists` tab) which shows Sample Cards Settings. That's the component that needs the contextual instruction.

### Change

**`src/components/dashboard/website-editor/StylistsContent.tsx`**

Add a help block inside the `EditorCard`, between the Sample Cards Settings card and the Tabs section (~line 396, before `<Tabs>`):

- Muted info box (`bg-muted/50 rounded-lg border border-border/30 p-3`)
- Text: "To hide or show individual stylists on the homepage, switch to the Visible tab above and toggle their visibility. You can also manage display settings from the Stylists Display section."
- Link to the `stylists-section` tab: uses `onClick` to change the active tab (or a descriptive pointer since the "Visible" tab is already in this same component)

Since the "Visible" tab is already within this component, the help text should simply direct users to the "Visible" tab. No external link needed — just clear instructional copy placed below the Sample Cards Settings card.

```tsx
// After the Sample Cards Settings </Card> (~line 395), before <Tabs>:
<div className="p-3 bg-muted/50 rounded-lg border border-border/30">
  <p className="text-xs text-muted-foreground leading-relaxed">
    To hide or show individual stylists on the homepage, use the <span className="font-medium text-foreground">Visible</span> tab below. Toggle each stylist's visibility switch to control who appears on your site.
  </p>
</div>
```

Single file change: `src/components/dashboard/website-editor/StylistsContent.tsx`

