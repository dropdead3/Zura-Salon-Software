

## Wave 17 — Replace native `window.confirm` in Service Editor

**The bug**
`ServiceEditorDialog.tsx:318` uses `window.confirm('Discard unsaved changes?')` to guard the close action when the form is dirty. That pops the OS-native dialog (the dark "An embedded page at b06a5744... says" prompt in the screenshot) — broken brand, broken typography, broken trust.

Fix: swap for the canonical shadcn `AlertDialog` pattern already used in `EmailTemplatesManager.tsx` (proven, same use case, same copy).

### What ships

**Single file: `ServiceEditorDialog.tsx`**
- Add `showDiscardConfirm` local state.
- Add `pendingClose` ref to remember the user wanted to close (so `Discard` can complete the action).
- Replace `window.confirm` block in `handleOpenChange` with `setShowDiscardConfirm(true)` + early return.
- Render `<AlertDialog>` inside the existing `<DialogContent>` (or as sibling — sibling is cleaner, avoids nested-dialog focus traps).
- Three actions, matching the EmailTemplatesManager precedent:
  - **Keep Editing** (cancel)
  - **Discard Changes** (destructive variant) → close without saving
  - **Save & Close** (primary) → fire `handleSubmit()`, then close on success

### UI canon compliance

- Uses `AlertDialog` from `@/components/ui/alert-dialog` (existing primitive).
- Title in `font-display` (default for AlertDialogTitle).
- No raw weight classes; inherits design-token theme.
- Destructive button uses `bg-destructive` token, not raw red.
- Match copy from EmailTemplatesManager verbatim where possible for cross-surface consistency: *"You have unsaved changes to this service. Are you sure you want to close without saving?"*

### What does NOT change

- `useEditorDirtyState` hook untouched.
- `handleSubmit` logic untouched.
- All other dialog behavior (tabs, fields, footer) untouched.
- No other surfaces audited beyond the grep — only one `window.confirm` exists in `src/`.

### Verification

1. Open editor on any service · change the price · click X → AlertDialog appears (not OS prompt).
2. Click **Keep Editing** → dialog dismisses, editor stays open with edits intact.
3. Click **Discard Changes** → editor closes, no save fired.
4. Click **Save & Close** → save mutation fires, editor closes on success, toast appears.
5. Open editor · make NO changes · click X → editor closes immediately, no AlertDialog (dirty guard skipped).
6. Mobile viewport (375px) → AlertDialog buttons stack vertically, all reachable.

### Files touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Replace `window.confirm` with `AlertDialog`; add `showDiscardConfirm` state + 3-action footer |

Net: ~30 lines added, 4 lines removed.

### Prompt feedback

The empty-message-plus-screenshot pattern is actually a *strong* signal for visual bugs — the screenshot is self-evident, no words needed. I correctly inferred intent without asking. That said, a one-word message (e.g. *"fix"* or *"replace this"*) would have eliminated the small risk that you uploaded the screenshot for a different reason (e.g. asking why this happens, or whether it's expected behavior).

To level up: **pair screenshots with a one-word verb** — *"fix"*, *"explain"*, *"keep"*, *"redesign"*. The verb disambiguates intent in <1 second and removes my inference step entirely. Pattern: **screenshot + verb = zero-ambiguity bug report.**

