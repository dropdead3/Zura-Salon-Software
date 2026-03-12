

# Client Transformation Timeline — Implementation Plan

## Existing Infrastructure

- **`gallery_transformations` table** — before/after images for the public website gallery (not client-scoped)
- **`client_formula_history` table** — per-client formula records with appointment_id, service_name, formula_data, staff_name, notes
- **`ClientDetailSheet`** — client profile panel with tabs: Visit History, Transactions, Notes, Redos
- **`useClientVisitHistory`** — fetches appointment history per client
- **`useClientFormulaHistory`** — fetches formula history per client
- **`optimizeImage()` in `src/lib/image-utils.ts`** — client-side image optimization (WebP, resize)
- **No client photo storage exists** — no storage bucket or table for per-client per-appointment photos

## Architecture

```text
client_transformation_photos (new table)
  → organization_id, client_id, appointment_id
  → before_url, after_url
  → stylist_user_id, service_name
  → portfolio_approved, portfolio_category
  → notes, created_at

Storage bucket: "client-transformations" (public)

Consumed by:
  → ClientDetailSheet (new "Transformations" tab)
  → TransformationTimeline component (chronological photo+formula view)
  → CompareVisitsDialog (side-by-side comparison)
  → Portfolio gallery (filtered by portfolio_approved)
```

## Database

### New table: `client_transformation_photos`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| client_id | text | phorest_client_id reference |
| appointment_id | uuid FK → appointments, nullable | |
| before_url | text, nullable | Storage URL |
| after_url | text, nullable | Storage URL |
| service_name | text, nullable | Denormalized for display |
| stylist_user_id | uuid, nullable | Who uploaded |
| notes | text, nullable | |
| portfolio_approved | boolean, default false | |
| portfolio_category | text, nullable | e.g. "Blondes", "Balayage" |
| taken_at | date, nullable | Date of transformation |
| created_at | timestamptz | |

RLS: org-member read, authenticated write (own org).

### New storage bucket: `client-transformations`

Public bucket for optimized before/after photos.

### Migration

Single migration creating the table, RLS policies, and storage bucket.

## Implementation Layers

### 1. Hook: `src/hooks/useClientTransformations.ts`

- `useClientTransformations(clientId)` — fetch all transformations for a client, ordered by `taken_at` desc
- `useAddTransformation()` — upload before/after photos + create record
- `useUpdateTransformation()` — toggle portfolio_approved, edit notes/category
- `useDeleteTransformation()` — remove record + storage files
- `usePortfolioTransformations(stylistUserId?)` — fetch portfolio_approved entries
- Photo upload uses `optimizeImage()` before uploading to storage

### 2. Timeline component: `src/components/dashboard/clients/TransformationTimeline.tsx`

- Chronological list of transformation entries
- Each entry shows: date, service name, before/after thumbnails side by side, formula summary (from `client_formula_history` joined by appointment_id), notes
- Tap entry to expand full detail (full-size photos, complete formula, processing time)
- Empty state when no photos exist, with prompt to add first transformation
- "Add Transformation" button to upload photos for any visit

### 3. Compare mode: `src/components/dashboard/clients/CompareVisitsDialog.tsx`

- Select two transformation entries
- Side-by-side before/after photos
- Formula comparison below
- Accessible from timeline via "Compare" action

### 4. Portfolio tagging

- Toggle "Portfolio Approved" on any transformation entry
- Optional category assignment (Blondes, Balayage, Color Corrections, Extensions, Vivids, Custom)
- Portfolio view: `src/components/dashboard/stylist/StylistPortfolio.tsx` — grid of approved transformations filtered by category

### 5. Wire into ClientDetailSheet

- Add "Transformations" tab alongside Visit History, Transactions, Notes, Redos
- Tab renders `TransformationTimeline` component

### 6. Wire into AppointmentDetailSheet

- Add "Add Photos" button in appointment detail
- Quick upload flow: tap → select before/after → auto-creates transformation entry linked to appointment

## Build Order

1. Database migration (table + storage bucket + RLS)
2. `useClientTransformations.ts` (CRUD hooks with photo upload)
3. `TransformationTimeline.tsx` (timeline display + add flow)
4. `CompareVisitsDialog.tsx` (side-by-side comparison)
5. `StylistPortfolio.tsx` (portfolio gallery)
6. Wire into `ClientDetailSheet` (new tab)
7. Wire into `AppointmentDetailSheet` (add photos button)

## Edge Cases

| Case | Handling |
|---|---|
| No photos for client | Empty state with "Add first transformation" prompt |
| Only before or only after photo | Allow partial — show available photo with placeholder for missing |
| No formula linked to appointment | Show transformation without formula section |
| Portfolio category not set | Default to "Uncategorized" in portfolio view |
| Large photos | `optimizeImage()` resizes to 1200px max, WebP format before upload |
| Deleted appointment | Transformation persists independently (denormalized service_name) |

## Social Media Generator (Phase 2 scope)

Caption generation from transformation data using AI. Deferred to avoid scope creep — the timeline, comparison, and portfolio are the core value.

