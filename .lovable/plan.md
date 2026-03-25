

## Fix: Move Demo Badge Left to Avoid Overlapping Edit Services Button

### Problem
The global `DockDemoBadge` is positioned at `right-20` (80px from right edge), which lands directly on top of the "Edit Services" button in the appointment detail header.

### Fix — `src/components/dock/DockDemoBadge.tsx`

Change the positioning class from `right-20` to `right-52` (208px from right) so the badge sits clearly to the left of the Edit Services button with comfortable spacing between them.

```
Before: "absolute top-5 right-20 z-50 ..."
After:  "absolute top-5 right-52 z-50 ..."
```

### One file changed
`src/components/dock/DockDemoBadge.tsx`

