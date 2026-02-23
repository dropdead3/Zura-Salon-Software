

# Improve Appointment Card Badge Styling

## Summary

Upgrade the "No Check-In" and status badges (e.g., "Confirmed") in the top-right indicator cluster of appointment cards. The current badges are tiny (`text-[8px]`, minimal padding) and hard to read. They will be made larger, use `rounded-full` pill styling consistent with the design system, and scale responsively on smaller cards.

## Changes

**File: `src/components/dashboard/schedule/DayView.tsx`**

### 1. "No Check-In" badge (lines 507-510)

Current: `text-[8px] px-1 py-px rounded-sm`

Updated to:
- `text-[10px] px-2 py-0.5 rounded-full` for a proper pill shape
- Stronger color contrast: `bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300`
- Add `whitespace-nowrap` to prevent wrapping

### 2. Status badge (lines 512-517, e.g., "Confirmed")

Current: `text-[9px] px-1.5 py-0.5 rounded-full`

Updated to:
- `text-[10px] px-2 py-0.5 rounded-full` -- slightly larger text and padding to match the "No Check-In" badge proportionally

### 3. Other small badges in the cluster

- **AST badge** (line 502): bump from `text-[8px] px-1 py-px rounded-sm` to `text-[10px] px-1.5 py-0.5 rounded-full`
- **NEW badge** (line 505): bump from `text-[8px] px-1 py-px rounded-sm` to `text-[10px] px-1.5 py-0.5 rounded-full`

### 4. Responsive behavior

For compact cards (short appointments), the badges are already replaced by small icons (lines 470-475), which is the correct responsive behavior. No change needed there.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Increase badge sizes from text-[8px] to text-[10px], add rounded-full pill styling, improve padding and color contrast for "No Check-In", status, AST, and NEW badges |

