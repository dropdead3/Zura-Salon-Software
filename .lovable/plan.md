

# Zura Pay Audit: Gaps, Bugs & Enhancements

## Bugs

### 1. Silent file validation failures in SplashScreenUploader
`processFile()` (lines 73-114) returns silently when file type or size validation fails — no toast, no feedback. The user drops an unsupported file and nothing happens.

**Fix**: Add `toast.error()` for invalid type ("Only JPG, PNG, and GIF are supported") and oversized files ("Image exceeds 2MB limit").

### 2. Payouts tab is org-scoped but should be location-scoped
The Payouts tab calls `useZuraPayPayouts(orgId)` without passing a `location_id`, even though the hook supports it. For multi-LLC orgs, this shows the org-default account's balance — not the location-specific balance. The hook already accepts `locationId` as a second param but it's never passed from the UI.

**Fix**: Add a location selector to `ZuraPayPayoutsTab` (same pattern as Fleet tab) and pass the selected location ID to `useZuraPayPayouts`.

### 3. `zura-pay-payouts` edge function lacks input validation
The request body is destructured directly without Zod validation (line 39). `schedule` param for `update_schedule` action is unvalidated — a malicious client could pass unexpected keys to `stripe.accounts.update`.

**Fix**: Add Zod schema validation for the request body (organization_id, location_id, action, schedule fields).

### 4. Payout schedule update lacks role gating
Any org member (including stylists) can update the payout schedule. Only admins/owners should be able to modify financial settings.

**Fix**: Add role check in `zura-pay-payouts` for `update_schedule` action — same pattern as `WRITE_ACTIONS` in `manage-stripe-terminals`.

### 5. `connect_account_id` exposed in payout response
Line 145 of `zura-pay-payouts` returns `connect_account_id` to the client. This is internal infrastructure and violates the brand abstraction layer.

**Fix**: Remove `connect_account_id` from the response payload.

## Gaps

### 6. No error feedback for "Generate from Logo" failure
`handleGenerateFromLogo` catches errors and logs to console (line 290) but never surfaces a toast to the user.

**Fix**: Add `toast.error('Failed to generate splash screen')` in the catch block.

### 7. Payouts tab has no location awareness for multi-LLC
As noted in bug 2, the entire Payouts subtab assumes single-account orgs. There's no way to view per-location balances, which contradicts the documented "decentralized payout" architecture.

### 8. Missing pagination for payouts history
The payouts list is capped at 25 (Stripe `limit: 25`) with no "Load More" or pagination. Orgs with high transaction volume will only see recent payouts.

**Fix**: Add cursor-based pagination using Stripe's `starting_after` param.

### 9. GIF splash screens skip resize
`processFile()` handles resize for JPG/PNG via canvas, but canvas `toDataURL` doesn't preserve GIF animation. The file is processed as a static image, silently losing the animation.

**Fix**: Either skip canvas processing for GIFs (pass through raw base64) or document that GIF animation is not preserved and convert to JPEG.

## Enhancements

### 10. Splash screen location sync indicator
After "Push to All Locations," there's no way to see which locations have the splash active vs. which don't. Add a small status column to the "All Locations" summary in Fleet tab, or a dedicated summary after batch push.

### 11. Stale file link handling for splash preview
The `splash_url` expires after 30 minutes, but `staleTime` is only 60s. If the user leaves the tab open for 30+ minutes, the image will break. Add an `onError` handler on the `<img>` tag to refetch the splash status when the link expires.

### 12. Firmware version constants are hardcoded
`LATEST_FIRMWARE` in `ZuraPayFleetTab.tsx` (line 49) is manually maintained. Consider fetching from an API or config to avoid stale "outdated" labels.

## Summary of Priority

| # | Type | Severity | Effort |
|---|------|----------|--------|
| 1 | Bug | Medium | Small |
| 2 | Bug | High | Medium |
| 3 | Bug | High (Security) | Small |
| 4 | Bug | High (Security) | Small |
| 5 | Bug | Medium (Security) | Trivial |
| 6 | Gap | Low | Trivial |
| 7 | Gap | High | Medium |
| 8 | Gap | Low | Small |
| 9 | Gap | Low | Small |
| 10 | Enhancement | Low | Medium |
| 11 | Enhancement | Low | Trivial |
| 12 | Enhancement | Low | Medium |

## Recommended Implementation Order
1. Security fixes first: items 3, 4, 5 (input validation, role gating, data exposure)
2. UX bugs: items 1, 6 (silent failures)
3. Multi-LLC payout scoping: items 2, 7 (location-aware payouts)
4. Polish: items 8, 9, 10, 11

## Files to Edit
- `supabase/functions/zura-pay-payouts/index.ts` — Zod validation, role gating, remove `connect_account_id`
- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — toast on validation failure, toast on logo generation failure, `onError` for expired splash URL
- `src/components/dashboard/settings/terminal/ZuraPayPayoutsTab.tsx` — location selector, pass `locationId` to hook
- `src/hooks/useZuraPayPayouts.ts` — no changes needed (already supports `locationId`)

