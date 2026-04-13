

# Fix Zura Pay "Continue Onboarding" and Return URL Routing

## Problems Identified

1. **Return URLs use wrong query param**: All Stripe onboarding return/refresh URLs use `?tab=terminals` but the Settings page reads `?category=terminals` to determine which settings page to render. When Stripe redirects back, the user lands on the settings hub — `TerminalSettingsContent` never mounts, so the return-handler `useEffect` never fires.

2. **Hardware checkout URLs have the same bug**: `ZuraPayHardwareTab.tsx` also uses `?tab=terminals&subtab=hardware`.

3. **No functional issue with the button itself**: The `onStartConnect` handler correctly calls `create_account_and_link`, which reuses an existing account and generates a new Account Link. The redirect to Stripe onboarding should work — but if the edge function returns an error (e.g., expired account link), the toast may be missed. We should add better error visibility.

## File Changes

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Replace all `?tab=terminals` with `?category=terminals` in return/refresh URLs (lines 305-306 and 418-419). This ensures Stripe redirects land on the correct settings page. |
| 2 | `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` | Replace `?tab=terminals&subtab=hardware` with `?category=terminals&subtab=hardware` in checkout success/cancel URLs. |
| 3 | `src/pages/dashboard/admin/Settings.tsx` | Add logic to read `subtab` from search params and pass it through, and ensure `zura_pay_return`/`zura_pay_refresh` params also trigger `activeCategory = 'terminals'` on initial load. Add a check: if `searchParams` contains `zura_pay_return`, `zura_pay_refresh`, or `tab=terminals`, auto-set category to `'terminals'`. |

## Result
- "Continue Onboarding" correctly redirects to Stripe Express onboarding form.
- After completing onboarding, Stripe redirects back to the Zura Pay settings page (not the hub).
- The return-handler auto-verifies connection status on landing.
- Hardware checkout returns also land on the correct tab.

