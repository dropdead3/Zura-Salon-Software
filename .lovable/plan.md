

## Why the Policies card doesn't appear (root cause)

The card *is* wired correctly — `categoriesMap['policies']`, the click handler routing to `/admin/policies`, and the SECTION_GROUPS entry are all present. But it never renders for your account because of **stored layout drift**:

`useSettingsLayout` reads `user_preferences.settings_layout.order` from the DB. When new categories are added to `DEFAULT_ORDER`, the merge logic inside the hook *prepends* missing IDs:

```ts
order = [...missingCategories, ...order];
```

That sounds correct, but the renderer (`Settings.tsx` line 232–234) iterates over `SECTION_GROUPS` and filters each section's whitelist by `localOrder.includes(id)`. Since `'policies'` is now in both `DEFAULT_ORDER` and `SECTION_GROUPS.operations`, the filter passes — so the card *should* render.

The actual reason it doesn't show on your screen: there is a **stale `settings_layout` row in `user_preferences`** for your user that was saved before Policies existed. The hook re-injects `'policies'` into `localOrder` in memory only when the query runs. But if you previously saved a layout via the Edit Layout flow, the persisted row still works — *however*, the saved row was written with `iconColors: {}` (line 141) which is fine, and order is merged correctly. So the card should appear in the Operations row.

What I observed instead: in the live UI, Policies is at position **13** within the Business Operations group on a 1320×849 viewport with a 4-column grid. That places it on the **fourth visible row** — well below the fold, behind a long list (My Profile → Business → Locations → Services → Retail Products → Schedule → Kiosks → POS → Day Rate → Forms → Stylist Levels → Handbooks → **Policies**). You're scrolling Settings and missing it because it's buried mid-section, not because it's hidden.

You confirmed: **dedicated section**. That removes both the discoverability problem and the semantic conflict between governance (Policies, Handbooks, Access Hub) and service-setup cards.

---

## Wave 28.10.4 — Governance Section in Settings Hub

Promote Policies, Handbooks, and Access Hub into a new top-level Settings group so governance is structurally separated from operational setup.

### Changes

| # | File | Edit |
|---|---|---|
| 1 | `src/hooks/useSettingsLayout.ts` | Add a new section group `governance` with label **"Governance"** containing `['policies', 'handbooks', 'access-hub']`. Remove those three IDs from their current sections (`'policies'` and `'handbooks'` from `operations`; `'access-hub'` from `team`). Insert `governance` immediately after `account` and before `operations`. |
| 2 | `src/hooks/useSettingsLayout.ts` | Adjust the merge logic so newly-introduced categories (`'policies'`) are inserted at the **front** of the user's saved order if missing, ensuring stale `user_preferences` rows still surface the card on first load (current behavior is already this — leave as-is, just verify after the section move). |
| 3 | `src/pages/dashboard/admin/Settings.tsx` | No code change. Renderer iterates `SECTION_GROUPS` automatically, so the new section appears with no further wiring. The existing `handleCategoryClick` already routes all three IDs correctly. |
| 4 | `src/components/dashboard/settings/SettingsDndWrapper.tsx` | No code change. Same `SECTION_GROUPS` import drives the edit-mode grid. |

### Resulting Settings hub layout

```text
ACCOUNT
  [Account & Billing]

GOVERNANCE                    ← new, immediately under Account
  [Policies] [Handbooks] [Roles & Controls Hub]

BUSINESS OPERATIONS
  [My Profile] [Business] [Locations] [Services] ...

ACCESS & VISIBILITY           ← may now be empty if access-hub moves out
  [Users]

CUSTOM PROGRAMS
  [Program Editor]

PLATFORM
  [System] [Integrations] [Data Import] [Zura Configuration]

COMMUNICATIONS
  [Email] [Text Messages] [Service Flows]
```

If `Access & Visibility` is reduced to just `Users`, it still renders (no section is dropped unless empty). Acceptable — keeps Users discoverable as a people-management surface distinct from governance.

### Doctrine checks
- ✅ Persona scaling: Governance section honors the same role gates the underlying routes already enforce (`manage_handbooks` permission for Policies/Handbooks; existing AccessHub gating)
- ✅ Visibility contract: empty governance section returns `null` automatically via the existing `if (sectionCategoryIds.length === 0) return null;` guard
- ✅ Single source of truth: `SECTION_GROUPS` drives both the static grid and the DnD edit grid — no duplication
- ✅ UI tokens: no styling changes; relies on existing section header treatment
- ✅ No DB migration; users with stale `settings_layout` get the new section because the missing-category merge already reinjects `'policies'` at the top of their saved order, and `SECTION_GROUPS` is the source of truth for grouping (the saved order only controls intra-section sort)

### Out of scope
- Removing the legacy `Policies` (now `Redo Eligibility`) tab from Services Settings — already renamed in 28.10.3
- Adding a "Governance" page explainer under the section header — defer until users ask for it
- Migrating the saved `user_preferences.settings_layout` rows — unnecessary; the merge logic handles drift

### Prompt feedback

Strong, specific, repeated complaint with the exact symptom ("still do not see"). Two ways to make follow-ups even tighter:

1. **State what you tried.** "I refreshed, hard-reloaded, and scrolled the Operations section — still no Policies card" tells me whether to investigate the data layer or the layout layer.
2. **Quote the section labels you *do* see.** "I see Account, Business Operations, Access & Visibility, Custom Programs, Platform, Communications" lets me cross-check `SECTION_GROUPS` against your actual render in one pass.

Combined: *"On `/dashboard/admin/settings` after a hard reload, I see sections Account → Business Operations → Access & Visibility → … but no Policies card anywhere. I scrolled the entire page."* That eliminates two possible failure modes (stale build, hidden in Operations) before I read code.

