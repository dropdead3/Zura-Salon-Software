
## Goal
Three refinements to `RebookIntervalPicker.tsx`:
1. **Selected-state styling** — replace the heavy filled `data-[state=on]:bg-primary` look + corner dot ambiguity with a **purple ghost** (primary tint background, thick primary stroke) for both interval chips and the calendar day. Reads as "chosen" at a glance without competing with the recommended marker or capacity dot.
2. **Time-of-day awareness** — when computing calmest picks, also surface whether the **stylist's preferred time band** (derived from the original appointment's `start_time` → morning / afternoon / evening) is open on that day. A calm day with no morning slot when the client always books mornings is not a calm rebook.
3. **"Off this week" detection** — if the stylist has zero scheduled shifts on a candidate day (vs. just zero bookings), label the quick-pick chip **"Off"** and disable it, so the operator doesn't book a day the stylist isn't working.

---

## 1) Selected-state styling (token-compliant, "purple ghost")

**Doctrine:** No `font-bold/semibold`. Border + background tint > fill swap. Use `border-primary` + `bg-primary/5` + `ring-primary/30` for the active state. Move the "Recommended" affordance off the corner-dot collision course onto a small **label pill** under the chip.

### Interval chips (lines 282–311)
```tsx
<ToggleGroupItem
  value={String(interval.weeks)}
  className={cn(
    'h-16 flex flex-col items-center justify-center gap-0.5 rounded-lg border bg-background',
    'border-border hover:bg-muted/60 transition-colors relative',
    // Purple ghost selected — replaces solid fill
    'data-[state=on]:bg-primary/[0.06] data-[state=on]:border-primary data-[state=on]:border-2',
    'data-[state=on]:ring-2 data-[state=on]:ring-primary/20 data-[state=on]:ring-offset-0',
    'data-[state=on]:text-foreground',
  )}
>
  <span className="font-sans text-sm leading-none">{interval.weeks}w</span>
  <span className="font-sans text-[10px] text-muted-foreground leading-none mt-1">
    {interval.dateLabel}
  </span>
  {/* Recommended → demoted from corner dot to subtle top-edge marker */}
  {isRecommended && (
    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full
                     bg-primary/10 border border-primary/30 font-sans text-[8px]
                     uppercase tracking-wider text-primary">
      Rec
    </span>
  )}
  {/* Capacity dot stays bottom-center */}
  {interval.load && (
    <span className={cn(
      'absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full',
      LOAD_DOT_CLASS[interval.load],
    )} />
  )}
</ToggleGroupItem>
```

Compensate for the new `border-2` width by adjusting unselected to `border` (1px) — mass shift is invisible because the ring expands outward, not inward (`ring-offset-0`).

### Calendar day (`DayContent`, lines 497–522)
React-day-picker's `day_selected` class needs to lose the rounded-fill and gain the same ghost:

In the `<Calendar>` `classNames` override (line 486–495), add:
```tsx
day_selected: cn(
  'bg-primary/[0.08] text-foreground border-2 border-primary rounded-md',
  'hover:bg-primary/[0.12] focus:bg-primary/[0.12]',
  'aria-selected:bg-primary/[0.08] aria-selected:text-foreground',
),
day_today: 'font-medium text-primary', // keep today subtle so it doesn't fight selection
```

The `DayContent` body itself stays as-is (keeps tooltip + capacity dot). The selected ghost comes from the cell wrapper.

### Selected summary card (lines 553–584)
Mirror the chip styling so the summary echoes the selection:
```tsx
<div className="rounded-lg bg-primary/[0.04] border-2 border-primary/40 px-4 py-3 flex items-center justify-between">
```

---

## 2) Time-of-day awareness on calmest picks

**Source of truth:** `appointment.start_time` from the original appointment → derive a band:
- `< 12:00` → `morning`
- `12:00–16:59` → `afternoon`
- `≥ 17:00` → `evening`

**Signal:** For each calmest-pick candidate day, query the same `v_all_appointments` set we already have via capacity → check whether the stylist has free time in that band. To keep this lightweight, extend `useScheduleDayCapacity.ts` to optionally bucket appointment counts per band per day (returns `{ morning, afternoon, evening }` alongside `apptCount` when stylist-scoped). Cap thresholds: a band is "open" if it has fewer than ~3 appointments for that stylist (band has ~4 hours = 4-5 typical slots).

### Hook change (`src/hooks/useScheduleDayCapacity.ts`)
```ts
export interface DayCapacity {
  date: string;
  apptCount: number;
  load: DayLoad;
  // NEW: present only when stylist-scoped
  bands?: { morning: number; afternoon: number; evening: number };
}
```
In `queryFn`, when `stylistUserId` is set, also bucket by `start_time` band. Negligible perf cost — same row scan.

### Picker change (`RebookIntervalPicker.tsx`)
Derive `preferredBand` from `appointment.start_time`. In the calmest-pick UI (lines 326–372), when the band has ≥ 3 appointments, show a tiny `Clock` icon + "AM full" / "PM full" hint and slightly demote the pick (not disable — the operator can still click; it's a signal).

```tsx
const preferredBand = useMemo(() => {
  const t = appointment?.start_time;
  if (!t) return null;
  const h = parseInt(t.split(':')[0], 10);
  if (h < 12) return 'morning' as const;
  if (h < 17) return 'afternoon' as const;
  return 'evening' as const;
}, [appointment?.start_time]);

// Inside the calmestPicks map, alongside `cap`:
const bandCount = cap?.bands?.[preferredBand!] ?? 0;
const bandFull = preferredBand && bandCount >= 3;
```

Render an inline `<span>` in the chip when `bandFull`: `"AM full"` (Termina-cased via `font-display text-[8px] uppercase tracking-wider text-amber-500`).

---

## 3) "Off this week" detection

**Source of truth:** `employee_location_schedules.work_days` (string array of `Mon|Tue|...`) — same source `useStylistAvailability.ts` uses. This is the stylist's standing weekly pattern; it's the right signal here because we're projecting 2–12 weeks out and explicit `staff_shifts` rows likely don't exist that far ahead.

### New hook: `src/hooks/useStylistWorkDays.ts`
Tiny query — fetches the stylist's `work_days` from `employee_location_schedules`. If the stylist has multiple location schedules, **union** them (any location they work counts as a working day for rebook intent).

```ts
export function useStylistWorkDays(stylistUserId: string | null) {
  return useQuery({
    queryKey: ['stylist-work-days', stylistUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_location_schedules')
        .select('work_days')
        .eq('user_id', stylistUserId!);
      const set = new Set<string>();
      (data || []).forEach((r: any) => (r.work_days || []).forEach((d: string) => set.add(d)));
      return set; // {'Mon','Tue',...}
    },
    enabled: !!stylistUserId,
    staleTime: 5 * 60 * 1000,
  });
}
```

If `work_days` is missing/empty for the stylist (data not configured), **fall back to assuming all days are working** so we don't false-positive "Off". Silence-on-low-confidence doctrine.

### Picker integration
- In `calmestPicks` (lines 168–191), tag each pick: `isStylistOff = workDaysSet.size > 0 && !workDaysSet.has(format(d, 'EEE'))`.
- In the chip render (lines 334–362):
  - If `isStylistOff`: render the chip as **disabled** with label `"Off"` (still shows the date), use `text-muted-foreground/60`, `cursor-not-allowed`, no click handler. Tooltip: `"Stylist not scheduled this day"`.
  - Otherwise: existing "Calmest" affordance.
- In the calendar `disabled` predicate (line 482), **don't** disable off-days globally — operator may have legitimate reasons to override (e.g., trial day, special booking). But add a tiny grey "Off" label under the date number when `workDaysSet` doesn't include that weekday (via `DayContent` extension). This keeps the operator informed without being paternalistic.

```tsx
// In DayContent, after capacity dot:
{workDaysSet.size > 0 && !workDaysSet.has(format(date, 'EEE')) && (
  <span className="absolute -bottom-0.5 right-0.5 font-display text-[7px]
                   uppercase tracking-wider text-muted-foreground/60">
    Off
  </span>
)}
```

---

## Files to edit
1. `src/hooks/useScheduleDayCapacity.ts` — add optional `bands` bucketing on stylist-scoped queries
2. `src/hooks/useStylistWorkDays.ts` — **new file**, tiny work-days fetcher with union semantics
3. `src/components/dashboard/schedule/RebookIntervalPicker.tsx` — selected styling refactor + time-band + Off integration

## Verification
- Selected chip: visible primary border + tint, no font-weight increase, recommended marker no longer collides with capacity dot
- Calendar day: same ghost treatment, today indicator demoted so selection wins
- Calmest pick when stylist's preferred band is full: shows "AM full" hint
- Calmest pick on a non-working day: chip becomes "Off", disabled, with tooltip
- Calendar non-working days: small "Off" tag under date, still clickable
- `work_days` empty (no schedule configured): no false "Off" labels anywhere

---

## Further enhancement suggestions
1. **Persist preferred band per client** — derive from the client's last 3–5 visits (not just the source appointment) to smooth out one-off times. The single-appointment derivation here is cheap but biased.
2. **"Why this day?" expandable on the summary card** — a one-line rationale: "6w out · light book · stylist preferred AM open" — turns the silent signals into an auditable trail when the operator reviews their own rebook later.
3. **Capacity + Off in interval chips, not just the calmest sub-row** — currently the `2w/4w/6w/8w/12w` chips only show the capacity dot. If the projected day is the stylist's off-day, the chip should also dim with a tiny "Off" tag, since the operator is selecting from those chips first. Otherwise we're surfacing the truth one row down.
4. **Track `rebook_signal_overrides`** — log when the operator picks a day flagged "Off" or "AM full" anyway. Over time this tells you whether the signals are useful or paternalistic, and feeds the alert-governance learning loop.
