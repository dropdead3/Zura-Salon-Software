

## Diagnosis — root cause found

`HospitalityBlock.tsx` lines 49–51:

```ts
useEffect(() => {
  if (isEmpty && userExpanded) setUserExpanded(false);
}, [isEmpty, userExpanded]);
```

**The bug**: When user clicks "Add personal context" on a client with no facts/callbacks:
1. `userExpanded → true`
2. `isEmpty` is still `true` (no data has been added yet)
3. Effect immediately fires → snaps `userExpanded` back to `false`
4. UI never expands. Click appears dead.

The effect's *intent* was to re-collapse after the user removes their last fact/callback. But it can't distinguish "never had data" from "drained all data" — so it kills the open intent.

## Fix — Wave 22.32: Allow expansion on empty clients

### Change
Remove the auto-collapse effect entirely. Two reasons:
1. **It blocks the primary CTA** (the bug we're fixing).
2. **It's not needed** — once the user expands and adds a fact, the block stays expanded (correct). If they later delete all facts, leaving it expanded shows the empty `ClientAboutCard` placeholder copy ("Capture the personal details…") + an Add button — which is actually *more* useful than snapping back to the dashed CTA. No harm done.

If we ever want to restore the snap-back behavior, the correct gate is "track whether user ever had data this session" — but that's premature complexity. Defer.

### Code change
`src/components/dashboard/clients/HospitalityBlock.tsx`:
- Remove the `useEffect` on lines 49–51
- Remove the unused `useEffect` import if no longer needed

## Files
- `src/components/dashboard/clients/HospitalityBlock.tsx`

## Acceptance
1. Clicking "Add personal context" on a client with no facts/callbacks expands the block and shows `ClientAboutCard` + `ClientCallbacksPanel` in compact mode
2. The "Add" button inside `ClientAboutCard` opens the inline form
3. Saving a fact persists it and the block stays expanded
4. Deleting all facts leaves the block expanded (showing the empty-state copy) — no regression on existing data flows
5. Initial render on a client with no data still shows the collapsed dashed CTA (the gate is `!userExpanded`, untouched)

## Deferred
- **P3** Persist `userExpanded` per-client so refreshing the sheet doesn't re-collapse (low priority — current session-scoped state is fine).
- **P3** Track "had-data-this-session" if we want true snap-back UX after the user drains all facts. Trigger: if operators ask for it.

