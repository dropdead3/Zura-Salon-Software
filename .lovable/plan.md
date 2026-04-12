

# Stripe Terminal Configurator — Organization Settings

## Overview

Build a complete Stripe Terminal management experience inside the organization dashboard Settings, allowing org admins to register terminal locations, pair readers, and manage their hardware fleet. Designed for multi-location organizations with multiple readers per site.

## Architecture

```text
Settings Grid → "Terminals" card (NEW)
└── SettingsCategoryDetail → "terminals" tab
    ├── Location Selector (top bar)
    │   └── Dropdown of org locations with Zura Pay status
    ├── Terminal Locations Panel
    │   ├── List Stripe Terminal Locations for selected location
    │   ├── Create Terminal Location (maps address from org location)
    │   └── Delete Terminal Location
    └── Terminal Readers Panel
        ├── List readers with status badges (online/offline)
        ├── Register Reader wizard (pairing code + location assignment)
        └── Deregister Reader (with confirmation)

Gate: Entire section hidden if org has zero locations with stripe_account_id
```

## Changes

### 1. Edge Function: `supabase/functions/manage-stripe-terminals/index.ts`
Single edge function handling all terminal CRUD via `action` parameter:
- `list_locations` — `GET /v1/terminal/locations` with `Stripe-Account` header
- `create_location` — `POST /v1/terminal/locations` (display_name, address from org location)
- `delete_location` — `DELETE /v1/terminal/locations/:id`
- `list_readers` — `GET /v1/terminal/readers` (optionally filtered by location)
- `register_reader` — `POST /v1/terminal/readers` (registration_code + location)
- `delete_reader` — `DELETE /v1/terminal/readers/:id`

Auth: Verifies caller is org member, looks up `stripe_account_id` from the location record, uses `Stripe-Account` header for all calls.

### 2. Hook: `src/hooks/useStripeTerminals.ts`
React Query hooks wrapping the edge function:
- `useTerminalLocations(locationId)` — list terminal locations for a given org location
- `useTerminalReaders(locationId, terminalLocationId?)` — list readers
- `useCreateTerminalLocation()` — mutation
- `useRegisterReader()` — mutation
- `useDeleteReader()` — mutation
- All queries keyed by org location ID for proper cache isolation

### 3. UI Component: `src/components/dashboard/settings/TerminalSettingsContent.tsx`
Main settings content component following existing patterns:
- **Location picker** at top — dropdown of org locations that have `stripe_account_id` (Zura Pay active)
- **Terminal Locations card** — list with create button, each showing reader count
- **Terminal Readers card** — list with status badges, register button
- **Register Reader dialog** — wizard-style: Step 1: Select/create terminal location → Step 2: Enter pairing code → Step 3: Confirmation
- **Empty state** when no Zura Pay locations exist — explains prerequisite with clear messaging
- Follows design tokens: `font-display` for headers, `tokens.card.*`, `tokens.empty.*`

### 4. Settings Grid Integration
- **`src/pages/dashboard/admin/Settings.tsx`**: Add `'terminals'` to `categoriesMap` with `CreditCard` icon (or `Smartphone` icon)
- **`src/components/dashboard/settings/SettingsCategoryDetail.tsx`**:
  - Add `'terminals'` to `SettingsCategory` union type
  - Add lazy import for `TerminalSettingsContent`
  - Render when `activeCategory === 'terminals'`

### Multi-Location UX Design
For orgs with many locations and multiple terminals:
- Location picker shows location name + reader count badge
- Each terminal location shows its readers inline (expandable rows)
- Bulk view: "All Locations" option shows summary table — location name, terminal location count, total readers, online/offline counts
- Reader status uses `tokens.status` color coding (green = online, muted = offline)

### Gating
- Settings card only visible when org has at least one location with `stripe_account_id`
- Individual location sections only show for Zura Pay-connected locations
- Non-connected locations show inline note: "Connect to Zura Pay to manage terminals"

## Files

| File | Action |
|---|---|
| `supabase/functions/manage-stripe-terminals/index.ts` | Create — Stripe Terminal CRUD edge function |
| `src/hooks/useStripeTerminals.ts` | Create — React Query hooks |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Create — Terminal management UI |
| `src/pages/dashboard/admin/Settings.tsx` | Add terminals to categories map |
| `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Add terminals category + lazy import |

5 files (3 new, 2 modified). No database changes needed — all state lives in Stripe API.

