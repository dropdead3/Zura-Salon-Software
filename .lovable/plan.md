

# Zura Pay Configurator — Platform vs Organization Audit

## Findings

### Issue 1: "Apps on Devices" and "Integration Paths" are platform-internal (REMOVE)
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

The "Integration Paths" section (lines 108-135) and the "Apps on Devices deployment info" callout (lines 139-147) expose platform engineering details to organization users:
- "Server-Driven Display" vs "Apps on Devices (Full Custom)" — orgs don't choose integration paths; Zura controls the reader experience
- "Android APK via Stripe app review" — leaks Stripe's name and internal deployment process
- "Phase 2" badge — orgs shouldn't see internal roadmap phases
- Links to Stripe docs — orgs shouldn't be directed to Stripe documentation
- "Apps require Stripe review before deployment" — internal process detail

**Decision needed from you:** Can organizations customize their own terminal branding (splash screens, colors, logo), or does Zura control the display for all terminals uniformly? Based on the memory context ("Server-Driven Integration strategy" and "Zura Pay branded on-screen experience"), it appears Zura controls the display — orgs get the Zura-branded checkout experience, not custom branding.

**Fix:** Remove the entire "Integration Paths" section and "Apps on Devices" callout. Replace with a simpler "Your Checkout Experience" description that explains what the org's customers will see (branded checkout with their business name, cart items, tap-to-pay). Keep the S710 simulator and device specs (orgs need to know what they're buying).

### Issue 2: S710 Device Specifications may be too technical
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` (lines 36-42)

Specs like "Snapdragon 665 · 4GB", "Android 10 (AOSP)", "1080×1920 · 420dpi" are engineering details. Orgs care about: screen size, connectivity, and payment methods.

**Fix:** Simplify specs to org-relevant details: Display size, Connectivity (WiFi + Cellular), Payment methods (Tap, Chip, Swipe), and Offline capability.

### Issue 3: Stripe brand leakage in Hardware tab
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` (line 183)

`'stripe_api' ? 'Live pricing' : 'Published rate'` — The `stripe_api` source string is internal but only used as a conditional; the user-facing text says "Live pricing" which is fine. However, the tooltip (line 149) says "Pricing comes directly from the payment processor" — this is acceptable (doesn't name Stripe).

**Status:** Acceptable — no visible Stripe branding.

### Issue 4: Stripe docs links in INTEGRATION_PATHS data
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` (lines 21, 32)

Direct links to `docs.stripe.com` are present in the data. These aren't currently rendered as clickable links, but they exist in the code and could leak. Removing the Integration Paths section (Issue 1) resolves this.

### Issue 5: Internal type name `LocationWithStripe`
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` (line 28)

Minor code hygiene — the type is named `LocationWithStripe`. Not user-facing, but should be renamed for brand consistency (e.g., `LocationWithPayment`).

---

## Changes

### 1. Strip platform-internal content from Display tab
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

- Remove `INTEGRATION_PATHS` array entirely
- Remove "Integration Paths" section (lines 108-135)
- Remove "Apps on Devices deployment info" callout (lines 139-147)
- Remove unused imports (`Code2`, `Layers`, `Server`, `ArrowRight`)
- Simplify `S710_SPECS` to org-relevant specs only (display size, connectivity, payments, offline)
- Keep the S710 simulator and auto-play controls — these show the org what their customers will see

### 2. Rename internal Stripe types
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

- Rename `LocationWithStripe` → `LocationWithPayment`
- Update all references

### 3. Clean up Stripe references in CheckoutDisplayConcept tooltip
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

- Update `MetricInfoTooltip` description to remove "server-driven integration" and "Phase 2" language
- New: "Preview the branded Zura Pay checkout experience that appears on your S710 readers during transactions."

## Files Modified
| File | Action |
|------|--------|
| `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` | Remove Integration Paths, Apps on Devices, simplify specs, clean tooltip |
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Rename `LocationWithStripe` → `LocationWithPayment` |

## What stays
- S710 simulator (org-facing — shows what customers see)
- Device specs (simplified to what matters for purchasing decisions)
- Fleet tab connection status badges
- Hardware purchasing flow
- Connectivity/NeverDown section
- All operational functionality

0 migrations, 0 edge function changes, 0 new dependencies.

