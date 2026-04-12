

# Zura Capital Knowledge Base — Platform Admin Reference Page

## What We're Building

A dedicated "About Zura Capital" reference page linked from the Control Tower header. This page explains the entire Capital feature to platform admins so they can confidently explain it to organizations. It covers what Capital is, how it works end-to-end, what organizations see when it's enabled, eligibility logic, opportunity types, the funding lifecycle, and FAQ.

## Changes

### 1. Create the Knowledge Base page
**New file:** `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx`

A static content page using platform UI components (`PlatformPageContainer`, `PlatformCard`, etc.) with these sections:

- **Header**: "Zura Capital — Feature Guide" with back link to Control Tower
- **Overview**: What Capital is (a growth execution layer, not a loan product), who it's for, the core philosophy (Decision → Action → Outcome)
- **How It Works**: Step-by-step lifecycle — Opportunity Detection → Eligibility Scoring → Surfacing → Admin Review → Funding Initiation → Project Tracking → Completion
- **What Organizations See**: When Capital is toggled on, a "Zura Capital" link appears in Growth Hub. Admins see a queue of ranked opportunities with ROE scores, risk levels, and recommended actions. They can review details, initiate funding, and track active projects.
- **Eligibility Criteria**: ROE ≥ 1.8, Confidence ≥ 70, Risk ≤ Medium, Operational Stability ≥ 60. Explains what each metric means in plain language.
- **Opportunity Types**: Capacity Expansion, Inventory Expansion, Service Growth, Location Expansion, New Location Launch, Stylist Growth, Campaign Acceleration, Equipment Expansion, Marketing Acceleration — with brief descriptions
- **Funding Lifecycle**: Visual state flow from Draft → Detected → Eligible → Surfaced → Initiated → Funded → Completed (with decline/expire branches)
- **Access & Permissions**: Only Super Admins and Account Owners within an organization can see Capital. Platform admins control access via the Control Tower toggle.
- **FAQ section** (collapsible via Accordion):
  - "Is this a loan?" — No, it's growth capital tied to validated opportunities with automated tracking
  - "What happens when I toggle Capital on for an org?" — The system begins evaluating opportunities; if any qualify, they surface in the org's Growth Hub
  - "Can organizations toggle it themselves?" — No, only platform admins control access
  - "What if an org has no qualifying opportunities?" — Capital section remains empty; no false signals
  - "How is risk assessed?" — Deterministic scoring using revenue volatility, stylist dependency, competition, and market saturation
  - "What does 'underperforming' mean?" — A funded project tracking below forecast thresholds; triggers alerts
  - "Can managers initiate funding?" — Configurable per org in Capital Settings

### 2. Add route
**File:** `src/App.tsx`
- Add: `<Route path="capital/guide" element={<CapitalKnowledgeBase />} />` inside the platform route group, gated to `platform_admin`

### 3. Add link from Control Tower
**File:** `src/pages/dashboard/platform/CapitalControlTower.tsx`
- Add a "Feature Guide" link button in the page header area (next to title/description) using `PlatformButton` with `BookOpen` icon, linking to `/platform/capital/guide`

## File Summary

| File | Change |
|---|---|
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | New — full reference page |
| `src/App.tsx` | Add `/platform/capital/guide` route |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Add "Feature Guide" link button in header |

