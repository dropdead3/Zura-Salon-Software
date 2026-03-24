

## Add Faux Client History & Formula Data for Rachel Kim (Demo Mode)

### What this enables

When demoing Rachel Kim's appointment, the Client tab and Formula History sheet will show realistic past visit history and formula records. The Smart Mix Assist / Instant Formula Memory will surface a recommended formula based on her "last visit" data, demonstrating the suggestion engine without needing real database records.

### Approach

Add static demo data for Rachel Kim (demo-client-7) and wire demo intercepts into the three hooks that currently query Supabase with no demo fallback.

### 1. Add demo data — `src/hooks/dock/dockDemoData.ts`

**Demo formula history** for Rachel Kim (3 past formulas spanning ~6 weeks):

| Date | Service | Formula | Staff |
|------|---------|---------|-------|
| ~6 weeks ago | Root Touch-Up + Gloss | Koleston Perfect 6/0 (30g) + Welloxon 20 Vol (30ml) + Shinefinity 09/13 (40g) | Jenna B. |
| ~3 weeks ago | Root Touch-Up + Gloss | Koleston Perfect 6/0 (25g) + Koleston Perfect 7/1 (5g) + Welloxon 20 Vol (30ml) + Shinefinity 09/13 (40g) | Jenna B. |
| ~10 weeks ago | Single Process Color | Igora Royal 5-0 (40g) + Igora Developer 20 Vol (40ml) | Jenna B. |

Export as `DEMO_FORMULA_HISTORY: Record<string, ClientFormula[]>` keyed by client ID.

**Demo visit history** for Rachel Kim (4 past visits):

| Date | Service | Status | Notes |
|------|---------|--------|-------|
| ~3 weeks ago | Root Touch-Up + Gloss | completed | Level 7 base maintained, added 7/1 for dimension |
| ~6 weeks ago | Root Touch-Up + Gloss | completed | Keep it natural — level 7 base |
| ~10 weeks ago | Single Process Color | completed | Initial color — transitioning from box dye |
| ~14 weeks ago | Signature Haircut | completed | Consultation — discussed going lighter |

Export as `DEMO_VISIT_HISTORY: Record<string, ClientVisit[]>` keyed by client ID.

**Demo formula memory** — prebuilt `ResolvedFormulaMemory` for Rachel Kim's "Root Touch-Up + Gloss" service, sourced from her most recent formula (3 weeks ago). Export as `DEMO_FORMULA_MEMORY: Record<string, ResolvedFormulaMemory>` keyed by `${clientId}::${serviceName}`.

### 2. Add demo intercepts to hooks

**`useClientFormulaHistory.ts`** — Add demo check at top of `queryFn`: if `clientId` starts with `demo-`, return `DEMO_FORMULA_HISTORY[clientId] ?? []` immediately.

**`useClientVisitHistory.ts`** — Add demo check: if `phorestClientId` starts with `demo-`, return `DEMO_VISIT_HISTORY[phorestClientId] ?? []`.

**`useInstantFormulaMemory.ts`** — Add demo check: if `clientId` starts with `demo-`, look up `DEMO_FORMULA_MEMORY[${clientId}::${serviceName}]` and return it, falling back to the first entry in `DEMO_FORMULA_HISTORY[clientId]` reformatted as `ResolvedFormulaMemory`.

The `demo-` prefix check is the same pattern used by `useDockMixSessions` — no context dependency needed.

### Files changed

| File | Change |
|------|--------|
| `src/hooks/dock/dockDemoData.ts` | Add `DEMO_FORMULA_HISTORY`, `DEMO_VISIT_HISTORY`, `DEMO_FORMULA_MEMORY` exports |
| `src/hooks/backroom/useClientFormulaHistory.ts` | Add demo-ID intercept in `queryFn` |
| `src/hooks/useClientVisitHistory.ts` | Add demo-ID intercept in `queryFn` |
| `src/hooks/backroom/useInstantFormulaMemory.ts` | Add demo-ID intercept in `queryFn` |

### Result

Opening Rachel Kim's appointment in demo mode shows:
- **Client tab**: Last formula card with her Root Touch-Up formula, visit count (4), processing time, notes
- **Formula History sheet**: 3 expandable formula entries with ingredients, dates, version numbers
- **Smart Mix Assist**: Suggests her last Root Touch-Up formula as the starting point when creating a new bowl

