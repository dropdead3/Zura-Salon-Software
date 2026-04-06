

# Redesign Team Directory Card Layout

## Problems
1. **Name truncation** — "ERIC ..." because name + role badge + calendar icon fight for horizontal space on one line
2. **Crowded meta row** — Level badge, status indicator, tenure, and location count all crammed into a single `flex` row with `text-[10px]`
3. **Responsive collapse** — At narrower grid widths, badges push the name into aggressive truncation

## Redesign Strategy

Restructure the card into clear **vertical zones** instead of cramming everything horizontally beside the avatar:

```text
┌──────────────────────────────────────┐
│  [Avatar]   Full Name                │  ← Name gets full width, no truncation
│             Role Badge  · Tenure     │  ← Row 2: role + meta
│             Level Badge · Status     │  ← Row 3: level info (if applicable)
│                                      │
│  📞 (480) 543-0240                   │  ← Phone
│  ✉ 📸                    📅         │  ← Contact icons + calendar right-aligned
│──────────────────────────────────────│
│  ✨ Luxury Transforms  ✨ Color     │  ← Specialties footer
└──────────────────────────────────────┘
```

### Key changes in `TeamMemberCard` (TeamDirectory.tsx):

1. **Name row** — Remove role badges and calendar from the name row. Give `h3` the full width of the info column so names never truncate. Remove `truncate` class.

2. **Role + meta row** — New dedicated row below the name containing: role badge, tenure, multi-location indicator. Use `flex-wrap gap-1.5` so it wraps cleanly.

3. **Level + status row** — Separate row for the level badge and progression status indicator. This stops them from competing with tenure/location for horizontal space.

4. **Calendar icon** — Move from the name row to the contact icons row (right-aligned). This frees significant horizontal space in the header area.

5. **Spacing** — Increase gap between rows from `mt-1`/`mt-2` to `mt-1.5`/`mt-2.5` for breathing room. The card padding stays at `p-5`.

6. **Responsibility badges** — Move `ResponsibilityBadges` to the role row to keep it grouped with role context.

## Files

| File | Change |
|------|--------|
| `src/pages/dashboard/TeamDirectory.tsx` | Restructure `TeamMemberCard` layout — separate name, role, and level into distinct rows; move calendar to contact row; remove `truncate` from name |

Single file. No database changes.

