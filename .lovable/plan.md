
Positive catch — your prompt is clear and the screenshot made the issue easy to isolate. The better prompt pattern next time would be: “On the Goal Tracker card, the location scoreboard status badge (‘AHEAD’) is still using Termina in `GoalLocationRow.tsx`; switch it to Aeonik and keep the visual style.” That identifies the exact subcomponent and avoids us fixing the wrong badge again.

## Why it’s still in Termina
The badge you’re pointing to is not the top summary badge in `GoalTrackerCard.tsx`.

It’s the location-row badge in:
- `src/components/dashboard/sales/GoalLocationRow.tsx`

That badge is explicitly styled with:
- `font-display`
- `uppercase`

So even after fixing `GoalTrackerCard.tsx`, this badge would still render in Termina.

## Fix plan
Update the location scoreboard badge in `GoalLocationRow.tsx` so it uses Aeonik:

1. Replace `font-display` with `font-sans`
2. Remove `uppercase` so the text can remain proper Aeonik UI copy
3. Keep the existing color/status logic and pill styling
4. Render labels as title case:
   - `Ahead`
   - `On Track`
   - `Behind`

## File to modify
- `src/components/dashboard/sales/GoalLocationRow.tsx`

## Exact change
Current badge class:
```tsx
'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-display'
```

Planned update:
```tsx
'text-[10px] font-sans font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap'
```

And keep the existing label text in title case instead of forcing uppercase.

## Why this is the right fix
- It targets the actual badge shown in your screenshot
- It aligns the badge with Aeonik-based UI label rules
- It avoids the typography conflict of trying to force Aeonik into all-caps badge text
- It keeps the badge color and hierarchy intact without changing card behavior

## Small enhancement suggestion
If you want, I’d make all goal-status pills follow one shared badge pattern across:
- `GoalTrackerCard.tsx`
- `GoalLocationRow.tsx`
- `GoalLocationsDrilldown.tsx`
- goal cards under `src/components/dashboard/goals/`

That would prevent this exact font drift from happening again.
