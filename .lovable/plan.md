

# Security Hardening: Fix All Critical RLS Vulnerabilities

## Summary
The security scan identified **11 critical errors** and **5 warnings** across RLS policies. This plan fixes all critical issues and the actionable warnings in a single migration, plus minor frontend adjustments.

---

## Vulnerabilities & Fixes

### CRITICAL — Data Exposure Fixes

#### 1. Organizations table — Stripe/Twilio credentials publicly readable
**Problem**: Public SELECT policy `(status = 'active')` returns all columns including `twilio_auth_token`, `stripe_customer_id`, `billing_email`.
**Fix**: Create a public-safe view `organizations_public` with only safe columns (id, name, slug, status, logo_url, timezone, website_url, business_type, is_multi_location, settings). Drop the permissive public policy. Add a new policy that uses the view pattern or restrict the public SELECT to use a security-definer function.

*Approach*: Replace the public SELECT policy with one that goes through a restricted view (`security_invoker = on`). Add a `USING (false)` base-table policy for anon role, and let authenticated org members/platform users use existing policies.

#### 2. Employee profiles — login PINs publicly readable
**Problem**: Public policy for homepage-visible stylists returns all columns including `login_pin`, `emergency_contact`, `birthday`, `phone`.
**Fix**: Create a `employee_profiles_public` view with only safe display columns (user_id, display_name, full_name, photo_url, bio, specialties, instagram_handle, homepage_visible, is_active). Replace the anon SELECT policy to go through this view.

#### 3. Client portal tokens — all tokens enumerable
**Problem**: `USING (token IS NOT NULL)` is always true.
**Fix**: Drop this policy. Token validation should happen server-side via edge function or be scoped to the specific token being looked up. Since the frontend queries by specific token via `.eq('token', token)`, we can restrict the policy to only return rows matching a token passed as a request parameter, or move to edge function. Simplest fix: remove the anon/public SELECT policy entirely and handle token lookup via a security-definer function.

#### 4. Client feedback responses — all feedback readable
**Problem**: `USING (token IS NOT NULL)` is always true since token is NOT NULL.
**Fix**: Same approach — create a security-definer function `validate_feedback_token(token)` that returns the feedback row. Remove the permissive anon SELECT policy.

#### 5. Platform invitations — all emails readable
**Problem**: `USING (true)` on SELECT for public role.
**Fix**: Drop the `Anyone can read invitation by token` policy. Create a security-definer function `lookup_platform_invitation(token)` for anonymous token validation.

#### 6. Staff invitations — all emails readable
**Problem**: Same as platform invitations — `USING (true)`.
**Fix**: Same approach — security-definer function `lookup_staff_invitation(token)`.

#### 7. Day-rate bookings — PII publicly readable
**Problem**: `USING (true)` on public SELECT exposes emails, phones, payment IDs.
**Fix**: Drop the public SELECT policy. Public booking creation can stay. For viewing own booking, use a security-definer function that looks up by confirmation token or email.

#### 8. Organization kiosk settings — exit PIN exposed
**Problem**: Anon policy allows reading kiosk settings including `exit_pin`.
**Fix**: Drop the anon SELECT policy `Kiosk can read settings by location`. Serve kiosk config through a security-definer function `get_kiosk_settings(device_token)` that validates the device first and excludes `exit_pin`.

#### 9. Business settings — EIN publicly readable
**Problem**: `USING (true)` exposes `ein`, `phone`, `email`, `mailing_address`.
**Fix**: Create `business_settings_public` view with only safe columns (business_name, logo_light_url, logo_dark_url, icon_light_url, icon_dark_url, sidebar_layout, website). Replace the public SELECT policy.

#### 10. Kiosk devices — device tokens readable by anon
**Problem**: `USING (true)` on anon SELECT returns all device records with `device_token`.
**Fix**: Drop the anon SELECT policy. Device authentication should go through security-definer function.

#### 11. Client notes — cross-org data leak
**Problem**: `USING (is_private = false)` has no org scoping — any authenticated user reads all non-private notes across all organizations.
**Fix**: Add org scoping. Since `client_notes` has no `organization_id`, scope via `client_id` → join to `phorest_clients.organization_id`. Replace policy with: `USING (is_private = false AND EXISTS (SELECT 1 FROM phorest_clients pc WHERE pc.id = client_id AND is_org_member(auth.uid(), pc.organization_id)))`.

#### 12. Client form signatures — cross-org data leak
**Problem**: `USING (true)` for authenticated users, no org scoping.
**Fix**: Scope via appointment or form_template. Replace with: `USING (EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND is_org_member(auth.uid(), a.organization_id)))` or similar join path.

### WARNINGS — Secondary Fixes

#### 13. Signature presets — no ownership check
**Fix**: Add `created_by = auth.uid()` to UPDATE/DELETE policies.

#### 14. Kiosk devices — anonymous INSERT/UPDATE too permissive
**Fix**: Move device registration to edge function. For now, tighten the INSERT check and remove the anonymous UPDATE policy.

#### 15. Kiosk analytics — anonymous INSERT too permissive
**Fix**: Tighten to require a valid device token or move to edge function.

---

## Implementation

### Migration 1: Security-definer lookup functions
Create functions for token-based lookups:
- `lookup_portal_token(p_token text)` → returns client_id, organization_id, expires_at
- `lookup_feedback_by_token(p_token text)` → returns feedback row
- `lookup_platform_invitation_by_token(p_token text)` → returns invitation row
- `lookup_staff_invitation_by_token(p_token text)` → returns invitation row
- `get_kiosk_config(p_device_token text)` → returns settings without exit_pin

### Migration 2: Create restricted public views
- `organizations_public` (safe columns only)
- `employee_profiles_public` (safe columns only)
- `business_settings_public` (safe columns only)

### Migration 3: Drop/replace permissive policies
- Drop all `USING (true)` and `USING (token IS NOT NULL)` public/anon SELECT policies
- Add restricted replacement policies where needed
- Fix cross-org leaks on `client_notes`, `client_form_signatures`, `signature_presets`

### Frontend changes
- Update `useClientPortalData.ts` to call `lookup_portal_token()` RPC instead of direct table query for anonymous validation
- Update `usePlatformInvitations.ts` to call `lookup_platform_invitation_by_token()` RPC for token lookup
- Update `useStaffInvitations.ts` to call `lookup_staff_invitation_by_token()` RPC for token lookup
- Update any public-facing organization queries to use `organizations_public` view
- Update public employee profile queries to use `employee_profiles_public` view

### Files affected
| File | Change |
|------|--------|
| New migration SQL | All policy drops, function/view creation, new policies |
| `src/hooks/useClientPortalData.ts` | Use RPC for token validation |
| `src/hooks/usePlatformInvitations.ts` | Use RPC for token lookup |
| `src/hooks/useStaffInvitations.ts` | Use RPC for token lookup |
| Public org queries (various) | Query `organizations_public` view |
| Public employee queries (various) | Query `employee_profiles_public` view |

