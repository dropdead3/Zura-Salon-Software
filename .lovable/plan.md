

## Reorganize Service Detail Panel into 3 Labeled Sections

### What Changes

The expanded service detail panel currently renders all controls in a flat layout. This reorganizes the content into three visually distinct, labeled sections:

1. **Tracking** — "Requires Color/Chemical" toggle + Vessel selector (Bowls/Bottles)
2. **Billing Method** — Allowance vs Parts & Labor mode toggle + allowance config/P&L description
3. **App Preferences** — Assistant Prep, Smart Mix Assist, Formula Memory toggles

### Implementation — 1 File Modified

**`src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (~lines 758–964)

1. **Create a section wrapper pattern** — Each section gets a consistent layout:
   - Section label: `text-[10px] font-display uppercase tracking-wider text-muted-foreground` 
   - Content area: `pl-3 border-l border-border/40` (subtle left-border indent)
   - Sections separated by `space-y-4` (no heavy dividers — the labels + indent provide structure)

2. **Section 1 — "Tracking"** (lines 760–811)
   - Wrap the existing "Requires Color/Chemical" switch + vessel selector pills
   - Remove the bottom border (`border-b border-border/40`) since the section label provides visual separation

3. **Section 2 — "Billing Method"** (lines 813–939)
   - Wrap the existing billing mode toggle (Allowance / Parts & Labor) + mode-specific content
   - Gated on `is_chemical_service` being true (same as current vessel gate)

4. **Section 3 — "App Preferences"** (lines 941–963)
   - Wrap the existing toggles grid (Assistant Prep, Smart Mix Assist, Formula Memory)
   - Change grid from `grid-cols-2 sm:grid-cols-4` to `grid-cols-3` since there are exactly 3 items — cleaner alignment

5. **Price Recommendation card and "Mark Configured" footer remain outside/below the 3 sections** — they are action items, not configuration sections.

### Visual Structure

```text
┌─────────────────────────────────────────────┐
│ TRACKING                                    │
│ ┃ Requires Color/Chemical [toggle]          │
│ ┃ Vessels: [✓ Bowls] and/or [+ Bottles]     │
│                                             │
│ BILLING METHOD                              │
│ ┃ [✓ Allowance] [+ Parts & Labor]           │
│ ┃ 45g included · $0.50/g overage  [Edit]    │
│                                             │
│ APP PREFERENCES                             │
│ ┃ Assistant Prep [toggle]                   │
│ ┃ Smart Mix Assist [toggle]                 │
│ ┃ Formula Memory [toggle]                   │
│                                             │
│ [Price Recommendation if any]               │
│ ─── Configured ✓ ──── [Reset Configuration] │
└─────────────────────────────────────────────┘
```

### Scope
- 1 file modified: `ServiceTrackingSection.tsx`
- Rendering reorganization only — no logic changes
- No database migrations

