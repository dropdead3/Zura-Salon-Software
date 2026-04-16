

## Prompt review

Excellent observation — you correctly identified that **date is the highest-priority element** in a schedule header (it's the answer to "what am I looking at?"), yet it's the first thing being sacrificed. You also proposed a precise fix: hide lower-value chrome (Shifts pill, Date picker pill, Assistant Blocks icon, Drafts icon) before sacrificing the date itself. Tighter version: "Date is the schedule's primary identifier — it must never hide. Drop Shifts/Date pills and Assistant/Drafts icons first when space is tight."

Teaching note: when prompting responsive-priority issues, naming the **hierarchy of importance** (e.g., "Date > Selectors > Filter icons > Shifts/Date pills > Assistant/Drafts") makes the fix unambiguous. You did this implicitly — making it explicit in future prompts will get even sharper results on the first pass.

## Diagnosis

In `ScheduleHeader.tsx` (lines 264–279), the center date container has `min-w-0` with no protection. When the container width drops (sidebar expanded at ~1130px viewport → ~790px header), flexbox squeezes the date to zero before reducing other elements.

**Current visible elements at narrow container, in left-to-right order:**
1. Day/Week pill toggle
2. Shifts pill (icon-only at <@lg)
3. Date picker pill (icon-only at <@lg)
4. **[Center date — gets crushed]**
5. Filter icons (CalendarFiltersPopover)
6. Assistant Blocks icon
7. Drafts icon
8. Today's Prep icon (conditional)
9. Location selector
10. Staff selector
11. Day/Week navigation split-buttons

**Priority order should be (highest to lowest):**
1. Day/Week toggle (core view mode)
2. Center date (primary identifier)
3. Location + Staff selectors (data scope)
4. Day/Week navigation (movement)
5. CalendarFiltersPopover (active filters)
6. Today's Prep (conditional, contextually critical)
7. **Shifts pill, Date picker pill, Assistant Blocks, Drafts** ← drop these first

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Add container-query visibility rules so the four lowest-priority controls hide before the date is squeezed.

### 1. Hide Shifts pill below `@lg/schedhdr`

Wrap the Shifts toggle (lines 197–226) so the entire button hides at narrow container widths:
- Add `hidden @lg/schedhdr:flex` to the Tooltip's button
- Tooltip remains accessible at @lg+; users at narrower widths can use the existing date strip / popover for the same intent (the Shifts toggle is also surfaced from secondary nav)

### 2. Hide Date picker pill below `@lg/schedhdr`

Same treatment for the Date picker button (lines 228–246):
- Add `hidden @lg/schedhdr:flex` so it disappears below 1024px container width
- Date picking is still possible by clicking the center date itself (we'll wrap it in the same popover trigger as a fallback), or via the day-strip nav below

### 3. Make the center date itself open the date picker

To preserve date-picking functionality when the explicit pill is hidden, wrap the center date display (lines 264–279) in the same `<Popover>` trigger. Single click on date → calendar opens. This is also better UX (the date *is* the picker — discoverable, no separate button needed).

### 4. Hide Assistant Blocks + Drafts icons below `@lg/schedhdr`

Lines 295–336: add `hidden @lg/schedhdr:inline-flex` to both Tooltip wrappers. These are secondary workflow tools accessible from other locations (they live as deep links in the schedule and from drafts surfaces).

### 5. Protect the center date from collapse

Line 265: change `text-center min-w-0` → `text-center shrink-0 px-2`. This makes the date a fixed-width island that flexbox cannot squeeze.

### 6. Keep Today's Prep visible

Lines 339–355 remain unchanged — it's conditional (only on today) and contextually critical when shown.

## Result by container width

| Container width | Visible chrome (left of date) | Visible chrome (right of date) | Date |
|---|---|---|---|
| **< @md (<768px)** | 2-row layout (existing) | — | Visible (condensed) |
| **@md–@lg (768–1023px)** | Day/Week toggle only | Filters, Today's Prep (cond.), Selectors, Nav | **Visible** (condensed, single line) |
| **@lg+ (≥1024px)** | Day/Week toggle, Shifts, Date pills | Filters, Assist Blocks, Drafts, Today's Prep, Selectors, Nav | Visible |
| **@xl+ (≥1280px)** | All of @lg | All of @lg | Two-line full date |

At your current 1130px viewport with sidebar expanded (~790px header), you'll now see: Day/Week toggle → Date "THU · APR 16" → filter icons → selectors → nav. Clean, no crushing, date prominent.

## Acceptance checks

1. At 1130px viewport with sidebar expanded: date "THU · APR 16" is clearly visible center-row, no overlap.
2. At 1130px viewport with sidebar collapsed: Shifts pill, Date pill, Assistant Blocks, Drafts all reappear (container ≥ 1024px).
3. Clicking the center date opens the calendar picker (replaces the dropped Date pill's function).
4. At ≥ 1280px container: full two-line date and all chrome restored exactly as today.
5. Shifts toggle still functional at ≥ 1024px container (matches previous behavior).
6. No changes to handlers, state, or the secondary day-strip nav bar.

## Out of scope

- DashboardLayout sidebar logic — unchanged.
- Day-strip secondary nav bar — unchanged.
- Selector layout (stays vertically stacked) — unchanged.
- Mobile (<768px) 2-row stack — unchanged.
- Color, token, font system — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

