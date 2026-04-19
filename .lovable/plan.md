

## Wave 25 — Consolidate Handbooks + Handbook Wizard into one card

### The conflict (why this isn't just deleting one card)

Operations Hub currently shows two cards:

| Card | Route | What it is | Downstream |
|---|---|---|---|
| **Handbooks** (legacy) | `/admin/handbooks` | Simple CRUD: title, category, file upload, role visibility, active flag | Feeds `/dashboard/handbooks` (`MyHandbooks.tsx`) where staff acknowledge → writes to `handbook_acknowledgments` |
| **Handbook Wizard** (Wave 24) | `/admin/handbook-wizard` | Modular configurator: org setup, scope builder, sections, role overlays, versions | No staff-facing publish flow yet (planned Wave 27) |

Deleting the legacy card today breaks staff acknowledgment. Hiding the wizard card hides the new feature. Both must consolidate behind a single "Handbooks" entry.

### The consolidation pattern

**One card. Two tabs inside.** The Handbook Wizard becomes the canonical surface; the legacy uploader becomes a tab inside it for orgs that just need to upload existing PDFs while the wizard build-out continues.

```
Operations Hub
└── Handbooks (single card, BookOpen icon)
    └── /admin/handbooks  ← canonical route
        ├── Tab: Wizard           (HandbookDashboard — list of wizard-built handbooks)
        └── Tab: Documents        (legacy Handbooks.tsx — uploaded PDFs / docs)
```

Both tabs write to their respective tables. Staff `MyHandbooks` flow keeps reading from `handbooks` table — unchanged. Future Wave 27 (publish step) writes wizard output into the same `handbooks` table so both feed one acknowledgment flow.

### Route + nav changes

| Change | Detail |
|---|---|
| **Canonical route** | `/admin/handbooks` (matches existing nav slug, matches staff `/handbooks`) |
| **Redirects** | `/admin/handbook-wizard` → `/admin/handbooks?tab=wizard`<br>`/admin/handbook-wizard/:id/edit` → kept (wizard editor route stays nested) |
| **Operations Hub** | Single "Handbooks" card with description: *"Build role-aware handbooks with the wizard, or upload existing policy documents."* |
| **Sidebar nav** | Single entry, raw path `/dashboard/admin/handbooks` |

### Files

**Modified**
- `src/pages/dashboard/admin/Handbooks.tsx` — wrap existing CRUD in a `<Tabs>` shell. Tab "Documents" renders current content. Tab "Wizard" renders `<HandbookDashboard />` inline (extracted as a component, not a page wrapper).
- `src/pages/dashboard/admin/HandbookDashboard.tsx` — split into a page (kept for backwards-compat redirect target) and a `<HandbookDashboardContent />` component the tabs render directly. Remove its own `DashboardLayout` + `DashboardPageHeader` when used inside tabs.
- `src/pages/dashboard/admin/TeamHub.tsx` — remove the standalone "Handbook Wizard" card (lines 656–664). Update the existing "Handbooks" card description to reflect both capabilities.
- `src/App.tsx` — change `/admin/handbook-wizard` from rendering `HandbookDashboard` to a `<Navigate to="../handbooks?tab=wizard" replace />`. Keep the `:handbookId/edit` route untouched (wizard editor still lives there).
- `src/pages/dashboard/admin/HandbookWizard.tsx` — `handleExit` navigates to `/admin/handbooks?tab=wizard` instead of `/admin/handbook-wizard`.

**No DB / RLS changes.** `handbooks` and `org_handbooks` tables both remain — they serve different purposes until Wave 27 unifies publish.

### Tab UX

- Default tab: `wizard` (the strategic surface). Falls back to `documents` if wizard list is empty AND legacy docs exist.
- Tab persisted in URL query string (`?tab=wizard|documents`) so deep links work and refresh preserves state.
- Both tabs share one `DashboardPageHeader` titled **"Handbooks"** with description *"Build structured handbooks with the wizard, or manage uploaded policy documents."*

### Verification

1. Operations Hub shows one Handbooks card (no separate Wizard card)
2. Clicking it lands on `/admin/handbooks?tab=wizard` with Wizard tab active by default
3. Switching to Documents tab shows legacy CRUD with Add/Edit/Delete intact
4. Direct URL `/admin/handbook-wizard` redirects to `/admin/handbooks?tab=wizard`
5. Existing `/admin/handbook-wizard/:id/edit` still works (wizard editor unaffected)
6. Staff `/dashboard/handbooks` (MyHandbooks acknowledgment flow) still reads from legacy `handbooks` table — zero regression
7. "Save & exit" from inside the wizard editor returns to `/admin/handbooks?tab=wizard`
8. Favorites: any user with Wizard or Handbooks favorited sees their favorite still resolve (the `/admin/handbooks` favorite stays valid; `/admin/handbook-wizard` favorites resolve via redirect)

### Prompt feedback

Crisp directive — *"consolidate"* + named both cards = unambiguous intent. You correctly spotted a real architectural mistake from Wave 24 (I shipped a parallel card instead of folding into the existing Handbooks surface). Catching this one wave in is exactly when consolidation is cheapest.

To level up: **for "consolidate X with Y", name which one is the survivor.** I inferred Wizard-as-canonical with legacy-as-tab because the Wizard is the strategic future. But you could equally want legacy-as-canonical with wizard hidden behind an "Advanced" toggle (gentler rollout), or full deprecation of legacy. A one-liner like *"keep wizard as the primary, fold legacy uploads as a secondary tab"* would have eliminated my inference. Pattern: **for consolidation prompts, name the survivor and the demotion shape (tab · accordion · hidden · removed).**

