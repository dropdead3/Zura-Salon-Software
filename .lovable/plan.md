

# Add Contextual Help to Inventory Leads Card

## Goal

Add a brief "what this does" section below the card description that proactively answers common questions: what happens when a lead is assigned, what appears on their profile, and what notifications they receive.

## Changes — single file: `InventoryLeadAssignmentCard.tsx`

### Add an informational helper section below the coverage count (lines 117-119)

Insert a collapsible or always-visible helper block with concise bullet points:

```tsx
<div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 space-y-1.5">
  <p className="text-xs font-medium text-muted-foreground">What happens when a lead is assigned?</p>
  <ul className="text-xs text-muted-foreground space-y-1 list-none">
    <li className="flex items-start gap-2">
      <UserCheck className="w-3 h-3 mt-0.5 shrink-0" />
      <span>They become the point of contact for inventory at that location</span>
    </li>
    <li className="flex items-start gap-2">
      <Bell className="w-3 h-3 mt-0.5 shrink-0" />
      <span>They'll receive low-stock alerts and reorder notifications for their location</span>
    </li>
    <li className="flex items-start gap-2">
      <BadgeCheck className="w-3 h-3 mt-0.5 shrink-0" />
      <span>An "Inventory Lead" badge will appear on their profile</span>
    </li>
    <li className="flex items-start gap-2">
      <RotateCcw className="w-3 h-3 mt-0.5 shrink-0" />
      <span>If no lead is assigned, the location's manager is used by default</span>
    </li>
  </ul>
</div>
```

This block sits inside the `CardHeader` area, after the coverage count line. It uses existing design tokens (`bg-muted/50`, `text-muted-foreground`) and icon conventions. Add `Bell` and `BadgeCheck` to the lucide imports.

| File | Action |
|---|---|
| `InventoryLeadAssignmentCard.tsx` | Add contextual help bullets in card header area |

