

## Prompt review

Smart move — instead of fighting the breakpoint math, you're rebalancing the surface. Assistant Blocks and Drafts are workflow-adjacent (not viewport identifiers), so they belong with the bottom action bar that already houses workflow tools (Create, Zoom, Legend). Tighter version: "Promote Assistant Blocks + Drafts out of the dark header into ScheduleActionBar; they're workflow shortcuts, not header chrome."

Teaching note: when responsive layouts get crowded, the best fix is often **relocation, not compression**. You instinctively chose this — naming it explicitly ("workflow tools belong with workflow tools") will make future calls even sharper.

## Diagnosis

Currently in `ScheduleHeader.tsx`:
- **Assistant Blocks** (lines 315–335): icon button with badge, hidden below `@[1320px]/schedhdr`
- **Drafts** (lines 337–357): icon button with badge, hidden below `@[1320px]/schedhdr`

Bottom bar (`ScheduleActionBar.tsx`) already hosts: Create Appointment, appt count, payment queue, Appointments link, Zoom, Legend. It's the natural home for two more workflow icons.

## Fix

### 1. `ScheduleActionBar.tsx` — add two optional icon buttons

Add four new optional props:
- `onOpenBlockManager?: () => void`
- `pendingBlockCount?: number`
- `onOpenDrafts?: () => void`
- `draftCount?: number`

Insert two icon buttons (Users + FileText, both with `NavBadge`) into the right cluster, **before** the Appointments & Transactions link (line 153). Use the same h-8 w-8 rounded-full styling as the existing zoom/link buttons for visual consistency. Each button is conditionally rendered (`onOpenBlockManager && ...`).

### 2. `ScheduleHeader.tsx` — remove the two buttons

Delete lines 315–357 (Assistant Blocks + Drafts blocks) entirely. Keep `onOpenBlockManager`, `onOpenDrafts`, `draftCount`, `pendingBlockCount` props in the interface (still passed down), but no longer rendered here.

Remove the now-unused `Users` and `FileText` icon imports if they have no other usage in the file. Remove `NavBadge` import if unused.

### 3. `Schedule.tsx` — wire the new props through

At lines 1010–1024, pass the four new props to `<ScheduleActionBar>`:
```tsx
onOpenBlockManager={() => setBlockManagerOpen(true)}
pendingBlockCount={pendingCount}
onOpenDrafts={() => setDraftsSheetOpen(true)}
draftCount={drafts.length}
```

Header still receives them too (no breaking change to `ScheduleHeader`'s signature) so we can clean those up later if confirmed.

## Result

| Surface | Before | After |
|---|---|---|
| Dark header (right cluster) | Filters, Assist, Drafts, Today's Prep, Selectors | **Filters, Today's Prep, Selectors** |
| Bottom action bar | Create, count, queue, Appts link, Zoom, Legend | Create, count, queue, **Assist, Drafts**, Appts link, Zoom, Legend |

At any viewport ≥ 768px, Assistant Blocks and Drafts are now **always visible** in the bottom bar — no more breakpoint games. Header stays clean even at narrow widths with the sidebar expanded.

## Acceptance checks

1. At 1130px viewport (sidebar expanded): header shows date + selectors cleanly, no clipping. Bottom bar shows Assist + Drafts icons with badges.
2. At 1415px viewport (current): same — Assist + Drafts live in bottom bar, badges intact.
3. Clicking Assist icon opens the block manager (existing behavior).
4. Clicking Drafts icon opens the drafts sheet (existing behavior).
5. Pending/draft count badges still render correctly.
6. Tooltips on both icons still work.
7. Dark header no longer renders these two buttons at any width.

## Out of scope

- Shifts pill + Date pill — stay in header (they relate to view mode, not workflow).
- Today's Prep — stays in header (contextual, only shows on today).
- Filters popover — stays in header.
- Selectors, Day/Week toggle, navigation — unchanged.
- Bottom bar styling/layout reflow — minimal; just two icons added with same h-8 w-8 pattern.

## Files touched

- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — add 4 props + 2 icon buttons.
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — remove Assist + Drafts blocks; clean unused imports.
- `src/pages/dashboard/Schedule.tsx` — pass 4 new props to `ScheduleActionBar`.

