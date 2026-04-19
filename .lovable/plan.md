
## Wave 28.8 — Client Policy Center surface

Expose approved client-facing policy variants on a public org-scoped page at `/org/:orgSlug/policies`, closing the loop from Policy OS → public surface.

### Build sequence

| Step | Scope | Files |
|---|---|---|
| **1. Hook** | `usePublicOrgPolicies(orgSlug)` — fetches adopted policies with approved `client` variant for the org. Public read (no auth required) via existing org-slug resolution pattern. | `src/hooks/policy/usePublicOrgPolicies.ts` |
| **2. Page** | `ClientPolicyCenter.tsx` at `/org/:orgSlug/policies` — uses `PublicOrgProvider`, renders policy variants grouped by category (Booking, Service, Conduct, etc.). Empty state if no approved client variants. | `src/pages/public/ClientPolicyCenter.tsx` |
| **3. Components** | `PolicyCenterCard.tsx` (one per policy: title, last updated, expandable markdown body) + `PolicyCategoryGroup.tsx` (groups cards by category with Termina header). | New components in `src/components/public/policy-center/` |
| **4. Route** | Add `/org/:orgSlug/policies` route in `App.tsx` under public org routes (alongside services/booking). | `App.tsx` |
| **5. SEO** | `<title>`: "{Org Name} — Policies", meta description, JSON-LD `Organization` schema, single H1, canonical tag. | Within `ClientPolicyCenter.tsx` |
| **6. Linking** | Update `PolicySurfaceMappingsEditor` (if exists) hint text to mention the new public URL. Add a "View public policy page" link in `PolicyConfiguratorPanel` when client variant is approved. | Edited |

### Doctrine checks
- ✅ Tenant isolation: org-scoped via slug → organization_id resolution
- ✅ Visibility contract: page silent (empty state) until at least one client variant approved
- ✅ Single source of truth: renders `policy_variants.body_md` directly — no copy
- ✅ Public surface: no auth required, RLS policy allows anonymous read of approved client variants
- ✅ UI tokens, Termina headers, font-medium max, no hype copy
- ✅ SEO: semantic HTML, canonical, JSON-LD

### Out of scope
- Multi-language variants (Phase 4)
- Policy version history on public page (only latest approved)
- Acceptance/signature capture (separate wave — Client Acknowledgments)

After 28.8: **Wave 28.9 — Conflict Center & Version History UI**.
