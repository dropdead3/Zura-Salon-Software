

# Branding Isolation Cleanup — Bug Fix & Hardening Pass

## Problems Found

There are **8 files** still importing raw brand SVGs directly from `src/assets/`, bypassing the centralized `PlatformLogo` and `OrganizationLogo` resolvers. This creates two categories of bleed-over risk:

### Category A: Org surfaces using platform assets (identity bleed)
These are organization-scoped pages that hardcode platform brand assets instead of resolving from org `businessSettings`:

| File | Surface | What it shows | What it should show |
|------|---------|---------------|---------------------|
| `Header.tsx` | Org public website nav | Hardcoded `brand-logo-primary.svg` | Org logo from `businessSettings.logo_light_url` |
| `Footer.tsx` | Org public website footer | Hardcoded `brand-logo-secondary.svg` | Org logo from `businessSettings.logo_light_url` |
| `StaffLogin.tsx` | Org staff login page | Hardcoded `brand-logo-secondary.svg` | Org logo from `businessSettings` |
| `DashboardLockScreen.tsx` | Org dashboard lock | Has its own `getLogo()` fallback chain with raw imports | Should use `OrganizationLogo` component |
| `InvitationsTab.tsx` | Org invitation QR card | Hardcoded `brand-logo-secondary.svg` | Org logo |
| `QRCodeFullScreen.tsx` | Org QR fullscreen | Hardcoded `brand-logo-secondary-white.svg` | Org logo (dark variant) |
| `AccountManagement.tsx` | Org account management QR card | Hardcoded `brand-logo-secondary.svg` | Org logo |

### Category B: Acceptable raw imports (no change needed)
| File | Reason |
|------|--------|
| `platform-assets.ts` | This IS the canonical asset registry — raw imports are correct here |
| `ColoredLogo.tsx` | Utility component that accepts `logoUrl` prop; fallback to platform wordmark is intentional |
| `EmailTemplateEditor.tsx` | Provides brand asset presets for email template design — utility, not a rendering surface |
| `Program.tsx` | Uses `ColoredLogo` which already handles fallback correctly |

## Implementation Plan

### Step 1: Migrate org public website surfaces (Header.tsx, Footer.tsx)
- Remove raw `brand-logo-primary.svg` and `brand-logo-secondary.svg` imports
- Add `useBusinessSettings()` hook to resolve org logo
- Use `OrganizationLogo` component or direct `businessSettings.logo_light_url` with platform asset fallback
- Header has two logo states (full logo when at top, icon when scrolled) — both need org-aware resolution

### Step 2: Migrate StaffLogin.tsx
- Remove raw `brand-logo-secondary.svg` import
- This page is org-scoped (staff invitation context) — resolve logo from invitation org data or `useBusinessSettings()`
- Fallback: `OrganizationLogo` with platform default

### Step 3: Migrate DashboardLockScreen.tsx
- Remove raw `brand-logo-secondary.svg` and `brand-logo-secondary-white.svg` imports
- Remove the manual `getLogo()` function (duplicates fallback logic)
- Replace with `<OrganizationLogo>` component which already handles dark/light theme + fallback

### Step 4: Migrate QR code surfaces (InvitationsTab.tsx, QRCodeFullScreen.tsx, AccountManagement.tsx)
- Remove raw brand imports
- These render org-branded QR cards — should show org logo from `businessSettings`
- Use `OrganizationLogo` or resolve from `useBusinessSettings()` with platform fallback

### Step 5: Add `'website'` and `'website-icon'` variants to OrganizationLogo
- The Header needs two variants: full logo (default view) and compact icon (scrolled view)
- Extend `OrganizationLogo` to support these via `businessSettings.logo_light_url` and `businessSettings.icon_light_url`
- This keeps the public website in light-mode brand resolution (org sites are light-themed)

## Technical Details

- **No database changes** required
- **No new hooks** — `useBusinessSettings()` already exists and is cached for 10 minutes
- Header/Footer are inside org public routes which have access to org context via `useOrgPath`
- `OrganizationLogo` already handles `onError` fallback to platform defaults
- The `alt` text on all org surfaces should resolve to `businessSettings.business_name` instead of hardcoded "Salon"

## Risk Assessment
- **Low risk**: These are rendering-only changes, no provider restructuring
- All changes fall back to platform defaults if org branding is missing
- `OrganizationLogo` already has `onError` → bundled fallback, so broken URLs cannot blank any surface

