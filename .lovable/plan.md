

## Improve Health Status Messaging: Dual Guidance

### Problem
When allowance is "high" (above 10% of service price), the UI only suggests raising the service price. It should also prompt the user to consider **reducing product usage / allowance amounts** — giving them both levers.

Similarly, when allowance is "low" (below 6%), it only says "room to increase product quality." It should also suggest **increasing the service price** as an alternative.

### Changes (`AllowanceCalculatorDialog.tsx`)

**1. "High" status inline text (line ~1043)** — Update from:
> `— consider $340 service price`

To:
> `— consider raising service price or reducing product usage`

**2. "Low" status inline text (line ~1044)** — Update from:
> `— room to increase product quality`

To:
> `— consider increasing product quality or adjusting service price`

**3. Tooltip description (line ~1066–1068)** — Expand the target explanation to mention both levers:
> `Target: 6–10% of service price (8% ideal). Adjust by changing service price or product amounts.`

**4. "Use suggested price" button tooltip (line ~1088)** — Append guidance about the alternative lever:
> `"...You can also reduce product quantities in the bowls above to bring costs down."`

**5. `allowance-health.ts` messages (lines ~87–93)** — Update the `message` strings to mention both options:
- High: `"Product cost is X% of service price. Consider raising service price to $Y or reducing product usage."`
- Low: `"Allowance is only X% of service price. You may increase product quality or reduce service price."`

| File | Change |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Update inline hints and tooltip copy for both high and low statuses |
| `allowance-health.ts` | Update message strings to reference both levers |

