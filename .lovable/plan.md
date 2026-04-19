

## Wave 3 audit — gaps, bugs, enhancements before Wave 4

Let me sweep the Wave 3 deliverables (`useBulkUpdateServices.ts`, `BulkEditServicesDialog.tsx`, `ServicesSettingsContent.tsx` selection UI) against the codebase, doctrine, and the prior plan's promises.
<lov-tool-use id="toolu_vrtx_01GMgQAtEEJhZ82LxcYqR2Pd" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NbgppQK9PRPuZiinjBAfqb" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/BulkEditServicesDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019fdSjx1E1yMsvQq1zJWyoc" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/BulkEditServicesDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016KrTF9YgKNVnCJZ4byxvCo" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GC6CkTnVpZhUsee4CihWn1" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\", \"lines\": \"430-900\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019AbMz7awmpUMFNp3mjfQNi" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServiceEditorDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Sesg9iBb8qgYQ9DpGauGtd" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\", \"lines\": \"748-1000\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FhdQ3sw3JsNfAD7KtJsnoz" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServiceEditorDialog.tsx\", \"lines\": \"331-813\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016bQNqkrPZjjgnb5PhG5QSu" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServiceEditorDialog.tsx\", \"lines\": \"634-813\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0175PXibi7Dx1fKgzAXNttWd" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/ServicesSettingsContent.tsx\", \"lines\": \"1000-1196\"}">
</lov-tool-use>
I have enough context. Let me also peek at the BookingSurfacePreview to verify discount math and check the create-public-booking edge function discount handling.
<lov-tool-use id="toolu_vrtx_01XaTgoTipv1hQGiZDwirL64" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/settings/BookingSurfacePreview.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015y1pDEyGwWtDnU9WLgQ7SA" name="code--search_files" integration-id="code" data="{\"query\": \"online_discount_pct\", \"include_patterns\": \"supabase/functions/create-public-booking/**,src/hooks/usePublicServicesForWebsite.ts,src/components/booking-surface/**\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PSfy4Y773odrF9C93ekPjW" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/create-public-booking/index.ts\", \"lines\": \"80-300\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019pD5yxjt65MtCBsq8uvhvk" name="code--search_files" integration-id="code" data="{\"query\": \"creation_prompt|checkin_prompt\", \"include_patterns\": \"src/components/dashboard/schedule/**,src/components/kiosk/**,src/hooks/**\"}">
</lov-tool-use>
I have enough. Let me also quickly check `useServicesData` for the new column types and any obvious types.ts gap.
<lov-tool-use id="toolu_vrtx_01HLNnvk6Yq9GBD7AXUDEyLR" name="code--search_files" integration-id="code" data="{\"query\": \"patch_test_required|start_up_minutes|online_discount_pct|creation_prompt\", \"include_patterns\": \"src/hooks/useServicesData.ts,src/integrations/supabase/types.ts\"}">
</lov-tool-use>
I have enough. Now let me present the audit plan.

<lov-plan>
## Wave 3 audit — gaps and bugs found

Fast sweep of Waves 1–3 against the codebase. Found **4 real issues** (one is a data integrity bug) and **2 polish items**. Nothing blocks Wave 4, but the bulk-edit category bug and the duplicate-toggle UX issue are worth a quick pass.

### Bug 1 — `original_price` semantics inverted (data integrity, P0-light)

**Where:** `supabase/functions/create-public-booking/index.ts` lines 273–274.

```text
total_price:    finalPrice    (discounted)
original_price: basePrice     (pre-discount)
```

Across the rest of the codebase, `original_price` is used as the **client-facing list price before manual discounts** — not as a "what we would have charged without our own promo." Storing the catalog price in `original_price` makes every online-discounted booking look like a manually-discounted appointment in revenue reports and discount analytics.

**Fix:** Set `original_price = basePrice` only when a manual discount is applied later. For Wave 1 online discounts, write `original_price = finalPrice` (or null) and record the online discount on a dedicated field — reusing existing `service_discount_*` columns if present, or omitting until Wave 5 audit log lands. Recommend: write `total_price = finalPrice` and leave `original_price` null for online-discount bookings, matching how POS currently treats list price.

### Bug 2 — Bulk "Move to category" lets you select an empty value

**Where:** `BulkEditServicesDialog.tsx` line 115.

```text
if (changeCategory && newCategory) shared.category = newCategory;
```

If the operator toggles "Move to category" but never picks one, the toggle is silently a no-op — but the Apply button is still enabled and the toast claims success. Two-line fix: either disable Apply when `changeCategory && !newCategory`, or surface inline validation ("Pick a destination category").

### Bug 3 — "Bookable Online" toggle exists in two tabs with separate state writes

**Where:** `ServiceEditorDialog.tsx` Details tab (line 424) and Online & App tab (line 554) both render `<Switch checked={bookableOnline} onCheckedChange={setBookableOnline} />`.

They share state, which is correct — but the **submission** goes through three different form IDs (`service-details-form`, `service-online-form`, `service-advanced-form`) that all call the same `handleDetailsSubmit`. So submitting from the Online tab actually saves *all* fields from *all* tabs. That's fine functionally but two real consequences:

1. The "Save Changes" footer button is wired to whichever form matches `activeTab`, but since all three submit identical payloads, switching tabs and clicking Save can save stale state from a tab the operator hasn't touched yet (e.g. open editor, switch to Advanced, never visit Online — Advanced submit still writes the empty Online overrides).
2. Validation triggers (`validate_service_online_overrides`) fire on every save regardless of which tab the user was on, increasing surface for "weird error from a tab I didn't touch."

**Fix (low risk):** Drop the duplicate "Bookable Online" toggle from Details (it semantically belongs with the other online controls). Keep the unified submit handler — it works — but add a comment documenting that all three forms write the full payload.

### Bug 4 — Bulk edit doesn't refresh selection after success

**Where:** `ServicesSettingsContent.tsx` line 1107 passes `onComplete={clearSelection}`, but `useBulkUpdateServices` invalidates `services-data` *after* `onComplete` resolves. Operator sees:

1. Toast: "Updated 12 services"
2. Selection clears
3. ~200ms later: rows re-render with new prices

Cosmetic: small flash where prices are stale while the toolbar disappears. Fix: invalidate first, then resolve. Or call `clearSelection` inside the hook's `onSuccess` rather than via `onComplete` — sequencing only.

### Polish — Bulk edit price impact undercounts new services

`useBulkPriceImpactPreview` looks at trailing 30 days. A service launched 5 days ago shows zero projected impact even if it's already booking. Footnote in the dialog ("Excludes services with no recent volume") covers this, but for a 78-service catalog, operators will eyeball the number and miss new services. Optional enhancement: separately count `services_with_no_volume` in the impact data and surface "12 services have no volume yet — impact for those isn't projected."

### Polish — `'service-advanced-form'` ID is referenced in submit but the form's submit handler is `handleDetailsSubmit`

Cosmetic: `<form id="service-advanced-form" onSubmit={handleDetailsSubmit}>` works but reads as a smell. A future contributor will assume it has its own handler. Add a one-line comment, or rename to `service-shared-form` and have all three TabsContent forms reference the same ID.

## Recommended fix order (one wave, ~30 min)

1. Bug 1 — flip `original_price` semantics in edge function
2. Bug 2 — disable Apply when category toggled but unset
3. Bug 4 — move `clearSelection` into mutation `onSuccess` after invalidate
4. Bug 3 — drop duplicate Bookable Online toggle from Details tab
5. Polish — add "no volume yet" callout + form ID comment

## What I'm intentionally not flagging

- No audit log on price/duration mutations — that's **Wave 5** scope, called out in the original plan as the {{PLATFORM_NAME}} compliance lever.
- Bulk edit doesn't support all guardrail fields (start-up/shut-down windows, prompts) — intentionally limited to high-frequency bulk ops; per-field edits stay in the editor.
- `BulkEditServicesDialog` uses raw `Loader2` inside a `<Button>` — that's *allowed* by the loader doctrine (button-internal spinner), no change needed.

## Prompt feedback

Sharp prompt — "do a cleanup for any bugs and gaps or enhancements before we move to phase 4" gave me three explicit lenses (bugs, gaps, enhancements) and a clear cutoff (before Wave 4). That's a textbook audit prompt.

To go even sharper: **declare the severity bar.** E.g. *"Only P0/P1 bugs, skip cosmetic polish"* or *"Include cosmetic if it touches the catalog hot path."* Right now I had to guess where to draw the line and ended up surfacing 4 bugs + 2 polish items. If you'd specified "P0/P1 only, defer polish to Wave 5 cleanup," this audit would have been 3 items and a one-paragraph next-step. Pattern: **lens + cutoff + severity bar = audit you can act on without filtering.**
