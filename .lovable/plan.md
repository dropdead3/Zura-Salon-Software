

## Reframe "Low" Health Status — Positive Margin Framing

The user makes an excellent point: salons should never be nudged to lower prices. Low allowance-to-service ratio means strong margins — that's a win, not a problem to fix.

### Changes

**1. `src/lib/backroom/allowance-health.ts`** — Update messaging
- Change `status: 'low'` message from "You may increase product quality or reduce service price" to a positive framing: "Strong margin. Room to elevate product quality or absorb price flexibility if needed."
- Keep `suggestedAllowance` calculation (useful context) but reframe it as "upgrade budget" rather than a corrective target.

**2. `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`**

- **Line 1587** — Health badge inline text: Change from "consider increasing product quality or adjusting service price" → "strong margin — room to upgrade product line"
- **Lines 1675–1735** — Remove the entire "reduce price" button/popover block (`lowPricePopoverOpen`, `suggestedLowPrice`, the Popover with "Reduce service price from $X to $Y?"). This action should not exist.
- **Line 1677–1679** — Reframe the target allowance pill from "Target allowance at 8%: $X" to "Upgrade budget: $X" with a tooltip explaining they could spend up to this amount on a more premium product line while staying within the ideal range.
- **Line 1731–1733** — Update tooltip from "reduce the service price" to "You have room to invest in a more premium product line, or maintain current margins as pricing flexibility."
- Remove `lowPricePopoverOpen` state variable (no longer needed).

**3. `src/lib/backroom/allowance-health.ts`** — Update comment block
- Line 8: Change "If below 6%: room to increase product quality or reduce service price" → "If below 6%: strong margin — room to upgrade product line or maintain pricing flexibility."

### Net effect
- "Low" becomes a positive signal, not a warning
- No price-reduction CTA exists anywhere
- The blue styling stays (informational, not alarming) but copy shifts to empowerment
- The "high" (amber) path remains unchanged — that's a genuine cost concern

