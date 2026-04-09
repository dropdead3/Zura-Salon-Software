

# Fix AI Answer: Auth + Tenant Isolation + UI Upgrade

## Problems Found

### 1. Auth Failure (causes "Invalid or expired token")
`useAIAssistant.ts` sends the **anon key** (`VITE_SUPABASE_PUBLISHABLE_KEY`) as the Authorization header. The `ai-assistant` edge function calls `requireAuth()` which expects the **user's session JWT**. It also never sends `organizationId`, so `requireOrgMember` fails.

### 2. Cross-Pollination Risk: Search History
`useRecentSearches.ts` uses a global localStorage key `zura-recent-searches` — no org scoping. If a platform admin switches between orgs via God Mode, search history from Org A leaks into Org B.

### 3. Cross-Pollination Risk: Search Learning
`searchLearning.ts` uses global keys `zura-search-events` and `zura-nav-frequency-v2` — same problem. Navigation frequency boosts and selection logs from one org bleed into another.

### 4. AI Answer Card UI
Plain box, generic "AI Answer" label, raw error text, basic skeleton. Does not match Zura brand standards.

## Changes

### File 1: `src/hooks/useAIAssistant.ts`
- Import `supabase` client
- Before fetch, call `supabase.auth.getSession()` to get user's real JWT
- Accept `organizationId` parameter in `sendMessage`
- Include `organizationId` in request body
- Surface friendly error messages for 401/429/402

### File 2: `src/components/command-surface/ZuraCommandSurface.tsx`
- Pass `effectiveOrganization?.id` to all three `sendMessage` call sites (auto-trigger at line 246, and any Enter/manual triggers)

### File 3: `src/components/command-surface/useRecentSearches.ts`
- Accept `orgId` parameter (optional, for backwards compat)
- Scope localStorage key: `zura-recent-searches:${orgId}` when orgId is provided
- Falls back to global key when no org context (login screen, etc.)

### File 4: `src/lib/searchLearning.ts`
- Accept optional `orgId` in storage key functions
- Scope all three localStorage keys with org suffix: `zura-search-events:${orgId}`, `zura-nav-frequency-v2:${orgId}`, `zura-search-gc-last:${orgId}`

### File 5: `src/hooks/useSearchLearning.ts`
- Thread `orgId` through to the `searchLearning.ts` functions

### File 6: `src/components/command-surface/CommandAIAnswerCard.tsx`
- Header: Sparkle icon + "Zura" label (not generic "AI Answer"), subtle pulse animation while streaming
- Loading: DotsLoader component with "Zura is thinking..." text instead of skeleton bars
- Error: Friendly muted message ("I couldn't answer that right now") instead of raw destructive red text
- Response: Cleaner prose styling, smooth opacity transition on content arrival
- Show more/less: Styled as subtle pill button
- Container: Softer border, slightly more breathing room, brand-aligned gradient tint

## Tenant Isolation Summary

| Surface | Current | After |
|---------|---------|-------|
| AI requests | No auth, no org ID | Session JWT + org ID, server-verified |
| Recent searches | Global localStorage | Org-scoped localStorage |
| Search learning events | Global localStorage | Org-scoped localStorage |
| Nav frequency | Global localStorage | Org-scoped localStorage |
| Edge function | Already has `requireOrgMember` | No change needed |

## Technical Notes
- The `ZuraCommandSurface` already imports `useOrganizationContext` and has `effectiveOrganization` available — just needs to pass `effectiveOrganization?.id` downstream
- `useRecentSearches` is called from `ZuraCommandSurface` which has org context — pass it in
- Search learning already receives `open` and `effectiveRoles` — adding `orgId` follows the same pattern
- No database changes required — all client-side fixes

