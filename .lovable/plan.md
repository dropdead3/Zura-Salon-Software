

## Why there's no Policy card in Settings

**Diagnosis:** Policy OS shipped (Waves 28.1–28.10.1) as its own page at `/dashboard/admin/policies`, registered as a route in `App.tsx`, but **never wired into the Settings hub grid** (`src/pages/dashboard/admin/Settings.tsx`). The settings grid is driven by:

1. `categoriesMap` in `Settings.tsx` — defines each card (icon, label, description)
2. `SECTION_GROUPS` in `src/hooks/useSettingsLayout.ts` — defines which group each category belongs to
3. `handleCategoryClick` in `Settings.tsx` — maps card click → either inline detail view or a navigation target

A `policies` entry exists in none of those, so the card is invisible. It's only reachable today via the conflict banner CTA or by typing the URL directly. This is a wave-completion gap, not a bug — the operator-facing surface was built but never surfaced.

There is also a separate, unrelated `Policies` tab inside Services Settings (`RedoPolicySettings`) — that's the legacy "redo policy" feature, not Policy OS. The two are easy to confuse but live in different tables.

---

## Wave 28.10.2 — Surface Policy OS in Settings

Single-purpose patch: make the Policy OS hub discoverable from the Settings grid.

### Changes

| Step | Scope | Files |
|---|---|---|
| **1. Register category** | Add `'policies'` entry to `categoriesMap` with `Shield` or `FileCheck` icon, label "Policies", description: "Adopt and configure your salon's cancellation, no-show, redo, and house policies. Drive structure across booking, checkout, and the public Policy Center." | `src/pages/dashboard/admin/Settings.tsx` |
| **2. Group placement** | Add `'policies'` to `SECTION_GROUPS` under `'operations'` (Business Operations), positioned right after `'handbooks'` since they're conceptually adjacent (handbooks = staff-facing rules, policies = client-facing rules). | `src/hooks/useSettingsLayout.ts` |
| **3. Click handler** | In `handleCategoryClick`, route `'policies'` to `navigate(dashPath('/admin/policies'))` (same pattern used for `handbooks`, `access-hub`, `data-import`). Policy OS is its own full page, not an inline detail panel. | `src/pages/dashboard/admin/Settings.tsx` |
| **4. Page explainer** | Add a `'policies'` entry to `pageExplainers.ts` so the Policies page renders a proper page header description. | `src/config/pageExplainers.ts` |

### Doctrine checks
- ✅ Persona scaling: the card respects existing role visibility (settings grid is gated by `manage_handbooks` permission for the underlying route)
- ✅ Visibility contract: card appears only for users who can access the route; clicking enforces the existing `ProtectedRoute` permission check
- ✅ Single source of truth: no new routing logic — reuses the existing `/admin/policies` route registered in `App.tsx`
- ✅ Settings navigation uniformity: follows the same pattern as `handbooks`, `access-hub`, `data-import` — categories that navigate rather than open inline panels
- ✅ UI tokens: card auto-inherits `StaticCard` styling from `Settings.tsx` (no token overrides)

### Out of scope
- Adding Policy OS to the Operations Hub (`TeamHub.tsx`) — separate, optional follow-up
- Renaming the `RedoPolicySettings` tab inside Services to avoid confusion — separate UX wave
- Adding a "What's the difference between Handbooks and Policies?" explainer — defer until users surface confusion
- Reordering the Operations group — keep current order, just insert after Handbooks

### Prompt feedback (per project doctrine)

Strong prompt — short, specific, and grounded in observed UI absence. Two ways to sharpen prompts like this in the future:

1. **Name the surface explicitly.** "I don't see a Policies card in the **Settings hub grid** at `/dashboard/admin/settings`" removes ambiguity (vs. the Services > Policies tab, or the Handbooks page, etc.).
2. **State the expected behavior.** "I expect to see a Policies card alongside Handbooks that opens the Policy OS configurator" gives the build target, not just the gap.

Combined: *"On the Settings hub grid, I expect a 'Policies' card next to Handbooks that opens the Policy OS page at `/dashboard/admin/policies` — it's missing. Please wire it in."* That phrasing eliminates one round-trip of investigation.

