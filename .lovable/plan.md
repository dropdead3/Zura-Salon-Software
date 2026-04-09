

# Zura Command Surface — Entity Search Layer + Remaining Gaps

## Status Summary

The command surface architecture is already very strong after 4 prior build rounds:
- Navigation search with 50+ verified destinations and grounded AI
- Action registry with 13 actions and inline execution
- Task and team member search candidates
- Keyboard-first flow, typeahead, preview panel, chain queries
- Today shortcuts, proactive intelligence, learning system
- Permission-aware filtering and role-based ranking

The **single largest remaining gap** is entity-level search — clients, inventory/products, and appointments are not indexed as search candidates. The database tables exist (`clients`, `phorest_clients`, `products`, `appointments`, `phorest_appointments`) and hooks exist to query them, but none feed into the search candidate pool.

## Changes

### 1. Add Client Search Candidates (`src/hooks/useSearchRanking.ts`)

Create a lightweight client search hook that queries the `clients` table (limited to 200 most recent active clients) when the command surface is open:
- Search fields: `first_name`, `last_name`, `email`, `phone`
- Result type: `client`
- Path: `/dashboard/clients?search={name}`
- Icon: `UserCircle`
- Subtitle: phone or email, VIP badge if applicable
- Lazy-loaded via `enabled` parameter

### 2. Add Inventory/Product Search Candidates (`src/hooks/useSearchRanking.ts`)

Create a lightweight product search hook querying the `products` table (active products, limit 200):
- Search fields: `name`, `sku`, `brand`, `category`
- Result type: `inventory`
- Path: `/dashboard/admin/inventory?search={name}`
- Icon: `Package`
- Subtitle: brand, SKU, or quantity on hand
- Lazy-loaded

### 3. Add Appointment Search Candidates (`src/hooks/useSearchRanking.ts`)

Query today's appointments from `phorest_appointments` (limit 50, today only):
- Search fields: client name, service name, staff name
- Result type: `appointment`
- Path: `/dashboard/schedule`
- Icon: `Calendar`
- Subtitle: time + service + stylist
- Lazy-loaded

### 4. Create Entity Data Hooks (`src/hooks/useCommandEntitySearch.ts`)

New file with three lightweight hooks:
- `useClientSearchCandidates(enabled)` — fetches from `clients` table
- `useProductSearchCandidates(enabled)` — fetches from `products` table
- `useAppointmentSearchCandidates(enabled)` — fetches today's from `phorest_appointments`

Each returns data shaped as `SearchCandidate[]` ready for the ranking pool. All org-scoped via `useOrganizationContext`.

### 5. Wire Into `useSearchRanking.ts`

Import the three new hooks, pass `enabled: !!query` to avoid unnecessary fetches, and spread their results into the candidate pool alongside existing nav/team/task/action candidates.

### 6. Update Group Ordering (`commandTypes.ts` + `searchRanker.ts`)

Verify `GROUP_ORDER` priorities reflect:
1. Best Match
2. Actions
3. Navigation
4. People
5. Clients
6. Appointments
7. Inventory
8. Tasks
9. Help
10. Insights

### 7. Add Type Icons and Labels (`CommandResultRow.tsx`)

Add missing type icon mappings:
- `client` → `UserCircle` + "Client" label
- `inventory` → `Package` + "Product" label  
- `appointment` → `Calendar` + "Appointment" label

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCommandEntitySearch.ts` | New file — 3 lightweight entity hooks |
| `src/hooks/useSearchRanking.ts` | Import + wire entity candidates into pool |
| `src/components/command-surface/CommandResultRow.tsx` | Add client/inventory/appointment type icons + labels |
| `src/components/command-surface/commandTypes.ts` | Verify GROUP_ORDER has all entity types |
| `src/lib/searchRanker.ts` | Verify type priority includes new entity types |

## What This Enables

- Typing "Sarah" matches team members AND clients
- Typing "8N" or a product name shows inventory with stock level
- Typing "today" shows today's appointments as entity results
- Scope filter chips for Clients, Inventory now return real results
- The command surface becomes a true cross-module search layer

## Technical Notes

- All entity hooks are org-scoped via `useOrganizationContext`
- Queries use `enabled` flag to avoid firing when surface is closed
- Client search supports fuzzy matching on name, phone, and email via existing `scoreMatch`
- Product search matches on name, SKU, and brand
- No database changes needed — all tables already exist with RLS

