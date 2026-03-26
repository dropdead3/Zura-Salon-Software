

## Move "Adjust to $X" Button Inline with Health Badge

### Change

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**1. Move the "Adjust to $X" button (lines 1600–1632) inside the health badge row (line 1535's flex container)**, placing it right after the status pill `</div>` at line 1551. This puts it visually inline with the "27.49% of $225 service — consider raising..." prompt.

**2. Restyle the button to match the health badge pill** — same `bg-amber-500/10 text-amber-600` background, `text-[11px] font-sans px-2.5 py-1.5 rounded-md` sizing, no outline border. It should look like a sibling chip, not a separate CTA.

**3. Update the tooltip** to explain where the price surfaces: "Adjusts the base service price to $X. This will update the price on Service Tracking, the Price Intelligence engine, and any location/level overrides that reference this base price. Rounded up to the nearest $5."

**4. Remove the standalone block** (lines 1600–1632) since it's now inline.

### Result

The health row becomes:
```
[ 27.49% of $225 service — consider raising... ]  [ Adjust to $775 ⓘ ]
```

Both chips share the same amber styling. The tooltip on the adjust button explains exactly where the new price will take effect.

### Technical detail

- The button stays inside the `flex items-center gap-3 flex-wrap` container at line 1535
- Class changes: remove `variant="outline"`, `h-7`, `border-amber-500/30`, `rounded-full`, `mt-1.5`; add `bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1.5 rounded-md text-[11px] font-sans font-medium hover:bg-amber-500/20`
- Info icon (`Info` from lucide, `w-3 h-3 opacity-70`) appended inside the button as the tooltip trigger anchor

