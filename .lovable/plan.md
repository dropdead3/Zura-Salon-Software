

# Bug Cleanup Pass — Remaining Issues

## Issues Found

### 1. Platform landing page showing org logo (DD75) — Data issue
The `PlatformLogo` resolver is working correctly, but the `platform_branding` database row has `primary_logo_url` set to an organization's logo (DD75). The code correctly reads `login_logo_url → primary_logo_url → DEFAULT`, but since `primary_logo_url` points to DD75, the landing page shows the wrong brand.

**Fix**: Update the `platform_branding` row to clear `primary_logo_url` (or set it to the correct Zura asset). This is a data correction, not a code bug.

### 2. `Program.tsx` — Unused raw brand import
`BrandWordmark` is imported from `@/assets/brand-wordmark.svg` but never used in the JSX. Dead import that should be removed.

**Fix**: Remove the unused import line.

### 3. `FounderWelcome.tsx` — Hardcoded tenant content (tenant brand guard violation)
This component has:
- Hardcoded founder headshot (`founder-headshot.jpg`) and signature (`founder-signature.png`) from `src/assets/`
- Alt text "Kristi Day, Founder" — tenant-specific name
- Alt text "Kristi Day signature" — tenant-specific name
- Copy like "Welcome to Our Salon" — generic but still static

This is a public org-scoped component that should resolve founder content from the database (site_settings or a founder section config), not bundled assets.

**Fix**: Migrate to use `useSectionConfig('founder_welcome')` or similar hook. For now, at minimum remove the hardcoded tenant name from alt text and make the component check for configured content.

### 4. `Header.tsx` — Hardcoded fallback nav items with tenant-specific labels
`FALLBACK_NAV_ITEMS` includes "Hair Extensions", "Join The Team", "Salon Policies" — these are tenant-specific menu labels, not generic platform defaults. Same in `useWebsiteMenus.ts` seed defaults.

**Fix**: Make fallback items more generic ("Services", "About", "Team", "Gallery", "Contact") or suppress nav entirely when no published menu exists.

### 5. `stylists.ts` — Hardcoded tenant data file
Contains real tenant stylists with names, Instagram handles, and bundled headshots. This is seed/demo data that violates tenant isolation. Used by 9+ components.

**Fix**: This is a larger refactor (out of scope for this pass). Flag as tech debt — all stylist data should come from the database. The static file should only provide type definitions and utility functions.

---

## Recommended Scope for This Pass

Focus on items 1–4 (quick, impactful fixes). Item 5 is flagged as tech debt for a future dedicated refactor.

### Step 1: Fix platform branding data
- Clear or correct `primary_logo_url` in the `platform_branding` site_settings row so the landing page shows the Zura wordmark instead of DD75

### Step 2: Clean up Program.tsx
- Remove unused `BrandWordmark` import

### Step 3: Neutralize FounderWelcome.tsx
- Remove hardcoded tenant name ("Kristi Day") from alt text
- Replace with dynamic content from section config or generic placeholder
- Keep the component functional but tenant-neutral

### Step 4: Genericize Header.tsx fallback nav
- Change fallback labels to generic terms ("Services", "About", "Team", "Gallery", "Contact")
- Same for `useWebsiteMenus.ts` seed defaults

---

## Technical Details

- **Database change**: One UPDATE to `site_settings` to fix the platform logo URL
- **Code changes**: 4 files, all rendering-only — no provider restructuring
- **Risk**: Very low — all changes are cosmetic/cleanup with no architectural impact

