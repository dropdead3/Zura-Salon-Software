

## Enhance Transaction Breakdown Panel UI

The current panel is functional but visually flat -- it reads like a plain list rather than a polished receipt experience. Based on the screenshot, the layout works but needs more visual hierarchy, better spacing, and a more premium feel consistent with the bento glass aesthetic.

### Changes to `TransactionBreakdownPanel.tsx`

**1. Category sections -- add subtle card treatment**
- Wrap each category in a `rounded-lg bg-muted/30 px-3 py-2.5` container to create visual grouping
- Category headers use `font-display` (Termina) with `text-[11px] uppercase tracking-[0.15em]` per token standards
- Icon uses `text-primary` instead of `text-muted-foreground` per design token rules for content-tile icons

**2. Item rows -- tighter, more refined**
- Add a subtle bottom border (`border-b border-border/40 last:border-0`) between items within a category
- Stylist name rendered as a small muted badge rather than parenthesized text
- Discount strikethrough gets a slightly more visible treatment with `text-muted-foreground/70`

**3. Summary section -- receipt-style hierarchy**
- Subtotal line items (Discounts, Tax, Tip) get consistent `py-1` spacing
- "Total Paid" uses `font-display text-base` (Termina) for emphasis without font-bold
- Payment method row gets a pill badge treatment: `rounded-full bg-muted/50 px-2.5 py-1 inline-flex`
- Add a subtle `border-t-2 border-border` above the Total Paid line for visual weight

**4. Refund history section -- card treatment**
- Each refund row gets a `rounded-lg bg-muted/20 px-3 py-2` wrapper
- Refund reason displayed as a second line in `text-xs text-muted-foreground` if present
- Date displayed alongside the status badge

**5. Action buttons -- match screenshot proportions**
- "Issue Refund" becomes the primary action: `flex-[2]` with `variant="outline"` and full height (`h-10`)
- "Copy Receipt" stays secondary: `flex-1` with `variant="ghost"`
- Both use `rounded-xl` to match bento card radius standard
- Icons sized at `w-4 h-4`

**6. Empty state refinement**
- Use `Receipt` icon with `text-primary` per token rules
- Add a subtle suggestion: "Transaction data will appear after POS sync"

### No other files change
- Hook logic, refund wizard, and drawer integration remain unchanged
- This is purely a UI polish pass on `TransactionBreakdownPanel.tsx`

| File | Change |
|---|---|
| `src/components/dashboard/appointments-hub/TransactionBreakdownPanel.tsx` | Visual polish: card-wrapped categories, receipt-style summary, refined buttons |

