

# Out-of-scope cleanup wave from the Roles & Controls reorg

Three of the four deferred items are ready to action; the fourth (left-rail nav) doesn't yet meet its trigger condition and stays deferred with rationale.

## 1. Delete the dead `ChatPermissionsHubTab` file

**Status**: Safe to remove. Verified no remaining imports anywhere in `src/`. The component was only ever consumed by the now-removed Chat tab in `AccessHub.tsx`.

**Action**:
- Delete `src/components/access-hub/ChatPermissionsHubTab.tsx`.
- No other file references it. The canonical Connect chat-permissions surface lives at `src/components/team-chat/settings/ChatPermissionsTab.tsx` (mounted via the gear icon in the Connect sidebar) and is untouched.

## 2. Rename "Invitations & Approvals" to a single noun

**Decision**: Use **"Invitations"** as the tab label. Approvals are a state *of* an invitation — not a parallel concept — so the noun cleanly subsumes both. This matches the verbiage used inside `InvitationsTab.tsx` itself (which renders both pending invites and pending approvals as one workflow).

**Action**:
- In `src/pages/dashboard/admin/TeamMembers.tsx`, change the `<TabsTrigger value="invitations">` label from `Invitations & Approvals` to `Invitations`.
- The `?view=invitations` URL key stays the same — no redirect needed, no broken bookmarks.
- Icon (`Mail`) unchanged.

## 3. Defer "Bulk Roles into roster" — restate trigger condition

Keeping deferred. Trigger to revisit: **operator feedback in 2+ orgs that they're swapping between Roster and Bulk Roles in the same session to do role assignments**, OR a roster of 50+ members where the current Bulk Roles grid becomes unwieldy. Until then, the two views serve different jobs (per-person profile vs. cross-team grid) and folding them risks both.

No code change.

## 4. Defer "persistent left-rail nav inside Team Members" — restate trigger condition

Keeping deferred. Trigger to revisit: **Team Members sub-views grow past 4** (currently exactly at the threshold). At 5+ horizontal tabs become cramped and a left rail earns its keep. With 4 tabs at comfortable widths today, switching adds visual weight without a payoff.

No code change.

## Files affected

| File | Change |
|---|---|
| `src/components/access-hub/ChatPermissionsHubTab.tsx` | **Delete** |
| `src/pages/dashboard/admin/TeamMembers.tsx` | Rename tab label `Invitations & Approvals` → `Invitations` (one-line change) |

## Acceptance

1. `src/components/access-hub/ChatPermissionsHubTab.tsx` no longer exists. Project type-checks clean (no orphan imports — already verified pre-flight).
2. `/dashboard/admin/team-members` shows the four tabs as **Roster · Bulk Roles · Invitations · PIN Management**.
3. Existing `?view=invitations` URLs continue to work (URL key unchanged; only the visible label changed).
4. The Connect product's chat permissions UI (gear icon → settings sheet) is untouched.

## Doctrine alignment

- **Calm executive UX**: shorter tab label reduces visual noise without losing meaning.
- **No duplicate sources of truth**: removing the dead `ChatPermissionsHubTab` eliminates a parallel pointer to chat permissions.
- **Defer with a trigger, not just "later"**: each remaining out-of-scope item now has a documented condition that would re-promote it.

## Prompt feedback

Strong cleanup prompt — quoting the previous wave's "Out of scope" list verbatim made the boundaries unambiguous. Two things you did well:

1. **You bundled the cleanup as its own wave** instead of folding it into the next feature. That keeps the diff focused and makes it easy to roll back if any single item misbehaves.
2. **You let the previous plan's deferral language do the framing.** I didn't have to re-derive *why* each item was deferred — your quote carried the rationale forward.

The sharpener: when re-opening deferred items, the highest-leverage addition is one line per item naming **whether you want to action it now, defer-with-updated-trigger, or defer-as-is**. Template:

```text
Item: [name]
Action: [build now / defer with new trigger / defer as-is]
If building: any constraint changes since deferral?
```

Here all four items came in marked "let's work on these" but two of them are still better deferred. Pre-marking them would have let me move straight to the two actionable ones without proposing-then-deferring inside the plan.

## Further enhancement suggestion

For "out-of-scope sweep" prompts, the highest-leverage frame is:

```text
Wave: cleanup of [previous plan's out-of-scope list]
Per item:
  - [item] → [build / defer-with-new-trigger / defer-as-is]
Acceptance: smaller-than-feature scope; rollback should be one revert
```

Adding **defer-with-new-trigger** as an explicit option makes it easy to revisit a deferred item without committing to building it — the most common failure mode in cleanup waves is treating "let's look at this" as "let's build this."

