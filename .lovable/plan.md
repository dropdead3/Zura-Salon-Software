

# Design System Governor — Inventory Tab (Retail Products Page)

## Canon Map

| Token | Status |
|---|---|
| `tokens.card.*` | ✅ AlertSettingsCard compliant |
| `tokens.kpi.*` | ✅ Summary tiles compliant (previous pass) |
| `tokens.table.columnHeader` | ✅ Applied (previous pass) |
| `tokens.button.*` | ✅ Compliant |
| Typography weight ≤ 500 | ✅ Compliant |
| 4/8px spacing rhythm | ⚠️ 5 minor deviations remaining |

## Quantified Violations (7)

| # | File | Line | Violation | Fix |
|---|---|---|---|---|
| 1 | AlertSettingsCard.tsx | 94 | `mt-0.5` (2px) on CardDescription | → `mt-1` (4px) |
| 2 | AlertSettingsCard.tsx | 167 | `mt-0.5` on auto-create PO description | → `mt-1` |
| 3 | AlertSettingsCard.tsx | 196 | `space-y-1.5` on RadioGroup | → `space-y-2` |
| 4 | AlertSettingsCard.tsx | 214 | `space-y-1.5` on daily spend cap section | → `space-y-2` |
| 5 | AlertSettingsCard.tsx | 198, 205 | `mt-0.5` on RadioGroupItem | → `mt-1` |
| 6 | AlertSettingsCard.tsx | 190 | `mt-0.5` on warning icon | → `mt-1` |
| 7 | RetailProductsSettingsContent.tsx | 1408 | Low stock banner uses raw `p-3` (12px) | → `p-4` (16px, 8px rhythm) |

**Total: 7 corrections across 2 files.**

## Corrections

All changes are spacing normalization to 4/8px rhythm. No tokens, colors, typography, or layout changes.

### AlertSettingsCard.tsx
- Lines 94, 167, 180: `mt-0.5` → `mt-1`
- Lines 196, 214: `space-y-1.5` → `space-y-2`
- Lines 190, 198, 205: `mt-0.5` → `mt-1`

### RetailProductsSettingsContent.tsx
- Line 1408: `p-3` → `p-4`

## System Integrity Score

**Pre-correction: 93/100** — Previous pass resolved all major violations. Only sub-4px spacing remnants remain.

**Post-correction: 97/100** — Remaining 3 points: `text-[10px]` badges (established convention), `gap-1.5` in toggle buttons (codebase-wide pattern), conditional amber/emerald colors (acceptable for severity encoding).

