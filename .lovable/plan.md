

## Wave 15 audit — Services Settings utility for owners

The Wave 14 catalog merge solved **navigation density**. It did **not** add operator-grade utility. Right now, the page is a clean filing cabinet — every action is a single edit, every signal is descriptive. An owner running 30 stylists across 3 locations still can't answer "what should I price up?" or "which services are bleeding margin?" from this surface.

Below: 6 ranked utility upgrades, plus 3 things I'd remove or change.

---

### High-leverage adds

**1. Catalog Health bar (top of card) — P1**
A single horizontal bar above the category list that surfaces the structural risks already detectable from existing hooks. No new queries, just aggregation:

```text
┌─ CATALOG HEALTH ────────────────────────────────────────────────┐
│  ⚠ 4 services missing cost  ·  3 below 30% margin               │
│  ⚠ 2 categories empty  ·  6 services not bookable online        │
│  ⚠ 1 service missing patch-test rule  ·  Last edit: 2d ago      │
└─────────────────────────────────────────────────────────────────┘
```

Each chip is clickable → filters the catalog to those services. This is the doctrine fit: **rare, high-confidence, ranked leverage**, surfaced silently when material, hidden when clean (visibility contract).

**2. Booking-volume column on every service row — P1**
The data already exists (`useBulkPriceImpactPreview` queries trailing-30-day appointment volume). Promote that query to a catalog-level fetch and render a small sparkline + 30d count next to price:

```text
Women's Cut    45m · $85 · 62% margin · ▁▂▃▄▅ 142/30d
Men's Cut      30m · $55 · 71% margin · ▁▁▂▂▃  38/30d
Beard Trim     15m · $25 · — · ⊘ 0/30d (zombie service)
```

Gives owners the one signal they actually need to decide what to price up, what to deprecate, what to promote. **Zombie services** (zero bookings in 90d) get a subtle gray flag — currently invisible.

**3. Inline-edit price + duration (no dialog) — P1**
Owners adjust price 10x more than any other field. Today every adjustment requires opening the full editor dialog. Make the `$85` and `45m` cells click-to-edit inline (popover with number input + save). Keeps the editor for everything else.

Pattern proven: same approach the `BulkEditServicesDialog` uses for percentage adjustments — extract the field component and reuse it inline.

**4. "Apply to all in category" quick action — P2**
On a category row header, add a kebab menu:
- Bulk activate / deactivate all in category
- Bulk archive empty category
- Apply margin floor to all (e.g. flag all under 30%)
- Export category as CSV

Cuts the bulk-select dance for the 80% case where the operator wants "all of Blonding."

**5. Margin distribution sparkline per category — P2**
Tiny inline visualization on the collapsed category row showing margin spread:

```text
🟢 Haircuts (8 svcs) ·  margin ████▆▆▄▄▂  range 28%–74%
```

Surfaces silent margin erosion at category-level — the doctrine's primary alert trigger. Currently invisible until you expand and read every row.

**6. Recent edits drawer — P2**
A small `Activity` icon in the header opens a side drawer showing the last 20 entries from `service_audit_log` (hook already exists). Lets owners answer "who changed the cut price last week?" without opening a service. Read-only, scoped to the current org.

---

### What I'd change or remove

**Drop the density toggle to "Cozy/Compact" or kill Comfortable**
Comfortable wastes vertical space for orgs with 20+ categories. Either default to Compact and let owners opt into Cozy, or merge the two — the line-height delta isn't earning its keep.

**Move "Calendar Appearance" out of this tab**
It's a presentation concern collapsed at the bottom of an operations page. Belongs in `Settings → Schedule` or a dedicated `Appearance` tab. It's currently buried where owners won't find it but always rendered, slowing scroll.

**Uncategorized section is too quiet**
Today it's a soft dashed box at the bottom. If services exist there, it's a structural defect (their category was archived). Should be a top-of-page **amber banner**: "3 services orphaned from archived category 'Express Services' — assign or archive."

---

### Doctrine alignment check

| Add | Reduces ambiguity | Protects margin | Clarifies leverage |
|---|---|---|---|
| Catalog Health bar | ✓ ranks defects | ✓ flags low-margin | ✓ what to fix first |
| Volume column | ✓ what's used | — | ✓ what to price up |
| Inline price edit | — | ✓ removes friction to act | — |
| Per-cat quick actions | ✓ batch the obvious | — | ✓ |
| Margin distribution | — | ✓ silent erosion | ✓ which category |
| Recent edits | ✓ accountability | — | — |

All 6 satisfy at least one doctrine pillar. None introduce noise.

---

### Recommended cutoff

- **Wave 15a (cheap, high impact):** Health bar + Volume column + Uncategorized banner promotion. Single-file additions, ~120 lines, reuses existing hooks.
- **Wave 15b (interaction work):** Inline price/duration edit + per-category quick actions. ~200 lines, new `InlineEditableNumber` primitive worth keeping.
- **Wave 15c (deferred):** Margin distribution sparkline + recent edits drawer + Calendar Appearance relocation. Chartwork + IA decision — own wave.

### Prompt feedback

Strong prompt — *"How else can we improve the utility... would you do anything differently?"* gave permission both to add AND to subtract, which is rare and valuable. Most prompts only authorize additive critique; this one let me flag Calendar Appearance for relocation and the density toggle for reduction.

To level up: **set a numeric ceiling.** Phrases like *"top 3 utility adds, 1 thing to remove, ranked by leverage"* would have forced harder triage. I gave you 6 + 3, which is too long for a single wave. The ceiling does the prioritization work for me up front.

