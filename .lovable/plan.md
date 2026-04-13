

# Terminal Hardware Request Feature

## Overview

Build a self-service terminal ordering flow inside Zura Pay settings (org side) and a fulfillment management view on the platform admin side. Organizations submit requests for new/replacement terminals, and platform admins review, approve, and track shipment.

## Architecture

```text
Org Settings (Terminals tab)
└── "Request a Terminal" card (NEW)
    ├── Request form: location, quantity, reason (new/replacement/additional), notes
    └── Request history table with status badges

Platform Admin (/platform/stripe-health or new sub-route)
└── Terminal Requests panel (NEW)
    ├── Incoming requests table (org, location, reason, status, date)
    ├── Status management: pending → approved → shipped → delivered / denied
    └── Tracking number + notes per request
```

## Database

New table: `terminal_hardware_requests`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| organization_id | uuid FK | references organizations(id), RLS scoped |
| location_id | text | references locations(id) |
| requested_by | uuid | references auth.users(id) |
| quantity | integer | default 1 |
| reason | text | 'new_location', 'replacement', 'additional', 'other' |
| notes | text | nullable, free-form from org |
| status | text | 'pending', 'approved', 'shipped', 'delivered', 'denied' |
| admin_notes | text | nullable, platform admin notes |
| tracking_number | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS:
- Org members can SELECT their own org's requests
- Org admins/managers can INSERT for their org
- Platform users can SELECT all, UPDATE status/admin_notes/tracking

## Changes

### 1. Database Migration
- Create `terminal_hardware_requests` table with RLS policies
- `is_org_member` for org-side reads, `is_platform_user` for platform-side reads/updates

### 2. Edge Function: `manage-terminal-requests/index.ts`
Actions:
- `create_request` — org admin submits a request (validates org membership + role)
- `list_requests` — org-scoped list for settings UI
- `list_all_requests` — platform-scoped list (requires platform role)
- `update_request` — platform admin updates status, tracking, notes

### 3. Hook: `src/hooks/useTerminalRequests.ts`
- `useTerminalRequests(orgId)` — org-scoped list
- `useAllTerminalRequests()` — platform-scoped list
- `useCreateTerminalRequest()` — mutation
- `useUpdateTerminalRequest()` — mutation (platform side)

### 4. Org UI: Add to `TerminalSettingsContent.tsx`
- New "Request a Terminal" card below existing terminal management
- Form dialog: select location, quantity (1-5), reason dropdown, optional notes
- Request history table showing status, date, tracking number
- Status badges: pending (amber), approved (blue), shipped (violet), delivered (green), denied (red)

### 5. Platform UI: `src/components/platform/stripe/TerminalRequestsTable.tsx`
- Table with org name, location, reason, quantity, status, date, actions
- Inline status update dropdown + tracking number input
- Admin notes field
- Filterable by status
- Integrated into StripeHealth page as a new section or as a tab

### 6. Route/Nav Integration
- Add `TerminalRequestsTable` as a section within the existing Stripe Health page (no new route needed)

## Files

| File | Action |
|---|---|
| Migration | Create `terminal_hardware_requests` table + RLS |
| `supabase/functions/manage-terminal-requests/index.ts` | Create — CRUD edge function |
| `src/hooks/useTerminalRequests.ts` | Create — React Query hooks |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Modify — Add request card + history |
| `src/components/platform/stripe/TerminalRequestsTable.tsx` | Create — Platform admin table |
| `src/pages/dashboard/platform/StripeHealth.tsx` | Modify — Add terminal requests section |

6 files (3 new, 2 modified, 1 migration). No new dependencies.

