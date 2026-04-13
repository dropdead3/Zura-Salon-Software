

# Stripe Terminal Configurator — Audit Report

## Findings Summary

3 bugs, 2 security gaps, 6 enhancements identified.

---

## Bugs

### B1. CORS headers missing modern Supabase client headers
The edge function's `corsHeaders` omits `x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`. Modern `supabase-js` sends these and some proxies/browsers may reject the preflight.

**Fix**: Update `corsHeaders` in `manage-stripe-terminals/index.ts` to include all required headers per the SDK convention.

### B2. Hardcoded postal code `"00000"` when creating terminal locations
Line 141 of the edge function hardcodes `postal_code: "00000"`. The `locations` table likely has a `postal_code` or `zip_code` column that should be used instead.

**Fix**: Query `postal_code` (or equivalent column) from the locations table and pass it through. Fall back to empty string only if truly missing.

### B3. Delete actions close dialog before mutation completes
`handleDeleteLocation` and `handleDeleteReader` call the mutation with `onSuccess: () => setDeleteTarget(null)`, but the `AlertDialogAction` also triggers the dialog's `onOpenChange` immediately on click, potentially closing the dialog before the mutation finishes and hiding the loading spinner.

**Fix**: Prevent default close on the `AlertDialogAction` and only close programmatically in `onSuccess`/`onError`.

---

## Security Gaps

### S1. No role-based gating on destructive actions
The edge function checks org membership but not role. Any org member (including stylists) can delete terminal locations and readers. Only admins/managers should perform these actions.

**Fix**: Query the user's role from `user_roles` or `organization_members` and restrict `create_location`, `delete_location`, `register_reader`, `delete_reader` to admin/manager roles. Read-only `list_*` actions can remain available to all members.

### S2. No input validation (Zod) in edge function
The `action` param and all `params` values are used without sanitization. The `terminal_location_id` and `reader_id` are interpolated directly into URL paths, risking path traversal if malformed.

**Fix**: Add Zod validation for the request body. Validate that IDs match expected Stripe ID patterns (`tml_*`, `tmr_*`).

---

## Enhancements

### E1. Missing postal code from locations query
The `useZuraPayLocations` hook selects `address, city, state_province` but not `postal_code`. This data would be useful for display and is needed for the address fix in B2.

### E2. No "All Locations" summary view
The plan specified a bulk "All Locations" view showing a summary table with terminal/reader counts per location. This was not implemented.

**Fix**: Add an "All Locations" option to the location picker that renders a summary table showing each location's terminal location count, total readers, and online/offline breakdown.

### E3. Reader count badge missing from location picker
The plan specified the location picker should show reader count badges next to each location name. Currently only a text label below the picker shows the count.

**Fix**: Add inline badge with reader count inside each `SelectItem` in the location picker.

### E4. No error recovery on registration wizard failure
If `registerReader.mutate` fails in step 2, the user sees a toast but the wizard stays on step 2 with no indication of what went wrong inline. The pairing code field retains its value, which is good, but there's no inline error message.

**Fix**: Display the error message inline below the pairing code field on failure.

### E5. Missing `MetricInfoTooltip` on card titles
Per UI Canon, every analytics/dashboard card must have a `MetricInfoTooltip` inline with the title. Both the Terminal Locations and Terminal Readers cards omit this.

### E6. Buttons should use `tokens.button.*` sizing
The "Create Location" and "Register Reader" buttons use raw `size="sm"` instead of `tokens.button.card` or `tokens.button.cardAction` per the design token system.

---

## Files Changed

| File | Changes |
|---|---|
| `supabase/functions/manage-stripe-terminals/index.ts` | B1 (CORS), B2 (postal code), S1 (role check), S2 (Zod validation) |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | B3 (dialog close), E2 (all-locations view), E3 (picker badges), E4 (inline errors), E5 (tooltips), E6 (button tokens) |
| `src/hooks/useStripeTerminals.ts` | E1 (postal code in query) |

3 files modified. No database changes. No new dependencies (Zod is available in Deno edge runtime).

