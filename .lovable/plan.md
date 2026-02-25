

## Enhance Preferred Work Schedule Card -- Description and Improvements

### What the User Asked
Add messaging to the Preferred Work Schedule card explaining that day selections affect booking availability and online scheduling visibility.

### Current State
The card description (line 905-907) reads:
> "Select the days you typically work at each location. Days cannot overlap between locations."

This is purely instructional. It says nothing about the downstream impact on booking or client-facing scheduling.

### Proposed Changes

**1. Update CardDescription text (line 905-907)**

Replace with:
> "Select the days you typically work at each location. Days cannot overlap between locations."

Add a second line below it:
> "These selections determine which days you are available for booking at each location and will be reflected on online scheduling."

This separates the instructional guidance from the operational impact, making the stakes clear without cluttering.

**2. Additional Improvements Identified**

| Gap | Suggestion |
|---|---|
| **No visual distinction for "no days selected" at a location** | When a location has zero days selected, show a subtle inline warning: "No availability set -- you won't appear in bookings for this location." This prevents accidental invisibility. |
| **CardTitle not using design tokens** | The title uses `text-lg` with inline icon. Should use `font-display text-base tracking-wide` per the UI Canon for card titles (Termina, uppercase). |
| **Day buttons use `rounded-lg`** | The rest of the platform uses `rounded-full` for pill-style interactive elements. These day toggle buttons should match. |
| **Missing info tooltip** | Per UI Canon, card titles should include a `MetricInfoTooltip`. A brief explanation like "Your work schedule controls when clients can book appointments with you" would reinforce the operational significance. |

### Files Changed

**`src/pages/dashboard/MyProfile.tsx`**

1. **Lines 905-907**: Update `CardDescription` to add booking/scheduling impact messaging.
2. **Lines 901-903**: Update `CardTitle` to use `font-display text-base tracking-wide` token pattern.
3. **Lines 980-986**: Update day button `rounded-lg` to `rounded-full` for pill consistency.
4. **After line 938** (inside each location block): Add a conditional warning when `currentSchedule.length === 0` -- a subtle `text-xs text-amber-500` note: "No days selected -- you won't appear in bookings for this location."

