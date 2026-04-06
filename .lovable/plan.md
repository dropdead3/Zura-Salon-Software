

# Pre-Production Security Audit — Comprehensive Findings

## Executive Summary

This audit identified **6 Critical**, **8 High**, **6 Medium**, and **4 Low** severity issues across RLS policies, edge function authorization, secrets handling, XSS vectors, and architectural patterns. The most dangerous findings are **cross-tenant data exposure** through unscoped RLS policies and **unauthenticated edge functions** that perform privileged operations using service-role keys.

---

## CRITICAL FINDINGS (Fix Before Launch)

### C1. Cross-Tenant Client PII Exposure
- **Severity**: Critical
- **Category**: Multi-Tenant Isolation
- **Location**: RLS policy on `clients` and `phorest_clients` tables
- **Vulnerability**: The `can_view_all_clients()` function checks for admin/manager/receptionist role in `user_roles` **without any `organization_id` filter**. Any manager in Org A can read every client row in Org B, C, etc. — names, emails, phones, birthdays, medical alerts.
- **Exploit**: Authenticated user with `manager` role calls `supabase.from('clients').select('*')` — returns all clients across all orgs.
- **Fix**: Add `AND organization_id IN (SELECT org_id FROM employee_profiles WHERE user_id = _user_id)` to the function, or replace the policy with `USING(is_org_member(auth.uid(), organization_id))`.

### C2. Cross-Tenant Appointment Data Exposure
- **Severity**: Critical
- **Category**: Multi-Tenant Isolation
- **Location**: RLS policies on `appointments` table
- **Vulnerability**: Same pattern — admin role check with no org scoping. Leaks client_email, client_phone, deposit_stripe_payment_id, client_notes across tenants.
- **Fix**: Add `AND organization_id` scoping to all appointment policies using `is_org_member()`.

### C3. Cross-Tenant Employee Profile Exposure
- **Severity**: Critical
- **Category**: Multi-Tenant Isolation
- **Location**: RLS policy on `employee_profiles`
- **Vulnerability**: `current_user_is_coach()` → `is_coach_or_admin()` checks role without org constraint. Emergency contacts, departure notes, phones exposed cross-org.
- **Fix**: Scope to `is_org_member(auth.uid(), organization_id)`.

### C4. Cross-Tenant Payment Card Exposure
- **Severity**: Critical
- **Category**: Sensitive Data Exposure
- **Location**: RLS policy on `client_cards_on_file`
- **Vulnerability**: The role-based branch (`manager`/`receptionist`) has no `organization_id` check. `stripe_customer_id`, `stripe_payment_method_id`, `card_last4`, expiry readable cross-org.
- **Fix**: Add `AND is_org_member(auth.uid(), organization_id)` to the role branch.

### C5. `data-export` Edge Function — No Auth Check
- **Severity**: Critical
- **Category**: Authorization
- **Location**: `supabase/functions/data-export/index.ts` lines 15-25
- **Vulnerability**: `verify_jwt = false` AND the function does NOT check the `Authorization` header. Anyone who can reach the endpoint can export **any organization's full data** (clients, appointments, billing, users) by passing any `organization_id`. Uses service-role key, bypassing all RLS.
- **Exploit**: `curl -X POST https://<project>.supabase.co/functions/v1/data-export -d '{"organization_id":"<any-uuid>","export_type":"full"}'`
- **Fix**: Add JWT verification — extract bearer token, call `auth.getUser()`, verify caller is org admin via `is_org_admin`.

### C6. `account-provisioner` Edge Function — No Auth Check
- **Severity**: Critical
- **Category**: Authorization
- **Location**: `supabase/functions/account-provisioner/index.ts` lines 24-42
- **Vulnerability**: `verify_jwt = false` and no auth header validation. Anyone can create new organizations and admin accounts with arbitrary data.
- **Fix**: Add caller authentication and platform role verification.

---

## HIGH FINDINGS

### H1. `backup-archival` Edge Function — No Auth, Destructive Operations
- **Severity**: High
- **Category**: Authorization
- **Location**: `supabase/functions/backup-archival/index.ts`
- **Vulnerability**: `verify_jwt = false`, no auth. Deletes/archives appointments, logs, and notifications globally across all orgs using service-role. Anyone can trigger data deletion.
- **Fix**: Add platform admin auth check.

### H2. `import-data` Edge Function — Weak Auth, No Org Ownership Verification
- **Severity**: High
- **Category**: Authorization
- **Location**: `supabase/functions/import-data/index.ts` lines 74-83
- **Vulnerability**: Auth header is optional (`if (authHeader)`). Even when present, the caller's org membership is never verified against the `organization_id` in the request body. Attacker can import data into any org.
- **Fix**: Make auth mandatory, verify caller membership in target org.

### H3. Hardcoded Encryption Key Fallback
- **Severity**: High
- **Category**: Secrets
- **Location**: `supabase/functions/gusto-oauth/index.ts:81`, `payroll-proxy/index.ts:51`, `quickbooks-oauth/index.ts:80`
- **Vulnerability**: `PAYROLL_ENCRYPTION_KEY || 'default-dev-key'` — if the secret is not set, payroll OAuth tokens are encrypted with a publicly known key. This is a backdoor.
- **Fix**: Fail fast if `PAYROLL_ENCRYPTION_KEY` is not set — `throw new Error('PAYROLL_ENCRYPTION_KEY required')`.

### H4. 89 Edge Functions with `verify_jwt = false`
- **Severity**: High
- **Category**: Authorization
- **Location**: `supabase/config.toml` — all 89 entries
- **Vulnerability**: While some functions (webhooks, cron jobs) legitimately need `verify_jwt = false`, many user-facing functions like `ai-assistant`, `ai-agent-chat`, `execute-ai-action`, `ai-personal-insights`, `data-export`, `import-data` should require JWT. The blanket `verify_jwt = false` pattern creates a large attack surface.
- **Fix**: Audit each function and re-enable JWT for user-facing ones. For those that must remain open, add manual auth header validation internally.

### H5. No HTML Sanitization on `dangerouslySetInnerHTML`
- **Severity**: High
- **Category**: XSS / Injection
- **Location**: 9 files, 60+ instances — `AgreementStep.tsx`, `EmailTemplatesManager.tsx`, `HelpArticleView.tsx`, `AccountNoteCard.tsx`, `EmailTemplateEditor.tsx`, `StockTab.tsx`, `EmailBrandingSettings.tsx`
- **Vulnerability**: User-generated or database-stored HTML is rendered without DOMPurify or any sanitizer. If an admin or attacker injects `<script>` or event handlers into agreement content, email templates, help articles, or account notes, it executes in every viewer's browser.
- **Fix**: Install `dompurify` and wrap all `dangerouslySetInnerHTML` content: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}`.

### H6. Realtime Channel Authorization Missing
- **Severity**: High
- **Category**: Multi-Tenant Isolation
- **Location**: Supabase Realtime configuration
- **Vulnerability**: No RLS policies on `realtime.messages`. Any authenticated user can subscribe to any channel topic — including chat messages, appointment updates, and performance metrics from other organizations.
- **Fix**: This is a Supabase-reserved schema limitation. Mitigation: implement application-level channel authorization using Supabase Realtime's `authorize` callback, or restrict published tables.

### H7. `send-push-notification` — No Auth, Arbitrary Notification Injection
- **Severity**: High
- **Category**: Authorization
- **Location**: `supabase/functions/send-push-notification/index.ts` lines 250-268
- **Vulnerability**: `verify_jwt = false`, no auth check. Anyone can send push notifications to any user by passing their `user_id`. Can be used for phishing.
- **Fix**: Add auth and verify caller has permission to notify target users.

### H8. CORS Wildcard on All Edge Functions
- **Severity**: High
- **Category**: Network Security
- **Location**: Every edge function — `'Access-Control-Allow-Origin': '*'`
- **Vulnerability**: All 142+ edge functions allow requests from any origin. Combined with `verify_jwt = false`, this means any website can call privileged functions.
- **Fix**: Restrict CORS to your production domain(s) and Lovable preview URLs. Use a shared CORS config.

---

## MEDIUM FINDINGS

### M1. Auth Tokens in localStorage (Supabase Default)
- **Severity**: Medium
- **Category**: Session Security
- **Location**: `src/integrations/supabase/client.ts:14` — `storage: localStorage`
- **Vulnerability**: Supabase stores auth tokens in localStorage by default. Any XSS vulnerability (see H5) can steal tokens. The 60+ `dangerouslySetInnerHTML` instances make this a realistic attack chain: XSS → token theft → account takeover.
- **Fix**: This is the Supabase default and changing it is complex. The priority fix is eliminating XSS vectors (H5). Long-term, consider cookie-based auth.

### M2. `organization_secrets` — Credentials Not Vault-Encrypted
- **Severity**: Medium
- **Category**: Secrets
- **Location**: `organization_secrets` table
- **Vulnerability**: Twilio credentials stored as plaintext columns. While SELECT is blocked by RLS, service-role queries and database dumps expose them. The Phase 5 fix removed SELECT policy, but values remain unencrypted at rest.
- **Fix**: Migrate to Supabase Vault or encrypt values before storage with a per-org key.

### M3. `chat-attachments` Storage Bucket — Missing SELECT Policy
- **Severity**: Medium
- **Category**: Storage
- **Location**: Storage bucket `chat-attachments`
- **Vulnerability**: Private bucket has INSERT and DELETE policies but no SELECT policy. Users cannot retrieve uploaded attachments via the storage API, silently breaking the feature. If a SELECT policy is added later without proper scoping, files could leak.
- **Fix**: Add a SELECT policy scoped to channel membership.

### M4. `employee_pins` — Scanner Flagged as Plaintext (Already Fixed)
- **Severity**: Medium (Informational — verify)
- **Category**: Data Protection
- **Location**: `employee_pins.login_pin` column
- **Vulnerability**: The security scanner still flags this as plaintext storage. Phase 7 migrated to bcrypt — verify the migration ran successfully and all existing PINs are hashed.
- **Fix**: Verify via `SELECT login_pin FROM employee_pins LIMIT 5` — all values should start with `$2a$` or `$2b$`.

### M5. No Rate Limiting on Auth or Sensitive Endpoints
- **Severity**: Medium
- **Category**: API Security
- **Location**: All edge functions, auth endpoints
- **Vulnerability**: No rate limiting on login attempts, PIN validation (`validate_dock_pin`, `validate_user_pin`), push notification sends, or AI function invocations. PINs are 4-digit (10,000 combinations) — brute-forceable even with bcrypt.
- **Fix**: Add rate limiting via Supabase's built-in auth rate limits. For PIN validation, add account lockout after N failed attempts. For edge functions, implement per-IP rate limiting.

### M6. No Input Validation on Edge Function Bodies
- **Severity**: Medium
- **Category**: Input Validation
- **Location**: Most edge functions (e.g., `data-export`, `import-data`, `account-provisioner`)
- **Vulnerability**: Request bodies are destructured and used directly without schema validation. No Zod/Joi validation. Malformed inputs could cause unexpected behavior.
- **Fix**: Add Zod validation to all edge function request bodies.

---

## LOW FINDINGS

### L1. Extensions in `public` Schema
- **Severity**: Low
- **Category**: Database
- **Vulnerability**: `pg_trgm`, `unaccent` in public schema. Minor hygiene issue.
- **Fix**: Acceptable risk — moving would break dependent functions.

### L2. `RLS Enabled No Policy` on `employee_pins` and `demo_queries`
- **Severity**: Low (Informational)
- **Vulnerability**: By design — `employee_pins` accessed via SECURITY DEFINER RPCs, `demo_queries` is dev-only.
- **Fix**: No action needed. Already documented as intentional.

### L3. `USING(true)` on `job_applications` and `day_rate_bookings` INSERT
- **Severity**: Low
- **Vulnerability**: Public INSERT for public-facing forms. Already has admin-only SELECT/UPDATE/DELETE.
- **Fix**: Intentional — mark as ignored in scanner.

### L4. Console Logging of User Data
- **Severity**: Low
- **Category**: Logging
- **Location**: Multiple edge functions (e.g., `send-push-notification:280`)
- **Vulnerability**: `console.log(`Sending push notifications to ${targetUserIds.length} users`)` — user counts and sometimes IDs logged. Not directly exploitable but increases risk surface.
- **Fix**: Reduce logging verbosity in production.

---

## Systemic Architecture Weaknesses

1. **RLS Policy Pattern Inconsistency**: Some tables use `is_org_member()` correctly, others use raw role checks without org scoping. No enforced pattern — each policy was written independently, leading to gaps.

2. **Edge Function Auth is Opt-In, Not Opt-Out**: The `verify_jwt = false` pattern is applied blanket-wide. The architecture should default to `verify_jwt = true` and only disable for webhooks/cron jobs.

3. **No Centralized Auth Middleware for Edge Functions**: Each function manually parses auth headers (or doesn't). A shared middleware would prevent omissions.

4. **Frontend-Backend Trust Boundary**: `organization_id` is passed from the client in request bodies to edge functions that use service-role keys. The function trusts the client-provided org ID instead of deriving it from the authenticated user's token.

5. **XSS → Token Theft Chain**: localStorage token storage + 60+ unsanitized `dangerouslySetInnerHTML` = realistic account takeover vector.

---

## Prioritized Fix Roadmap

### Phase 1 — MUST FIX BEFORE LAUNCH (Critical + High blocking)
1. Fix cross-tenant RLS policies (C1-C4) — SQL migration
2. Add auth to `data-export`, `account-provisioner`, `backup-archival`, `import-data`, `send-push-notification` (C5, C6, H1, H2, H7)
3. Remove `default-dev-key` fallback — fail fast (H3)
4. Install DOMPurify, sanitize all `dangerouslySetInnerHTML` (H5)

### Phase 2 — HIGH PRIORITY (First week post-launch)
5. Audit all 89 `verify_jwt = false` functions — re-enable JWT on user-facing ones (H4)
6. Restrict CORS origins on edge functions (H8)
7. Add rate limiting to PIN validation and auth endpoints (M5)

### Phase 3 — HARDENING (First month)
8. Add Zod validation to all edge function request bodies (M6)
9. Add SELECT policy to `chat-attachments` bucket (M3)
10. Verify PIN hashing migration (M4)
11. Explore Supabase Vault for `organization_secrets` (M2)
12. Implement Realtime channel authorization (H6)

### Phase 4 — ARCHITECTURE
13. Create shared edge function auth middleware
14. Default `verify_jwt = true` in config.toml — only allowlist exceptions
15. Derive `organization_id` from auth token in edge functions instead of trusting client input

---

## Technical Implementation Notes

### For C1-C4 (Cross-tenant RLS fixes):
```sql
-- Example fix for clients table
DROP POLICY IF EXISTS "Admin roles can view all clients" ON public.clients;
CREATE POLICY "Admin roles can view org clients" ON public.clients
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
```

### For C5 (data-export auth):
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
const { data: { user }, error } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
if (error || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
// Verify user is org admin
const isAdmin = await adminClient.rpc('is_org_admin', { _user_id: user.id, _org_id: request.organization_id });
if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
```

### For H3 (encryption key fallback):
```typescript
const encryptionKey = Deno.env.get('PAYROLL_ENCRYPTION_KEY');
if (!encryptionKey) throw new Error('PAYROLL_ENCRYPTION_KEY is required');
```

### For H5 (XSS):
```typescript
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

