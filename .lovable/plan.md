

# Consolidate Growth + Infrastructure into a Single Card

Growth and Infrastructure have identical pricing ($200/loc/mo, 10 users/loc) — the only difference is location count range and feature depth. Showing them as two separate cards at the same price reads as duplicate.

## Approach

Merge them into one **"Multi-Location"** card that covers 2+ locations, then use a small inline note to explain that 5+ locations unlocks deeper features. This gives a clean 3-card layout: **Operator → Multi-Location → Enterprise**.

### Layout
```text
┌──────────────┐  ┌────────────────────┐  ┌──────────────┐
│   OPERATOR   │  │  MULTI-LOCATION    │  │  ENTERPRISE  │
│              │  │  Most Popular       │  │              │
│   $99/mo     │  │  $200/loc/mo       │  │   Custom     │
│   1 location │  │  2+ locations       │  │   Unlimited  │
│   1 user     │  │  10 users/loc      │  │   Custom     │
│              │  │                     │  │              │
│  • features  │  │  • features        │  │  • features  │
│              │  │  ─────────────     │  │              │
│              │  │  5+ locs unlocks:  │  │              │
│              │  │  • deeper features │  │              │
└──────────────┘  └────────────────────┘  └──────────────┘
```

### Changes — `BillingGuide.tsx` only

1. **Replace the 4-card grid** (`lg:grid-cols-4`) with a 3-card grid (`lg:grid-cols-3`)
2. **Delete the Infrastructure card** (lines 189-213)
3. **Rename Growth card** to "Multi-Location" with "Most Popular" badge kept
4. **Update location line** from "2–5 locations" to "2+ locations"
5. **Merge feature lists**: Show shared features first, then a subtle divider with "5+ locations unlocks:" followed by Infrastructure-specific features (regional brand management, advanced margin analytics)
6. **Give the center card slightly more visual weight** — wider implicit from 3-col grid already helps; keep the ring accent

No database, hook, or other file changes needed. The underlying tiers (`growth` / `infrastructure`) still exist in the DB for feature-gating — this is purely a presentation simplification for the billing guide.

