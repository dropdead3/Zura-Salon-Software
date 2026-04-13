

# Surface Client Disputes + Ban Management in Client Hub

## Current State

**Already built:**
- `clients` table has `is_banned`, `banned_at`, `banned_by`, `ban_reason` columns
- `BanClientToggle` component with ban/unban dialogs exists
- `BannedClientBadge` and `BannedClientWarningDialog` exist and are used in booking flows
- `ClientDetailSheet` shows ban status and the toggle
- `payment_disputes` table exists with `client_name`, `client_email`, `amount`, `status`, `reason` — but **no `client_id` foreign key**

**Missing:**
- No dispute history on client profiles (`ClientDetailSheet`)
- No "Dispute Risk" segment in the Client Health Hub
- Client Hub has no dedicated view for flagged/banned clients or dispute-prone clients

## Plan

### 1. Add `client_id` column to `payment_disputes`
Add an optional `client_id UUID REFERENCES clients(id)` column. Update the dispute webhook handler to resolve `client_id` from the charge's client email when inserting disputes. This enables direct joins.

### 2. Create `useClientDisputes` hook
Query `payment_disputes` by `client_id` (primary) or fallback to `client_email` match. Returns dispute count, total disputed amount, and list of disputes for a given client.

### 3. Add Dispute History section to `ClientDetailSheet`
In the client profile's existing tabbed layout, add a "Disputes" indicator. Show:
- Count badge on the profile header if disputes exist (red alert style)
- List of disputes with date, amount, reason, and status
- Auto-suggest ban action if client has 2+ disputes

### 4. Add "Dispute Risk" segment to Client Health Hub
Add a new segment to `useClientHealthSegments` that queries clients who have open disputes or multiple past disputes. Surface this alongside existing segments (at-risk, lapsed, etc.) with an `AlertTriangle` icon.

### 5. Add "Flagged Clients" card to Client Hub
Add a new `HubCard` on the Client Hub page linking to a filtered view showing banned clients and clients with disputes — giving managers a single surface to review problematic clients.

## Files

| File | Action |
|---|---|
| Migration | Add `client_id` column to `payment_disputes` |
| `supabase/functions/zura-pay-webhooks/index.ts` | Resolve `client_id` from email when inserting disputes |
| `src/hooks/useClientDisputes.ts` | **New** — fetch disputes for a client |
| `src/components/dashboard/ClientDetailSheet.tsx` | Add dispute history section + dispute count badge |
| `src/hooks/useClientHealthSegments.ts` | Add "Dispute Risk" segment |
| `src/pages/dashboard/admin/ClientHub.tsx` | Add "Flagged Clients" hub card |

