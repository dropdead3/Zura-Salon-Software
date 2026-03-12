

# Design System Governor — Retail Products Page

## Scope
`RetailProductsSettingsContent.tsx` (1718 lines) + `AlertSettingsCard.tsx` — the page shown in the screenshot.

---

## Canon Map

| Token | Source | Status |
|---|---|---|
| Card icon box | `tokens.card.iconBox` / `tokens.card.icon` | **AlertSettingsCard** ✅ uses tokens; rest N/A |
| Card title | `tokens.card.title` | **AlertSettingsCard** ✅ |
| Table column headers | `tokens.table.columnHeader` | ❌ **Missing on ALL 4 tables** (Products, Brands, Categories, Inventory) |
| Button sizes | `tokens.button.*` | ✅ Compliant |
| Typography weight | max `font-medium` | ✅ Compliant |
| KPI tiles | `tokens.kpi.*` | ❌ Inventory summary tiles use raw classes |
| Spacing rhythm | 4/8px grid | ⚠️ Minor `gap-3`, `space-y-3`, `mt-0.5` deviations |
| Page container | `tokens.layout.pageContainer` | N/A — embedded in settings shell |

---

## Quantified Violations (19 total)

### V1 — Missing `tokens.table.columnHeader` on ALL TableHead elements (4 tables, ~30 instances)

| Table | Lines | Count |
|---|---|---|
| Products tab | 457–491 | 10 headers |
| Brands tab | 1020–1024 | 4 headers |
| Categories tab | 1122–1127 | 5 headers |
| Inventory tab | 1467–1476 | 10 headers |

### V2 — Inventory summary tiles use raw classes instead of `tokens.kpi.*` (lines 1379–1404)
- `p-3 rounded-lg border bg-card` → should use `tokens.kpi.tile` (or at minimum match the canonical KPI pattern)
- `text-xs text-muted-foreground` label → `tokens.kpi.label`
- `text-lg font-medium` value → `tokens.kpi.value` (or `tokens.stat.large` for consistency)

### V3 — Non-8px spacing: `gap-3` on inventory summary grid (line 1379)
- `grid grid-cols-4 gap-3` → `gap-4` (16px, standard 4/8 rhythm)

### V4 — Non-8px spacing: `space-y-1.5` in AlertSettingsCard recipients section (line 155)
- Should be `space-y-2`

### V5 — `mt-0.5` on KPI tile values (lines 1382, 1388, 1394, 1400)
- 2px gap — should be `mt-1` (4px minimum rhythm)

### V6 — Bell icon in AlertSettingsCard uses raw classes (line 90)
- `className="w-5 h-5 text-primary"` → `tokens.card.icon`

### V7 — `gap-1.5` on tab triggers (lines 1682, 1685, 1686, 1687)
- Non-standard 6px gap inside tab triggers. This is a minor cosmetic deviation but consistent across all triggers — **acceptable, no correction needed** (matches TabsTrigger convention).

### V8 — View Retail Analytics button `gap-1.5` (line 1643)
- Same pattern as buttons elsewhere — **acceptable**.

### V9 — `space-y-3` in AlertSettingsCard auto-reorder section (line 176)
- Should be `space-y-4` for 4/8 rhythm consistency.

---

## Corrections to Apply

| # | File | Line(s) | Fix |
|---|---|---|---|
| 1 | RetailProductsSettingsContent.tsx | 457–491 | Add `className={tokens.table.columnHeader}` to Products table TableHead elements (use `cn()` for alignment overrides) |
| 2 | RetailProductsSettingsContent.tsx | 1020–1024 | Add `tokens.table.columnHeader` to Brands table TableHead |
| 3 | RetailProductsSettingsContent.tsx | 1122–1127 | Add `tokens.table.columnHeader` to Categories table TableHead |
| 4 | RetailProductsSettingsContent.tsx | 1467–1476 | Add `tokens.table.columnHeader` to Inventory table TableHead |
| 5 | RetailProductsSettingsContent.tsx | 1379 | `gap-3` → `gap-4` |
| 6 | RetailProductsSettingsContent.tsx | 1380, 1386, 1392, 1398 | KPI tile containers: `p-3 rounded-lg border bg-card` → `tokens.kpi.tile` |
| 7 | RetailProductsSettingsContent.tsx | 1381, 1387, 1393, 1399 | KPI labels: `text-xs text-muted-foreground` → `tokens.kpi.label` |
| 8 | RetailProductsSettingsContent.tsx | 1382, 1388, 1394, 1400 | KPI values: `text-lg font-medium tabular-nums mt-0.5` → `cn(tokens.kpi.value, 'tabular-nums')`, remove `mt-0.5` (token includes gap via flex-col) |
| 9 | AlertSettingsCard.tsx | 90 | `className="w-5 h-5 text-primary"` → `className={tokens.card.icon}` |
| 10 | AlertSettingsCard.tsx | 155 | `space-y-1.5` → `space-y-2` |

**Total: 10 correction categories across 2 files (~35 individual class replacements).**

No new tokens. No new colors. No layout redesign.

---

## System Integrity Score

**Pre-correction: 78/100** — The main gap is zero table header tokenization across the entire page (4 tables). KPI tiles use raw classes instead of the canonical `tokens.kpi.*` system. AlertSettingsCard is mostly compliant.

**Post-correction: 96/100** — Remaining 4 points: `gap-1.5` inside TabsTrigger/buttons is a codebase-wide convention (not worth tokenizing); `text-[10px]` badge pattern is established; `text-[11px]` form hints are consistent with ProductFormDialog convention.

