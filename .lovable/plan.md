

# Restrict Account & Billing to Owner/Super Admin + Owner Toggle for Super Admin Access

## Overview

Lock the Account & Billing settings category so only the **Account Owner** (`is_primary_owner`) and **Super Admin** (`is_super_admin`) can see and access it. Add a toggle within the page that lets the Account Owner revoke Super Admin access to billing management (plan changes, payment updates, invoice history).

## Changes

### 1. Database: New Organization Feature Flag

Use the existing `organization_feature_flags` table with a new flag key: `billing_owner_only`.

- When `billing_owner_only = true`, only the Account Owner can view/manage billing (Super Admins are locked out).
- Default: `false` (both Owner and Super Admin have access).

No migration needed — this uses the existing `organization_feature_flags` table with a new `flag_key` value inserted at runtime.

### 2. New Hook: `useBillingAccess`

A hook that returns:
- `canViewBilling` — true if user is Account Owner, or is Super Admin and `billing_owner_only` is false
- `isPrimaryOwner` — for showing the toggle
- `isBillingOwnerOnly` — current toggle state
- `toggleBillingOwnerOnly()` — mutation to flip the flag

Composes `useIsPrimaryOwner`, `useEmployeeProfile` (for `is_super_admin`), and a query on `organization_feature_flags` for the `billing_owner_only` flag.

### 3. Settings Page: Hide Category Tile

In `Settings.tsx`, filter out `account-billing` from `orderedCategories` when `canViewBilling` is false. This prevents the tile from appearing in the settings grid for unauthorized users.

### 4. AccountBillingContent: Access Gate + Owner Toggle

- Wrap the entire content in an access check (redundant safety layer).
- Add an info banner at the top: "Only the Account Owner and Super Admins can view this page."
- When `isPrimaryOwner` is true, show a toggle card: **"Restrict billing to Account Owner only"** — with a description explaining that enabling it removes Super Admin access to plan changes, payment methods, and invoice history.
- When a Super Admin views the page (and `billing_owner_only` is false), show a subtle note: "You have access to billing as a Super Admin. The Account Owner can restrict this."

### 5. Files

| File | Action |
|------|--------|
| `src/hooks/useBillingAccess.ts` | New — access check + toggle logic |
| `src/pages/dashboard/admin/Settings.tsx` | Filter `account-billing` tile based on `canViewBilling` |
| `src/components/dashboard/settings/AccountBillingContent.tsx` | Add access banner, owner toggle card |

