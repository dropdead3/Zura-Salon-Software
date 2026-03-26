

## Fix Dialog Layout — Pin Footer, Scroll Bowl Content

### Problem
When multiple products are added to a bowl, the content grows and pushes the Total Allowance and Save button below the viewport edge. The DialogContent uses CSS `grid` (from the base component) which doesn't properly constrain the middle scroll area between the pinned header and footer.

### Root Cause
Line 687: `DialogContent` has `max-w-2xl max-h-[90vh] p-0 overflow-hidden` but inherits `grid` from the base dialog component. Line 701: `ScrollArea` uses a hardcoded `max-h-[calc(90vh-200px)]` which doesn't adapt to the actual header/footer heights. The combination allows content to overflow.

### Fix (Single File)

**`AllowanceCalculatorDialog.tsx`**

1. **Line 687** — Add `flex flex-col` to DialogContent className so header, scroll area, and footer stack properly:
   ```
   className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col"
   ```

2. **Line 701** — Replace the hardcoded `max-h` on ScrollArea with flex-based sizing so it fills remaining space between header and footer:
   ```
   className="flex-1 min-h-0 overflow-hidden"
   ```
   `min-h-0` is critical — it allows the flex child to shrink below its content size, enabling the scroll area to actually scroll.

3. **Footer (line 954)** — Add `shrink-0` to the footer div so it never collapses:
   ```
   className="px-6 py-4 border-t border-border/40 bg-muted/30 shrink-0"
   ```

4. **Header (line 688)** — Add `shrink-0` to prevent header compression:
   ```
   className="px-6 pt-5 pb-4 border-b border-border/40 shrink-0"
   ```

### Result
- Header stays pinned at top
- Footer (total + save) stays pinned at bottom, always visible
- Bowl content scrolls independently in the middle
- Works regardless of how many products are added

| File | Action |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Fix 4 classNames for flex column layout |

