
## Prompt review

Tight and unambiguous — you specified the trigger condition ("when viewing today's date"), the label ("Today"), and the placement ("above the day and date"). Teaching note: this prompt works because it leaves zero room for misinterpretation about *where* the new element goes. A future micro-improvement: state styling preference (subtle vs. emphasized) when the answer isn't obvious — here it is, since the existing two-line layout already establishes a clear visual hierarchy to follow.

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx` (lines 247–265), the centered date trigger renders two layouts:

- Compact (< @xl): single line — `Thu · Apr 16`
- Full (@xl+): two lines — weekday name on top, full date below

`isOrgToday(currentDate)` is already in scope (line 133, used elsewhere in the same file). When true, we prepend a small "TODAY" eyebrow above the existing weekday/date stack — and a discreet inline marker in the compact layout.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Inside the trigger button (lines 252–264):

**Two-line (@xl+) layout** — add a TODAY eyebrow above the weekday line:

```tsx
<div className="hidden @xl/schedhdr:block">
  {isOrgToday(currentDate) && (
    <div className="text-[10px] font-display tracking-[0.2em] text-primary uppercase">
      Today
    </div>
  )}
  <div className="text-xs font-display tracking-wide text-[hsl(var(--sidebar-foreground))]/70 truncate">
    {formatDate(currentDate, 'EEEE')}
  </div>
  <div className="text-sm font-display tracking-wide whitespace-nowrap truncate">
    {formatDate(currentDate, 'MMMM d, yyyy')}
  </div>
</div>
```

**Compact (< @xl) layout** — add a small TODAY eyebrow above the single date line:

```tsx
<div className="@xl/schedhdr:hidden">
  {isOrgToday(currentDate) && (
    <div className="text-[9px] font-display tracking-[0.2em] text-primary uppercase leading-none mb-0.5">
      Today
    </div>
  )}
  <div className="text-sm font-display tracking-wide whitespace-nowrap">
    {formatDate(currentDate, 'EEE')} · {formatDate(currentDate, 'MMM d')}
  </div>
</div>
```

### Styling rationale

- `font-display` + uppercase + wide tracking matches the Termina canon for eyebrow labels.
- `text-primary` ties it to the same purple accent used for the selected-date pill in the calendar — visual consistency across surfaces.
- `text-[10px]` / `text-[9px]` keeps it as a quiet eyebrow, never competing with the date itself.
- Renders only when `isOrgToday(currentDate)` is true — silent the rest of the time (matches "silence is meaningful" doctrine).

## Acceptance checks

1. When viewing today's date, a small purple "TODAY" label appears above the weekday in both layouts.
2. Navigating to any other date hides the label completely.
3. No layout shift on the date pill (eyebrow is small, sits above existing content).
4. Typography uses `font-display`, no banned weights.
5. Click behavior on the date pill (opens date picker) unchanged.

## Out of scope

- Changing existing weekday/date typography or sizes.
- Adding the indicator anywhere else (sidebar, agenda, etc.).
- Tooltip or hover states on the new label.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — conditional "Today" eyebrow above both compact and full date layouts.
