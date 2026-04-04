

# Bug Cleanup Pass 3 — Remaining Tenant Data Leaks

## Issues Found

### 1. `SEO.tsx` — Hardcoded tenant business info (HIGH)
`BUSINESS_INFO` contains hardcoded tenant-specific data: real addresses (2036 N Gilbert Rd), phone numbers, email (`contact@salon.com`), area served lists, opening hours, and hardcoded SEO keywords referencing Mesa/Gilbert/Chandler. This is exported and used across the site.

**Fix**: Refactor `SEO.tsx` to resolve business info from `useBusinessSettings()` at runtime. The `BUSINESS_INFO` constant should become a generic fallback with placeholder values, and the component should accept or resolve org-specific data dynamically. Hardcoded geo-specific keywords should be removed or templated.

### 2. `Stylists.tsx` — Duplicate hardcoded tenant stylist data (HIGH)
This page has its own inline copy of real tenant stylists (Kristi D., Sarina L., etc.) with real Instagram handles — completely separate from `src/data/stylists.ts`. Double violation: tenant data AND code duplication.

**Fix**: Remove the inline stylist array. Import from `src/data/stylists.ts` (which is already flagged as tech debt for future DB migration), or better — make this page query stylists from the database. At minimum, consolidate to the single shared source.

### 3. `ColorBarPaywall.tsx` — Hardcoded tenant name in testimonial (LOW)
Line 523: `"Jamie Torres · Owner, Drop Dead Salon · Austin, TX"` — real tenant name in a fake testimonial.

**Fix**: Replace with a generic fictional business name (e.g., "Jamie T. · Salon Owner · Austin, TX").

### 4. `dockDemoData.ts` — Tenant name in code comment (LOW)
Line 344: `// ─── Mock Services (Drop Dead Salons catalog) ───`

**Fix**: Neutralize comment to `// ─── Mock Services (demo catalog) ───`

### 5. `SignaturePresetActions.tsx` / `SignaturePresetsManager.tsx` — Tenant name in placeholder (LOW)
Placeholder text: `"e.g., Kristi Day - CEO"`

**Fix**: Replace with generic placeholder: `"e.g., Jane Smith - Owner"`

### 6. `Extensions.tsx` — Entire page is hardcoded tenant content (TECH DEBT)
The entire Extensions page has hardcoded marketing copy, pricing tiers, and FAQs. Similar to `stylists.ts`, this should eventually resolve from the database. Out of scope for this pass — flag only.

---

## Recommended Scope

Focus on items 1–5 (quick, impactful). Item 6 is tech debt for a future pass.

### Step 1: Refactor SEO.tsx
- Make `BUSINESS_INFO` resolve from `useBusinessSettings()` + org locations
- Keep generic fallbacks for when no org data exists
- Remove hardcoded Mesa/Gilbert addresses, phones, and geo keywords
- SEO component becomes org-aware instead of tenant-hardcoded

### Step 2: Consolidate Stylists.tsx
- Remove inline duplicate stylist array
- Import from shared `src/data/stylists.ts` or make DB-aware
- Ensure the page uses the same data source as other stylist consumers

### Step 3: Neutralize tenant names in UI copy
- `ColorBarPaywall.tsx`: genericize testimonial attribution
- `dockDemoData.ts`: neutralize code comment
- `SignaturePresetActions.tsx` + `SignaturePresetsManager.tsx`: generic placeholder

---

## Technical Details

- **No database changes** required
- **SEO.tsx refactor** is the most significant change — needs careful handling since it generates structured data (JSON-LD) for search engines
- The SEO component currently uses a static constant; it needs to become a hook-aware component that resolves org data at render time
- All other changes are single-line copy fixes
- **Risk**: Low — all rendering-only changes with no architectural impact

