

# Fix Tip Percentage Inputs — Allow Clearing and Quick Editing

## Problem
The `updatePercentage` function rejects empty or NaN values immediately, so you cannot delete digits from the input. It also saves to the database on every keystroke, making editing sluggish.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx`

1. **Add local string state for the three inputs** — `localPercentages` as `string[]` initialized from `localConfig.percentages`. This decouples typing from validation.

2. **Replace `updatePercentage`** with two handlers:
   - `handlePercentageChange(index, value)` — updates `localPercentages[index]` freely (allows empty string, any digits)
   - `handlePercentageBlur(index)` — on blur, parse the value, clamp 0-100, default to 0 if empty, then call `save()` and normalize the string state

3. **Wire inputs** — `value={localPercentages[i]}`, `onChange` calls `handlePercentageChange`, `onBlur` calls `handlePercentageBlur`. Change `type="number"` to `type="text" inputMode="numeric" pattern="[0-9]*"` for better mobile UX and to avoid browser number-input quirks.

4. **Sync effect** — when `config` changes (from server), update `localPercentages` from `config.percentages`.

This lets users freely type, clear, and re-enter values. Validation and save only happen on blur.

