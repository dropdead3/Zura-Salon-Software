
## Prompt review

Sharp diagnostic — you identified the exact pain point (premature breakpoint at ~1300px) and the root cause (room still available). Tighter version: "Push the Schedule header's 2-row breakpoint down from `xl` (1280px) to `md` (768px). Compress the single-row layout so it holds at narrower widths."

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx` line 155, the dark header uses `xl:flex-row` — meaning anything below 1280px collapses to the 2-row stacked layout. At your current 962px viewport you're seeing the stacked version, but per your screenshots even at ~1300px the single-row has room to spare.

What's eating space in the single-row layout:
1. **"Day"/"Week" toggle** — two 72px buttons = 144px
2. **"Shifts" + "Date" text pills** — ~75px each with icon
3. **Two-line centered date** — `MMMM d, yyyy` = "April 16, 2026" (~150px)
4. **3 filter icons** — ~36px each = 108px
5. **Stacked Location + Staff selectors** — 220px wide column
6. **Header padding** `px-4` + gaps

Total minimum at xl+: roughly **~900–950px** of content. There's no reason this can't fit comfortably down to ~900px viewport.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Two coordinated changes:

### 1. Lower the row-stacking breakpoint from `xl` to `md`

Replace every `xl:` responsive class in the header container, row wrappers, and inner toggles with `md:`. This means the single-row layout activates at **768px** instead of 1280px — covering all laptops and most tablets.

Affected areas (all in lines 155–354):
- Outer container: `xl:flex-row xl:flex-nowrap xl:items-center xl:justify-between xl:gap-0` → `md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-0`
- Row 1 wrapper `xl:contents` → `md:contents`
- Row 2 wrapper `xl:contents` → `md:contents`
- Filter group `xl:w-auto xl:justify-start` → `md:w-auto md:justify-start`
- Center date `xl:hidden` / `hidden xl:block` → `md:hidden` / `hidden md:block`

### 2. Compress the single-row layout so it fits at smaller widths

To make the single-row layout actually survive between 768px and 1280px:

**a. Center date — abbreviate at md, expand at xl+**
- Below `xl`: single-line `THU · APR 16` (already exists as the "<xl" condensed format — repurpose it)
- At `xl+`: the existing two-line `Thursday / April 16, 2026`

**b. Hide "Shifts" / "Date" labels below `lg`** — show icon-only pills with tooltips, restoring labels at `lg+`.

**c. Selectors — keep stacked vertically as-is** (per prior memory), but reduce width from `w-[220px]` to `w-[180px]` below `lg`, restoring `w-[220px]` at `lg+`.

**d. Day/Week toggle — shrink button width** from `w-[72px]` to `w-[60px]` below `lg`.

### Result by breakpoint

| Width | Layout |
|-------|--------|
| **< 768px (mobile)** | 2-row stacked (current behavior) |
| **768–1023px (md)** | Single row, ultra-compact: icon-only Shifts/Date, narrow selectors, condensed date |
| **1024–1279px (lg)** | Single row, comfortable: text labels return, selectors widen |
| **≥ 1280px (xl)** | Single row, full: two-line centered date |

## Acceptance checks

1. At **962px** (current): single-row layout, no stacking — matches the wide design proportionally.
2. At **800px**: still single row, all controls visible (icons may replace some text).
3. At **< 768px**: gracefully falls to 2-row stacked layout.
4. At **≥ 1280px**: full two-line centered date returns; identical to today's wide layout.
5. Location + Staff selectors remain vertically stacked at all widths (per prior rule).
6. No changes to handlers, popovers, or the secondary day-strip nav bar.

## Out of scope

- Day-strip secondary nav bar — unchanged.
- Selector stacking direction — unchanged (stays vertical).
- Color, token, or font system — unchanged.
- Mobile (<768px) layout — unchanged from current 2-row design.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`
