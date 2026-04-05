

# Zura Default Configuration for Graduation Wizard

## What This Does

Adds a "Use Zura Defaults" button at the top of Step 0 (Requirements) in the Graduation Wizard. When clicked, it pre-fills the form with level-appropriate thresholds, weights, and evaluation settings — a no-brainer starting point that admins can accept as-is or tweak.

## Default Presets (by level index)

The graduation wizard receives `levelIndex` (0 = entry, 1 = second tier, etc.). Defaults scale progressively:

```text
Level 2 (e.g. Emerging):
  Revenue $6,000/mo · Retail 10% · Rebooking 60%
  Weights: 50/25/25 · 30-day window · No approval required

Level 3 (e.g. Lead):
  Revenue $8,000/mo · Retail 15% · Rebooking 65% · Avg Ticket $110
  Weights: 40/20/20/20 · 60-day window · No approval required

Level 4 (e.g. Senior):
  Revenue $12,000/mo · Retail 18% · Rebooking 70% · Avg Ticket $140 · Tenure 365d
  Weights: 35/20/25/20 · 60-day window · Approval required

Level 5+ (e.g. Signature/Icon):
  Revenue $16,000/mo · Retail 22% · Rebooking 75% · Avg Ticket $170 · Tenure 730d
  Weights: 30/20/25/25 · 90-day window · Approval required
```

These are industry-informed benchmarks for salon performance tiers, tuned to be achievable but meaningful.

## UX

- A subtle banner appears at the top of Step 0 when the form is empty (no existing criteria saved): **"Start with Zura's recommended criteria for this level"** with a **"Apply Defaults"** button.
- Clicking it fills all fields instantly — toggles, thresholds, weights, window, approval.
- If existing criteria are loaded, the banner is hidden (admin already configured).
- Admin can still modify any value after applying defaults.

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/GraduationWizard.tsx` | **Modify** — Add `ZURA_DEFAULTS` preset map and "Apply Defaults" banner in Step 0 |

**1 file modified.**

