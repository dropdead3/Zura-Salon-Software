

# Stripe Terminal Configurator — Zura Pay Organization Settings

## Problem
There is no Terminal management infrastructure in the platform. When shipping Stripe terminals to organizations on Zura Pay, there's no way to register readers, create terminal locations, or generate connection tokens. Additionally, there's no org-facing UI for managing their terminals.

## Important Constraint
Terminals can ONLY be configured for organizations connected to **Zura Pay** (have an active `stripe_account_id`). Organizations using Phorest Pay or other third-party payment processors cannot use Zura-managed terminals — their terminals must be managed through their POS provider's Stripe platform.

## Architecture

```text
Organization Settings → Payments Tab
├── Zura Pay Status (existing)
├── Terminal Locations (NEW)
│   ├── Register a location (maps to Stripe Terminal Location)
│   └── List locations with reader counts
└── Terminal Readers (NEW)
    ├── Register a reader (serial/pairing code)
    ├── List readers with status (online/offline)
    └── Assign reader to location
```

## Required Infrastructure

### 1. Edge Function: `manage-stripe-terminals`
Handles CRUD for Terminal Locations and Readers via Stripe API, scoped to the org's connected account:
- `POST /v1/terminal/locations` — Create location (label, address)
- `GET /v1/terminal/locations` — List locations
- `POST /v1/terminal/readers` — Register reader (registration_code, location)
- `GET /v1/terminal/readers` — List readers
- `DELETE /v1/terminal/readers/:id` — Deregister reader
- All calls use `Stripe-Account: {org_stripe_account_id}` header

### 2. Edge Function: `create-terminal-connection-token`
Generates connection tokens for terminals to authenticate (required by Stripe Terminal SDK):
- `POST /v1/terminal/connection_tokens` with `Stripe-Account` header

### 3. Organization Settings UI — Payments Section
Add a "Terminals" subsection to org payment settings:
- **Terminal Locations**: Create/list physical locations mapped to Stripe Terminal Locations
- **Terminal Readers**: Register readers via pairing code, view status, assign to locations
- **Gated**: Only visible when org has active Zura Pay connection

### 4. Platform Admin — Terminal Overview
Add terminal counts to the Account Detail view so platform admins can see how many terminals an org has registered.

## Scope
- 2 edge functions
- 1 new settings section (org-facing)
- 1 platform admin enhancement
- Database: No new tables needed (all state lives in Stripe API, queried on-demand)

## Does this solve Capital for Phorest Pay orgs?
**No.** This infrastructure only works for Zura Pay connected accounts. For orgs like Drop Dead Salons processing through Phorest Pay, the path to Capital eligibility requires either:
1. Migrating their payment processing to Zura Pay, OR
2. A future partnership integration with Phorest to share processing data

The Terminal configurator is valuable infrastructure for Zura Pay orgs regardless of the Capital question.

