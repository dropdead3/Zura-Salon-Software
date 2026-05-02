## Promotion Library — Preset Catalog + Saved Promotions

Adds a "Promotion Library" layer above the Promotional Popup editor. Operators pick from curated **presets** (industry-tested offer archetypes) to start fast, and persist their own **saved promotions** (named snapshots of the popup config) they can reload, duplicate, or schedule on rotation.

The popup itself stays exactly as-is — this layer only writes into the existing `PromotionalPopupSettings` shape via the editor's current save path. Zero migration of existing live popups.

---

### 1. Curated preset catalog (read-only, in-code)

A new `src/lib/promo-presets.ts` ships ~8 archetypes. Each preset is a partial `PromotionalPopupSettings` covering the content + offer slots only (eyebrow, headline, body, CTA labels, disclaimer, value anchor, offerCode placeholder, eyebrowIcon). Behavior/targeting/style fields are NOT touched — those stay at whatever the operator has set, so applying a preset never silently changes appearance, schedule, or audience.

Initial preset set (operator-tested archetypes, not industry-specific to hair):

| Key | Label | Use case |
|---|---|---|
| `new-client-discount` | New Client Welcome | First-visit % off |
| `complimentary-addon` | Complimentary Add-On | Free service with paid booking (current default) |
| `referral-bonus` | Referral Reward | Bring-a-friend credit |
| `birthday-month` | Birthday Month Gift | Birthday-month perk |
| `weekday-fill` | Midweek Fill | Tue/Wed/Thu utilization booster |
| `holiday-gift-card` | Gift Card Promo | Seasonal gift-card lift |
| `winback-lapsed` | We Miss You | Lapsed-client reactivation |
| `flash-24h` | 24-Hour Flash | Urgency-driven short window |

Each preset includes a one-line `rationale` (when to use it) and a `category` tag (`acquisition` / `retention` / `utilization` / `seasonal`) for filtering.

### 2. Saved promotions (per-org, persisted)

A new `site_settings` row keyed `promotional_popup_library` stores an array of saved promo snapshots scoped to the org. Reusing `site_settings` (vs a new table) keeps it inside the existing draft/publish + RLS posture and avoids another migration surface for a low-write, low-cardinality feature.

```ts
type SavedPromo = {
  id: string;            // uuid
  name: string;          // operator label, e.g. "Spring Color Promo"
  notes?: string;        // optional context
  createdAt: string;     // ISO
  updatedAt: string;
  config: PromotionalPopupSettings; // full snapshot (excluding `enabled`)
  lastAppliedAt?: string;
};

type PromoLibrary = { saved: SavedPromo[] };
```

Cap: 25 saved promos per org (silent enforcement at save time — operator cannot accidentally bloat the row).

New hook `usePromoLibrary()` mirrors the `usePromotionalPopup` pattern: `fetchSiteSetting` / `writeSiteSettingDraft` against the `promotional_popup_library` key. Library writes go through draft → publish like every other site setting.

### 3. Editor UI: a "Library" surface above the existing form

Adds a single new `<EditorCard>` at the **top** of `PromotionalPopupEditor.tsx` titled "Promotion Library". Two stacked rows:

```text
┌─ Promotion Library ─────────────────────────────────────┐
│  Start from a template                                  │
│  [▼ Choose a preset…]   8 archetypes · category-filtered│
│                                                         │
│  Your saved promotions  (3 / 25)                        │
│  ▸ Spring Color Promo      Apply · Rename · Duplicate · │
│    Last used Mar 14                       Delete        │
│  ▸ Winter Gift Card        Apply · …                    │
│                                                         │
│  [Save current as promotion…]                           │
└─────────────────────────────────────────────────────────┘
```

Behaviors:

- **Apply preset** / **Apply saved**: merges the preset/snapshot's content+offer fields into `formData` (preserves operator's `enabled`, `appearance`, `trigger`, `showOn`, `audience`, schedule, accent). Marks the form dirty so the existing Save flow + parity contract handles the rest. Toast: "Loaded 'Spring Color Promo' — review and Save to apply."
- **Save current as promotion**: opens a small inline name field. Snapshots the current `formData` minus `enabled` (so reloading later doesn't auto-publish). Stamps `createdAt` / `updatedAt`. Confirms via toast.
- **Rename / Duplicate / Delete**: inline row actions. Delete uses the canonical `<UnsavedChangesDialog />` pattern variant for destructive confirm (or a simple `AlertDialog` — pick whichever the editor tree already uses; one inline ask if ambiguous).
- **Apply confirmation when dirty**: if `isDirty` is true, route through the existing unsaved-changes guard before swapping the form (prevents silent loss of in-progress edits).

### 4. Doctrine compliance

- **Preview-Live Parity**: this surface only reads/writes via the editor's existing state — no new public-side render path, so no parity contract impact.
- **Brand Abstraction**: preset copy uses neutral language ("Welcome offer", not stylist-specific verbiage). No hardcoded tenant references.
- **Site Settings Persistence**: library writes go through `writeSiteSettingDraft` (read-then-update/insert pattern, project canon).
- **Visibility Contracts**: empty saved-list renders the "no saved promotions yet" empty state with `tokens.empty.*` (silence is valid here only when zero — when ≥1 exists, list always renders).
- **Stylist Privacy Contract**: editor lives under admin website-hub, already gated.
- **Container-Aware**: library card uses `<EditorCard>` + existing `Section`/`Field` primitives — inherits compression behavior.
- **Typography**: `font-display` for the card title (Termina), `font-sans` for preset labels (Aeonik, never uppercase).

### 5. Tests (locks the contract)

- `promo-presets.test.ts` — every preset deserializes into a valid partial `PromotionalPopupSettings`; no preset includes `enabled` (would auto-publish on apply); no preset includes `appearance` / `showOn` / schedule (would silently change targeting).
- `usePromoLibrary.test.ts` — 25-cap enforcement; rename uniqueness allowed (no constraint, names can repeat); apply merges content+offer fields only.
- `PromotionalPopupEditor.library.test.tsx` — applying a preset/saved promo marks form dirty; applying while dirty triggers the unsaved-changes guard; "Save current as promotion" snapshots without `enabled`.

### 6. Files

**Created**
- `src/lib/promo-presets.ts` — the 8 archetypes + category metadata
- `src/lib/promo-presets.test.ts`
- `src/hooks/usePromoLibrary.ts` — fetch/save/delete/apply hook
- `src/hooks/usePromoLibrary.test.ts`
- `src/components/dashboard/website-editor/promotional-popup/PromoLibraryCard.tsx` — the new EditorCard
- `src/components/dashboard/website-editor/PromotionalPopupEditor.library.test.tsx`

**Edited**
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — mount `<PromoLibraryCard formData={formData} setFormData={setFormData} isDirty={isDirty} />` at the top of the form

**No DB migration** — `promotional_popup_library` is a new `site_settings.id`, and the existing RLS policies on `site_settings` already cover org-scoped reads/writes.

### 7. Out of scope (explicit deferrals)

- **Scheduled rotation** ("auto-swap promo X on April 1"): deferred. Listed as Wave 3. Operators today manually Apply + Save.
- **Cross-org template marketplace** ("share with my other locations"): deferred until multi-location promo governance is real.
- **AI-generated presets**: explicitly NOT in scope — violates the "AI cannot determine business eligibility/priorities" doctrine. Presets are curated and static.
- **Performance ranking on saved promos** ("which one converted best"): the existing `usePromotionalPopupRedemptions` is per-`offerCode`, not per-snapshot. Could be added in Wave 3 by stamping a `libraryEntryId` onto redemption records.

### 8. Open questions for confirmation

1. **Preset list** — is the 8-archetype starter set above the right spread, or do you want me to lean acquisition-heavy / utilization-heavy for hair-salon operators specifically?
2. **Apply behavior on `enabled`** — confirm: applying a preset/saved promo should leave `enabled` untouched (operator must manually flip the popup live), never auto-enable. This is the safe default and what I've planned.
3. **Saved promo cap** — 25 feels right for low-cardinality; raise/lower?
