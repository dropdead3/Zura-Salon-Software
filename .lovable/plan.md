

# Add Quantity Guidance Tip to Hardware Order

## Problem
Users ordering terminal readers may not know how many to order. The quantity should match the number of checkout stations in their salon — some have 1, others have 3+. A contextual hint below the Quantity selector will guide this decision.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

**After the Quantity `<Select>` (line 438)**, add a helper text line:

```tsx
<p className={cn(tokens.body.muted, 'text-xs')}>
  Order one reader per checkout station in your salon.
</p>
```

This sits inside the existing `space-y-2` div wrapping the Label and Select, so spacing is automatic. No structural changes needed.

