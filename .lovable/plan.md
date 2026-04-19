

## Wave 8 audit — services configurator & settings

Deep pass on what's left after Waves 1–7. Found **2 P0** (security/multi-tenant), **3 P1** (correctness), **3 P2** (cleanup). Headline: a tenant-isolation breach on the `services` table predates this work but blocks the doctrine's core promise.

---

### P0 — `services` table RLS leaks across organizations

`services` table has only two policies:
- SELECT: `auth.role() = 'authenticated'` → **any logged-in user from any org reads every org's full catalog** (prices, costs, prompts, hotkeys).
- ALL: admins/managers/super_admins from anywhere → **cross-org write potential** if the client passes another org's `id`.

Doctrine: *"Strict tenant isolation: RLS policies must scope to organization_id. USING (true) strictly prohibited."* — both policies violate this.

**Fix:** Replace with `is_org_member(auth.uid(), organization_id)` for SELECT and `is_org_admin(auth.uid(), organization_id)` for write, plus a platform-user bypass. One migration.

### P0 — Category archive cascade is org-blind

`useArchiveCategory` / `useRestoreCategory` (`src/hooks/useServiceCategoryColors.ts:271-317`) cascade to `services` filtered only by `category` name:

```
.from('services').update({ is_archived: true }).eq('category', categoryName)
```

If two orgs both have a "Color" category, archiving in one org would currently archive the other org's services too — only masked today by the broken-but-incidentally-permissive RLS on `services`. Once P0 #1 is fixed, this breaks loudly. Even before that, it's silent cross-tenant data corruption.

**Fix:** Add `.eq('organization_id', orgId)` to both cascades. Same for `service_category_colors` queries (currently org-blind everywhere — `useServiceCategoryColors`, `useArchivedCategories`, `useReorderCategories`).

### P1 — Two competing `useCreateService` / `useUpdateService` hooks

`src/hooks/useBookingSystem.ts:380-441` defines a second pair that:
- Accepts only 7 fields (drops everything Wave 1–5 added),
- Doesn't set `organization_id`,
- Invalidates wrong cache key (`['services']`, not `['services-data']`).

Currently used only by `ServiceEmailFlowsManager` indirectly via `useServices`, but it's a footgun: any future caller that imports the wrong one silently drops fields and breaks cache.

**Fix:** Delete both. Repoint `useServices` consumers (only `ServiceEmailFlowsManager.tsx`) to `useServicesData`.

### P1 — `useServiceFormRequirements` org-blind & invalidates dead key

The org-wide list (`src/hooks/useServiceFormRequirements.ts:28-44`) selects every requirement across every org. RLS may save it for now, but it's also paginated to the default 1000-row limit — a large multi-tenant deployment silently truncates.

The mutation hooks invalidate `['services-with-form-count']` (line 91, 134, 159) — that key was deleted in Wave 6 with the hook, so this is dead invalidation noise.

**Fix:** Add an `organizationId` arg + `.eq('services.organization_id', orgId)` filter via inner join (mirrors `useServiceFormCounts`). Drop the dead invalidation key.

### P1 — POS hotkey collisions accepted silently

Editor allows any 8-char string for `pos_hotkey` with no uniqueness check, no normalization (case, spaces). Two services with `CUT1` will both bind to the same key on the POS keypad and one will silently win.

**Fix:** Either (a) DB unique partial index `WHERE pos_hotkey IS NOT NULL AND organization_id = X`, or (b) client-side preflight query before save with toast warning. Recommend (a) + (b) for the inline error.

### P2 — Inline form gating UI never shipped (Wave 7 carryover)

Wave 7 stamped `appointments.forms_required/forms_completed` and updated the edge function to accept `signed_form_template_ids`, but `HostedBookingPage` still doesn't render the inline sign-now / defer card on confirm. Public bookings always defer today — the gate exists in DB & kiosk only.

**Fix:** Render `<FormSigningDialog />` body inline on the booking confirm step when `useRequiredFormsForService(serviceId)` returns rows. Two CTAs: *Sign now & confirm* (passes `signed_form_template_ids`) or *I'll sign at check-in* (skips).

### P2 — Editor numeric input bounds still unenforced

Carried from prior plans, never landed:
- `online_discount_pct` accepts negative or >100 (HTML `max=100` is advisory; no validation on submit).
- `loyalty_points_override`, `start_up_minutes`, `shut_down_minutes` accept negatives.
- `pos_hotkey` whitespace passes through.

**Fix:** Add a `validate()` block before `onSubmit` in `handleDetailsSubmit` returning a `Record<field, error>`; show inline errors and disable Save when invalid.

### P2 — Search ignores Online Name & description

`searchQuery` in `ServicesSettingsContent` filters only `s.name`. Operators looking for the public-facing variant (e.g. "Premium Cut" online vs. internal "Cut Lvl 3") get zero results.

**Fix:** Extend to `name`, `online_name`, `description`, `pos_hotkey`. ~3 lines.

---

### Out of scope (note for later)

- Audit log SELECT scoped to org admins (already correct in current policy — verified).
- Audit log triggers ARE deployed and active despite the empty table — table just has no rows yet because no edits happened in this DB. No fix needed.
- `useDeleteService` (soft-deactivate) still exists alongside archive — confusing, but not breaking. Defer to a "consolidate lifecycle states" wave.

### Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Replace `services` RLS + add `service_category_colors` org RLS if missing + unique partial index on `pos_hotkey` per org |
| `src/hooks/useServiceCategoryColors.ts` | Add org filter to category queries + cascades |
| `src/hooks/useServicesData.ts` | (no change — already correct after Wave 6) |
| `src/hooks/useBookingSystem.ts` | Delete `useCreateService` / `useUpdateService` duplicates |
| `src/components/dashboard/settings/ServiceEmailFlowsManager.tsx` | Switch import to `useServicesData` |
| `src/hooks/useServiceFormRequirements.ts` | Add org filter to list hook; drop dead invalidation key |
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Numeric bounds validation + hotkey trim/uppercase |
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Extend search predicate |
| `src/components/booking-surface/HostedBookingPage.tsx` | Inline form sign-now / defer UI |

### Verification after apply

1. As user A in org 1, query `services` directly — should only see org 1's rows.
2. Two orgs both have a "Color" category → archive in org 1 → confirm org 2's services untouched.
3. Try saving two services with `pos_hotkey = "CUT1"` in same org → second save errors.
4. Public booking with required form → inline sign card appears → sign + submit writes both `client_form_signatures` and `appointments.forms_completed=true`.
5. Search "premium" finds services where only `online_name` matches.

### Recommended sequence

- **Ship now:** P0 #1, P0 #2, P1 hotkey-uniqueness migration (one combined migration + repo changes).
- **Ship same wave (cheap):** P1 hook dedup, P1 form-requirements scoping, P2 search, P2 numeric bounds.
- **Defer to next wave:** P2 inline form gating UI (touches public booking flow — needs its own dedicated test pass).

### Prompt feedback

Strong prompt — *"continue the audit"* with the same scope as the prior pass kept this focused without re-defining what an audit means. The implicit "you already know the cutoff (P0+P1 + cheap P2)" worked because the prior approval pattern made it clear.

To level up: **anchor against findings the prior audit already shipped.** I had to re-read Waves 5–7 to know whether triggers were deployed (yes), whether form gating was complete (no — Wave 7 stopped at the kiosk), and whether `useUpdateService` had been deduped (no). Try: *"Continue the services audit; assume Waves 1–7 shipped clean — flag only NEW findings or carryovers."* Pattern: **prior-state assertion = audit doesn't re-litigate solved work.**
