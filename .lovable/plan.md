

## Fix Category Hover Highlight Padding

The breakdown rows use `px-1.5 -mx-1.5` which is too narrow — the hover highlight doesn't extend to match the card's inner padding. Both the Retail and Services breakdown rows need wider horizontal padding/negative margin to fill the card width.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

**Retail breakdown rows** (line 1126):
- Change `px-1.5 py-1 -mx-1.5` → `px-3 py-2 -mx-3` for proper edge-to-edge highlight

**Services breakdown rows** (line 1061):
- Change `px-1.5 py-1 -mx-1.5` → `px-3 py-2 -mx-3` to match

Also round up to `rounded-lg` for consistency with the card's `rounded-lg` inner containers.

Single file, two line changes.

