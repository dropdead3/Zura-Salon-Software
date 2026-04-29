# Archive Wizard Progress Stepper

Add a horizontal numbered stepper to the `ArchiveWizard` header so operators see at a glance which of the 4 steps they're on, which are complete, and which are upcoming. Mirrors the canonical pattern already used by `PolicyConfiguratorStepper`.

## What you'll see

```text
 (1)──── (2)──── (3)──── (4)
 Reason  Impact  Cleanup Confirm
  ✓        ●       ○       ○
```

- Completed steps: filled circle with check, primary tint
- Current step: filled circle with number, soft ring halo
- Upcoming steps: outlined circle, muted text
- Connector line between steps fills with primary color as progress moves forward
- Sits directly below the title block, above the body — visible on every step

## Behavior

- Display-only (no click-to-jump). Wizards have validation gates between steps (e.g. Step 3 needs all buckets handled), so jumping ahead would skip required state. Back navigation remains via the existing footer "Back" button.
- Labels are short and verb-led: `Reason`, `Impact`, `Cleanup`, `Confirm`.
- When the operator is inside the per-bucket workspace on Step 2, the stepper still shows Step 2 as current — the workspace is a sub-view, not a separate step.
- The redundant "Archive · Step X of 4" eyebrow text stays (anchors the title), but the stepper becomes the primary progress signal.

## Technical Details

**File:** `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`

1. Add a small inline `ArchiveWizardStepper` component at the bottom of the file, accepting `{ currentStep: 1 | 2 | 3 | 4 }`. Static `STEPS = [{ n: 1, label: 'Reason' }, { n: 2, label: 'Impact' }, { n: 3, label: 'Cleanup' }, { n: 4, label: 'Confirm' }]`.
2. Render it inside the existing `<header>` block, below the title row. Use the same circle/connector/check visual language as `PolicyConfiguratorStepper` (lines 47-97 of that file), scaled down to fit the wizard's 720px panel:
   - Circle size: `w-7 h-7` (vs. `w-8 h-8` in the policy version) — the wizard header is denser
   - Labels render below the circle on mobile, beside on >=sm, to avoid horizontal crowding
   - Connector: `h-px flex-1` between circles, `bg-primary/60` when the step before it is complete, else `bg-border`
3. State derivation per step:
   - `isComplete = step.n < currentStep`
   - `isCurrent = step.n === currentStep`
   - `isUpcoming = step.n > currentStep`
4. Header wrapper class changes from `pb-4` to `pb-5 space-y-4` so the stepper has breathing room from the title block.
5. No new imports needed beyond `Check` from lucide-react (already imported in the file via `CheckCircle2` — add `Check` to that import line).

No new files, no design tokens, no migrations.
