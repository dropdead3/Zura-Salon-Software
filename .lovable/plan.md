
## Prompt review

Clear and specific — you named the problem (ellipsis truncation) and gave the exact fallback rules (drop year, abbreviate month). Tighter version: "In the Schedule header center date, at <xl widths, replace the truncated `April 16, 2…` with an abbreviated single-line format (`Thu · Apr 16`) — drop the year and use 3-letter month."

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`, the center date block currently renders two formats:
- `≥ xl`: two-line `THURSDAY` / `APRIL 16, 2026`
- `< xl`: single-line condensed format using full month name + year, which overflows the available center column at 1296px and triggers ellipsis truncation (visible as `APRIL 16, 2…`).

Root cause: the condensed format still uses `MMMM d, yyyy` (full month + year), which is too wide for the constrained center slot when stacked Shifts/Date pills sit on the left and selectors sit on the right.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Pure format/className change.

### 1. Replace condensed date format

At `< xl`, change from full month + year to abbreviated month, no year:
- Current: `Thu · April 16, 2026` (or similar full format)
- New: `Thu · Apr 16` using date-fns `EEE · MMM d`

### 2. Add a mid-tier (optional, only if it fits)

At `lg` (≥ 1024px) but `< xl`, render `Thu · Apr 16` (abbreviated, no year).
At `< lg` if needed, render even more compact `Apr 16`.

### 3. Remove ellipsis fallback

Drop `truncate` / `overflow-hidden` on the condensed line — with the shorter string, truncation should never trigger at supported widths. Keep `whitespace-nowrap` so it never wraps.

### 4. Preserve wide layout

`≥ xl`: unchanged two-line `THURSDAY` / `APRIL 16, 2026`.

## Acceptance checks

1. At 1296px viewport (current): center date renders as `Thu · Apr 16` on a single line, no ellipsis, no truncation.
2. At ≥ 1280px (xl): two-line `THURSDAY` / `APRIL 16, 2026` unchanged.
3. At narrower widths (1024–1280px): abbreviated format fits cleanly without truncation.
4. Locale-aware via `useFormatDate` if already used; otherwise use `date-fns` `format` consistent with the existing block.
5. No logic, state, or layout-structure changes — only format string and possibly removal of ellipsis utilities.

## Out of scope

- Wide-screen (≥ xl) date format — unchanged.
- Left cluster (Day/Week, Shifts, Date pills) — unchanged.
- Right cluster (filters, selectors) — unchanged.
- Secondary nav bar — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`
