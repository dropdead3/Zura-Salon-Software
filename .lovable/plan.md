

# Auto-Detect Economics Assumptions from Org Data

## Approach

Replace the raw input fields with a smart banner that computes suggested values from data already in Zura, then lets the owner accept or tweak. Zero questions asked — Zura figures it out.

## What Data Is Already Available

| Assumption | Data Source | Computation |
|---|---|---|
| **Overhead per stylist** | Org locations (rent if stored), stylist count from `employee_profiles` | If no rent data: use industry median ($3,500) scaled by location count. Show "We estimated this — update if you know your actual rent." |
| **Product cost %** | Color Bar chemical tracking (if enabled), or service mix from appointments | If Color Bar data exists: `total_chemical_cost / total_service_revenue` over 90 days. Otherwise: infer from service category mix (color-heavy → 12%, cut-focused → 6%). |
| **Target margin %** | Current actual margin computed from revenue vs costs | Show current implied margin and suggest +3pp improvement as target. If no data: default 15% with benchmark context. |
| **Hours per month** | Appointment data — average booked hours per stylist over 90 days | `total_appointment_hours / stylist_count / 3 months`. Fallback: 160 (5 days × 8 hrs × 4 weeks). |

## UX Design

### First Visit (no saved assumptions)

Instead of blank fields, show a **single "smart defaults" card**:

```text
┌─────────────────────────────────────────────────────┐
│ ✦  Zura computed these based on your data           │
│                                                      │
│  Overhead/Stylist    $3,800/mo   ← estimated         │
│  Product Cost        11.3%       ← from your data    │
│  Target Margin       15%         ← industry avg      │
│  Hours/Month         152 hrs     ← from your data    │
│                                                      │
│  Each value shows a source badge:                    │
│    "From your data" (green) or "Industry avg" (amber)│
│                                                      │
│  [Accept & Continue]    [Adjust First]               │
└─────────────────────────────────────────────────────┘
```

- **"Accept & Continue"** saves immediately, shows the margin table.
- **"Adjust First"** expands inline editors for each field (same inputs as today, but pre-filled with smart values).

### Returning Visit (assumptions already saved)

Current layout stays, but add:
- A subtle banner at top: *"Based on 90 days of data, your actual product cost is ~11.3%. Your saved assumption is 10%."* with an **[Update]** button.
- Industry benchmark ranges shown as muted text under each field (e.g., "Typical: $3,200–$5,500").

## New Hook: `useAutoDetectEconomics`

Computes suggested values by querying existing data:

1. **Stylist count**: from `employee_profiles` (already fetched elsewhere, reuse query key)
2. **Appointment hours**: sum of appointment durations over 90 days, divided by stylist count and 3
3. **Product cost from Color Bar**: check if `backroom_settings` has chemical cost tracking data; if yes, compute ratio
4. **Service mix**: categorize appointments by service type to infer product cost if no Color Bar data
5. Returns `{ suggestions: EconomicsAssumptions, sources: Record<keyof EconomicsAssumptions, 'data' | 'estimate'> }`

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useAutoDetectEconomics.ts` (new) | Hook that queries appointment/staff/Color Bar data and returns smart defaults with source labels |
| `src/components/dashboard/settings/EconomicsSmartDefaults.tsx` (new) | The "Zura computed these" card with accept/adjust flow |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | Show `EconomicsSmartDefaults` when no saved assumptions exist; add data-vs-saved comparison banner for returning users; add benchmark hints under fields |
| `src/hooks/useCommissionEconomics.ts` | Add `hasCustomAssumptions` boolean export (true when settings key exists with non-default values) |

## No database changes required

All data sources already exist. The hook reads from `appointments`, `employee_profiles`, and `backroom_settings` — all tables the user already has RLS access to.

