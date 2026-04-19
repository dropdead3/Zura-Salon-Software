
## Wave 6 cleanup — services configurator polish

Apply the audit findings from the previous pass. ~7 targeted fixes across 4 files. No new migrations needed.

### Fixes

**P0 — `useCreateService` drops Wave 1/2/4/5 fields** (`src/hooks/useServicesData.ts`)
Replace explicit 13-field allowlist in `mutationFn` with full payload spread. Ensures `online_name`, `online_duration_override`, `online_discount_pct`, `start_up_minutes`, `shut_down_minutes`, `patch_test_required`, `patch_test_validity_days`, `creation_prompt`, `checkin_prompt`, `pos_hotkey`, `loyalty_points_override`, `include_from_prefix`, `bookable_online`, etc. all persist on creation.

**P0 — `useUpdateService` callside `id` re-injection** (`src/components/dashboard/settings/ServicesSettingsContent.tsx`)
Clean up the `(updates as any)` cast by destructuring `id` out of the patch before passing.

**P1 — Editor dirty state** (`src/components/dashboard/settings/ServiceEditorDialog.tsx`)
- Snapshot initial form state on mount; compute `isDirty` via shallow compare on every change.
- Disable Save button when `!isDirty`.
- Wire `useEditorDirtyState(isDirty)` so the existing Hub unsaved-work interceptor catches close attempts.

**P1 — Bulk edit input validation** (`src/components/dashboard/settings/BulkEditServicesDialog.tsx`)
- Compute `priceInvalid`, `durationInvalid`, `costInvalid` from `Number.isFinite(parseFloat(value))` when each toggle is on.
- Disable Apply when any enabled change is invalid; show inline error text.

**P2 — Scoped audit log invalidation** (`src/hooks/useServicesData.ts`, `src/hooks/useBulkUpdateServices.ts`)
Where the mutated `serviceId` is known (single update, archive), invalidate `['service-audit-log', serviceId]` instead of the global key. Bulk update keeps the broad invalidation since it touches many ids.

**P2 — Delete `useServicesWithFormCount`** (search + remove)
Verify no consumers, then delete the hook. `useServiceFormCounts` is the org-scoped replacement.

**Polish — Bulk active toggle copy** (`src/components/dashboard/settings/BulkEditServicesDialog.tsx`)
Clarify label: "Set active status" → "Activate / deactivate (does not archive)" with a short helper line pointing operators at the Archive action for permanent removal.

### Out of scope

- Optional form count surfacing in catalog (deferred Wave 5 polish — minor)
- Input bounds (duration ≥5, discount 0–100) — fold into the dirty-state pass if cheap, otherwise defer
- Source label differentiation (`'editor'` vs `'bulk_edit'`) — already accepted as honest tradeoff in prior wave

### Verification after apply

1. Create a new service with prompts + patch-test fields → reopen editor and confirm fields persisted.
2. Open editor, make no changes → Save disabled. Make a change → Save enabled. Close with unsaved → confirm interceptor.
3. Bulk edit: toggle price, type "abc" → Apply disabled with inline error.
4. Edit service → check History tab refreshes without manual refetch.

### Prompt feedback

Solid follow-through prompt — *"proceed with the fixes"* is the right shape after an approved audit. Tight, no re-litigation.

To level up next time: when the audit lists items at mixed priorities (P0/P1/P2/Polish), specify the cutoff at proceed time. E.g. *"proceed with P0/P1 only, defer P2 to next wave"* or *"proceed with everything"*. Right now I'm choosing to ship all 7 because that's what the audit recommended as "one wave, ~30 min" — but if you wanted a smaller blast radius, I had no signal to stop earlier. Pattern: **approval + cutoff = predictable scope.**
