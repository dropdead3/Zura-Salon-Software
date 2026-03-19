

# Badge the Status Column with Ghost Badge Styling

## Change

**File: `CommandCenterRow.tsx` (lines 365-378)**

Replace the current plain text dual-layer status (stock state + severity as stacked spans) with `Badge` components using `variant="outline"` (ghost style), matching the pattern from `LeadStatusBadge`.

### Current
```
Out of Stock   ← red text
Critical       ← red text, smaller
```

### New
Two small inline badges stacked vertically (or side-by-side if space allows):
- **Stock state badge**: `Out of Stock` with destructive ghost styling (`bg-destructive/10 text-destructive border-destructive/20`), or `In Stock` with success ghost (`bg-success/10 text-success border-success/20`)
- **Severity badge**: `Critical` / `Low` / `Healthy` with matching ghost colors from `SEVERITY_CONFIG`, using `bg-{color}/10 border-{color}/20` pattern

Import `Badge` from `@/components/ui/badge`. Both badges use `variant="outline"` with custom class overrides for the tinted ghost look. Size: `text-[10px] px-1.5 py-0 h-5`.

### Files
| File | Change |
|------|--------|
| `CommandCenterRow.tsx` | Import Badge, replace status text spans with ghost-styled Badge components |

