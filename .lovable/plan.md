
## Prompt review

Clean spatial instruction with measurable constraints (15px gap, flush alignment) — easy to execute precisely. Good observation that the FAB and action bar were drifting apart in dead space.

Tighter framing for next time: the two constraints in your prompt actually conflict slightly with "move FAB left." The FAB is *already* flush with the scheduler table's right edge (both use 16px from viewport). What's actually moving is the **action bar** — it shrinks rightward to close the gap. Reframing as "tighten the action bar so it sits 15px to the left of the FAB" would have been even crisper. I'll execute the intent: FAB stays put, action bar's right padding tightens.

## Diagnosis

In `Schedule.tsx`:
- Scheduler table wrapper: `pl-2 pr-4` → right edge at 16px from viewport.
- FAB (`HelpFAB.tsx`, schedule branch): `fixed bottom-4 right-4` → right edge at 16px, width 56px → left edge at 72px from viewport right.
- Action bar wrapper: `pl-2 pr-20` → right edge at 80px from viewport, leaving a ~64px gap to the FAB's left edge.

To produce a 15px gap: action bar right padding must equal FAB-width (56px) + FAB-right-offset (16px) + gap (15px) = **87px**.

## Plan

**1. Tighten action bar right padding** (`src/pages/dashboard/Schedule.tsx`, line 1044)
- Change `pr-20` → `pr-[87px]` on the action bar wrapper.
- Result: action bar right edge sits exactly 15px to the left of the FAB's left edge.

**2. Leave FAB as-is** (`src/components/dashboard/HelpFAB.tsx`)
- `bottom-4 right-4` already places the FAB's right edge flush with the scheduler table's right edge (both at 16px from viewport). No change needed.

## Acceptance checks

1. FAB's right edge is flush with the scheduler table's right edge (both 16px from viewport).
2. Exactly 15px of empty space between the action bar pill's right edge and the FAB's left edge.
3. Vertical alignment of FAB and action bar unchanged.
4. Other pages (non-schedule) FAB position untouched.
5. No layout shift on different viewport widths — both elements anchor to the right edge.

**Files to modify:**
- `src/pages/dashboard/Schedule.tsx` (action bar wrapper padding)
