## Diagnosis

The "Available Analytics" cards in the screenshot are all already marked **`is_visible = true`** in `dashboard_element_visibility` for the leadership roles (`super_admin`, `admin`, `manager`) — but they are not in the operator's layout `pinnedCards` array. That mismatch creates a two-click bug:

1. `isCardPinned(cardId)` returns **true** (visibility row says yes).
2. So `handleTogglePinnedCard` interprets the click as an **unpin**: it writes `is_visible: false` and skips the layout `pinnedCards.push(...)` step.
3. The toast says "Unpinned from dashboard," and the row stays in "Available."
4. A second toggle is required to actually pin.

Network/console show no errors — the upsert succeeds. The bug is logical.

There is also a **second, structural problem** uncovered while debugging: `public.dashboard_element_visibility` has **no `organization_id`** column. The `(element_key, role)` unique constraint is global, so any leadership user toggling a card here mutates rows that leak across every tenant. This violates the Strict Tenant Isolation core rule. Until this is fixed, "pinning" isn't really per-org at all — it's a platform-wide preference masquerading as per-user.

These two problems must be solved together, because the right toggle semantics depend on the right storage model.

## Plan

Two waves. Both are P0; ship them in separate migrations + commits per doctrine ("P0s ship in separate waves, never bundled").

### Wave 1 — Fix the toggle UX bug (immediate, no schema change)

The visibility table is a **role-default** registry ("can this role ever see this card?"), not a per-operator pinned state. Conflating the two is the source of the bug. Decouple:

**`src/components/dashboard/DashboardCustomizeMenu.tsx`**

- Introduce `isCardPinnedInLayout(cardId)` helper that **only** checks `layout.pinnedCards` (and `sectionOrder` pinned entries). This is the operator's personal pinned state and the source of truth for the toggle.
- Keep the existing `isCardPinned` for visibility-gating only (e.g., to suppress cards an operator's role isn't allowed to see at all). Rename the existing function to `isCardVisibleToRole` to make the distinction obvious.
- `handleTogglePinnedCard`: compute `isPinned = isCardPinnedInLayout(cardId)` (NOT the role-visibility check). The toggle direction now correctly mirrors what the operator sees in their drawer.
- The visibility upsert step is preserved for now (still drives some role-gating elsewhere) but is **only** flipped to `true` on pin and **never** flipped to `false` on unpin from this surface — unpinning is a personal layout action, not a role-gating action.
- The "Available Analytics" `SortablePinnedCardItem` already passes `isPinned={isCardPinned(card.id)}` — switch this to `isPinned={isCardPinnedInLayout(card.id)}` so the optimistic switch reflects the layout state, not the global visibility row.
- `unpinnedCards` derivation switches to `isCardPinnedInLayout` so cards aren't filtered out of "Available" just because the global visibility row says true.

Result: one click to pin, one click to unpin, with no second-click weirdness. Cards in the screenshot become togglable on the first try.

### Wave 2 — Tenant-scope `dashboard_element_visibility` (separate commit)

Migration:

1. Add `organization_id uuid` to `dashboard_element_visibility` (nullable for backfill window).
2. Backfill: for each existing row, fan out per organization (one row per org per `element_key, role`). This is safe because today the rows are role defaults that should apply per-org.
3. Drop the global `(element_key, role)` unique constraint; add new `(organization_id, element_key, role)` unique constraint.
4. Set `organization_id NOT NULL` after backfill.
5. Add CASCADE FK to `organizations(id)`.
6. Replace RLS:
   - SELECT: `is_org_member(auth.uid(), organization_id)` (drop the `USING (true)` policy — strictly prohibited per core rules).
   - ALL (manage): `is_org_admin(auth.uid(), organization_id) OR is_platform_user(auth.uid())` and require manager check via `has_role(...)` AND `organization_id = (select current effective org for the user)`.

Code:

- `useDashboardVisibility` (and any sibling reader/upserter): scope all queries by `effectiveOrganization.id`; include it in the cache key.
- `handleTogglePinnedCard` upsert: include `organization_id` in `rows` and switch `onConflict` to `'organization_id,element_key,role'`.
- `handleBulkPinAll` upsert: same.

### Out of scope

- No change to which cards exist (`PINNABLE_CARDS` / `PINNABLE_CARD_IDS`).
- No change to Detailed/Simple cap, ConfigurationStubCard, dismissedStubs, or sectionOrder mechanics.
- No change to non-Analytics visibility surfaces in Wave 1 (Wave 2 covers them by widening the table's tenant scope).

## Why this shape

- **Single source of truth per concern:** `layout.pinnedCards` = operator's personal selection. `dashboard_element_visibility` = role-default eligibility (and after Wave 2, properly tenant-scoped). Today they're confusingly merged in one boolean check, which causes the two-click bug.
- **Wave 1 is reversible & contained** — pure logic change in one component. Fixes the visible bug today.
- **Wave 2 closes a real tenant-isolation hole** discovered during diagnosis. Must ship before the next operator onboarding to prevent cross-tenant leakage from compounding.
- **Doctrine-aligned:** Strict tenant isolation (Core); Signal Preservation (don't conflate "visible to role" with "pinned by operator"); Audit findings receive priority + doctrine anchor (P0 / Tenant Isolation).
