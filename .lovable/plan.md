

## Enhance DockClientTab with 4 Intelligence Sections

### Overview

Add allergy/sensitivity flags, favorite products, photo timeline, and no-show rate to the existing `DockClientTab`. Since there's no dedicated allergy column on client tables, we'll parse the `notes` field for allergy/sensitivity keywords and add a new `medical_alerts` text column to `clients` and `phorest_clients` for structured storage.

### Changes

#### 1. Database Migration — Add `medical_alerts` Column

Add a nullable `medical_alerts` text column to both `phorest_clients` and `clients` tables. This gives a dedicated field for allergy/sensitivity data rather than relying on free-text notes parsing.

```sql
ALTER TABLE phorest_clients ADD COLUMN medical_alerts text;
ALTER TABLE clients ADD COLUMN medical_alerts text;
```

#### 2. Modify `DockClientTab.tsx`

Add 4 new sections between the Identity Card and Last Formula sections:

**a. Allergy/Sensitivity Flags (top priority — warning banner)**
- Check `client.medical_alerts` field first; fallback: scan `client.notes` for keywords (`allergy`, `allergic`, `sensitive`, `sensitivity`, `reaction`, `irritation`)
- Render as a prominent amber/rose-tinted banner with `AlertTriangle` icon at the very top of the tab (before identity card) so it's impossible to miss
- Styled: `bg-rose-500/10 border-rose-500/30 text-rose-400`

**b. Favorite Products (after processing time)**
- Use existing `useClientProductAffinity(phorestClientId)` hook
- Render top 5 products as compact pill badges with purchase count
- Section header: "Frequently Purchased" with `ShoppingBag` icon
- Each pill: `bg-[hsl(var(--platform-bg-card))]` with purchase count badge

**c. Photo Timeline (after favorite products)**
- Query `client_transformation_photos` directly (lightweight query — just last 4 entries with `before_url`, `after_url`, `service_name`, `taken_at`)
- Render as a horizontal scrollable row of thumbnail pairs (before/after)
- Section header: "Transformations" with `Camera` icon
- Each thumbnail: `w-16 h-16 rounded-lg object-cover`
- If no photos: section hidden entirely

**d. No-Show Rate (badge in Identity Card badges row)**
- Computed from existing `visits` data already fetched: count visits with `status === 'cancelled'` or `status === 'no_show'` divided by total visits
- Only show if rate > 10% (to avoid noise)
- Render as a rose-tinted pill badge: "15% No-Show" with `AlertCircle` icon
- Placed in the badges row alongside visit count and CLV tier

#### 3. Data Sources

| Feature | Source | New Query? |
|---------|--------|-----------|
| Allergy flags | `client.medical_alerts` + `client.notes` keyword scan | No — already fetched |
| Favorite products | `useClientProductAffinity` hook | Yes — new hook call |
| Photo timeline | `client_transformation_photos` table | Yes — lightweight query (last 4) |
| No-show rate | Computed from `visits` array | No — already fetched |

### Files

| Action | File |
|--------|------|
| Migration | Add `medical_alerts` column to `phorest_clients` and `clients` |
| Modify | `src/components/dock/appointment/DockClientTab.tsx` — add all 4 sections |

