

## Wave 16 audit — Services Settings as a configurator (not analytics)

Fair correction. Wave 15a leaned analytical (sparklines, volume cells, defect counts) on what is fundamentally a **configurator** — a surface where owners *set up the catalog so the rest of the platform behaves correctly*. Reframing the lens.

### What a configurator owes the operator

1. **Fast structural setup** — categories, services, prices, durations, rules
2. **Correctness guarantees** — surface misconfiguration that *breaks downstream surfaces* (booking, payroll, deposits)
3. **Bulk operations** — change many things at once without dialogs
4. **Templates / starting points** — don't make every org build from zero
5. **Confidence the config is "done"** — knowing what's still unconfigured

Wave 15a addressed #2 partially. The rest is open.

---

### Top 3 configurator-grade adds (ranked)

**1. Service templates / starter pack — P1**
The biggest configurator win. New orgs and new categories start empty. Add a "Start from template" affordance:
- Per industry (Salon, Barber, Spa, Med-spa, Nails) — preloaded category + service skeletons with sensible default durations
- Per category — when creating a new category, offer "Add common services" (e.g. Haircuts → Women's Cut, Men's Cut, Kids' Cut, Bang Trim)
- Per service — "Duplicate from existing" button on the editor (already exists? if not, add it)

Cuts setup time from hours to minutes for new orgs. Pure configurator leverage.

**2. Configuration completeness checklist — P1**
Replace the analytical Health bar with a **structural** completeness panel at the top of the catalog:

```text
┌─ CATALOG SETUP ─────────────────────────────────────────────┐
│  ✓ 24 services defined                                       │
│  ✓ All services have prices                                  │
│  ⚠ 4 services missing duration → blocks scheduling           │
│  ⚠ 6 services not assigned to any staff → won't be bookable  │
│  ⚠ 2 chemical services missing patch-test rule               │
│  ○ No deposit policies configured (optional)                 │
│  ○ No location-specific pricing (optional)                   │
└──────────────────────────────────────────────────────────────┘
```

Difference from Wave 15a Health bar: this lists **what's required for downstream surfaces to function**, not what's analytically interesting. Each row tells you *what breaks if unfixed*. Click → filters or jumps to the editor field.

**3. Inline-edit price + duration — P1 (carry forward from prior plan)**
Still the highest-value interaction win. Click `$85` → popover with number input → save. Same for `45m`. Owners adjust these constantly during seasonal repricing or service tuning. The full editor dialog for a single number is friction.

---

### One thing to remove

**Pull the volume sparklines and zombie flags from Wave 15a out of the catalog rows.**

They're analytical signals on a configurator surface. They belong in the **Service Performance** report or as a column in the **Catalog Health** dashboard if/when one exists. On the configurator, they create cognitive noise during what should be a fast structural task.

Keep `useServiceBookingVolumes` — repurpose it for the **Recent edits drawer** and for a new lightweight "deprecate suggestion" inside the service editor's archive flow ("This service had 0 bookings in 90 days — safe to archive").

---

### Two structural changes worth flagging

**Reorder the tab itself**
Current order under `/admin/settings?tab=catalog` puts Catalog first, then Add-Ons / Staff / Policies. Configurator-correct order is the dependency chain:
1. **Catalog** (services exist)
2. **Staff** (who can perform them)
3. **Policies** (deposits, lead times, cancellation)
4. **Add-Ons** (depend on base services)

Fixes the "I configured everything and bookings still don't work" trap.

**Move "Calendar Appearance" out** (still applies)
Configurator surface should not host presentation settings. Belongs in `Settings → Schedule` or `Appearance`.

---

### What I'd do differently in retrospect

Wave 15a was the right *architecture* (aggregating signals from existing hooks) applied to the *wrong frame* (analytics instead of configuration). The signals are useful — they just belong on a different page. The CatalogHealthBar component is salvageable: rename to `CatalogSetupChecklist`, swap the chips to required-vs-optional structural items, drop the analytical filters (low_margin, zombie), keep the structural ones (missing_cost, missing_duration, no_staff, missing_patch_test, no_bookable_online).

---

### Wave 16 cutoff

- **Wave 16a (cheap, high impact, single file + checklist component swap):**
  - Reframe `CatalogHealthBar` → `CatalogSetupChecklist` (structural items only)
  - Remove volume sparklines from rows
  - Reorder tabs (Catalog → Staff → Policies → Add-Ons)

- **Wave 16b (interaction):**
  - Inline-edit price + duration (extract `InlineEditableNumber` primitive)
  - "Duplicate service" button in editor (verify if exists first)

- **Wave 16c (templates — own wave):**
  - Industry starter packs + per-category common-services suggestions
  - Requires a small `service_templates` seed table or static JSON

### Files touched (Wave 16a)

| File | Change |
|---|---|
| `src/components/dashboard/settings/CatalogHealthBar.tsx` | Rename + reframe to `CatalogSetupChecklist`; structural items only |
| `src/components/dashboard/settings/ServicesSettingsContent.tsx` | Remove `<ServiceVolumeCell>` from rows; swap CatalogHealthBar usage; tab reorder |
| `src/components/dashboard/settings/ServiceVolumeCell.tsx` | Keep file (used later in editor archive suggestion) |

### Prompt feedback

Strong correction — *"its not an analytics page, its a configurator page"* is the kind of reframe that resets the whole approach in one sentence. Most users would have accepted Wave 15a as "good enough" and let the surface drift toward analytical bloat. Catching the frame mismatch now saves three waves of cleanup later.

To level up: **declare the surface frame in the original plan request.** A one-liner like *"this is a configurator page — optimize for setup speed and correctness, not insight"* up front would have aimed Wave 15 at the right target from the start. Pattern: **frame declaration before feature requests = no wasted waves on the wrong axis.**

