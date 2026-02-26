

## Fix: Preview Button 404 — Missing Public RLS Policy on Organizations

### Problem

When clicking **Preview** in the editor, the button opens `/org/drop-dead-salons` in a new tab. The `OrgPublicRoute` component calls `useOrganizationBySlug('drop-dead-salons')`, which queries the `organizations` table. However, all existing RLS policies on that table require `auth.uid()` (authenticated users only):

- "Platform users can view all organizations" — requires platform role
- "Users can view their own organization" — requires membership

An unauthenticated visitor (or a new tab without an active session) gets a Postgres RLS denial, which surfaces as an error in `OrgPublicRoute`, triggering the `<NotFound />` fallback — the exact 404 you see.

### Root Cause

The `/org/:orgSlug` routes are **public-facing pages** (the salon's website for their clients), but the database has no anonymous/public SELECT policy on the `organizations` table.

### Fix

Add a **narrowly scoped** RLS policy that allows anonymous SELECT access to **only** the columns needed for public site rendering, restricted to **active** organizations. This is the standard pattern for public storefronts.

#### 1. Database Migration

```sql
CREATE POLICY "Public can view active organizations by slug"
  ON public.organizations
  FOR SELECT
  USING (status = 'active');
```

This allows unauthenticated requests to read organization rows, but **only** active ones. Combined with the existing authenticated policies, this is additive and does not weaken any existing access control.

**Security note**: The `organizations` table contains fields like `name`, `slug`, `logo_url`, `business_type`, `settings`, and `timezone` — all of which are already displayed on the public site. Sensitive fields like `primary_contact_email`, `primary_contact_phone`, and `legal_name` are present but are not used by public components. If desired, a database view could further restrict columns, but this is a Phase 2 concern and matches the current public site architecture.

#### 2. No Code Changes

The `useOrganizationBySlug` hook, `OrgPublicRoute`, and all public page components are already correct. They just need the database to allow the query to succeed for anonymous users.

### Files

| File | Change |
|---|---|
| Database migration | Add public SELECT policy for active organizations |

One migration. No code file changes.

