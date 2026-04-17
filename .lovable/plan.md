

## Plan — Wave 12: Diagnose & Fix Lint Regression (P0 #2)

Single-focus wave per the P0 triage doctrine. No bundling.

### Diagnosis steps

1. Run current lint and capture full output (counts + rule breakdown)
2. Compare against `DEBUG_LOG.md` baseline (1100 errors → 4322)
3. Group errors by rule name to identify the top 3-5 offenders
4. Cross-reference against `eslint.config.js` — has the config changed since baseline?
5. Identify whether the spike is:
   - **Config drift** (a rule was tightened or added) → fix at config layer
   - **Real code regression** (Wave 1-11 work introduced violations) → fix at code layer
   - **Both** → split fixes

### Fix strategy (decision branches)

| Root cause | Action |
|---|---|
| New/tightened rule causing noise | Re-tune rule severity (warn vs error) or scope it |
| Genuine violations in recent waves | Mechanical fix pass on top offenders |
| Auto-generated files being linted | Add to `ignores` in `eslint.config.js` |
| Mix | Config first, then code in priority order |

**Scope guard:** target getting back under the 1100-error baseline. Do not pursue zero-errors — that's a separate doctrinal decision (out of scope this wave).

### Acceptance checks

1. Lint error count documented before and after
2. Root cause identified and named in `DEBUG_LOG.md`
3. Error count back at or below 1100 baseline
4. No new test failures introduced (re-run the 7 tests fixed in Wave 11)
5. No production behavior changes — config and lint-only fixes
6. Findings logged with doctrine anchor (per Wave 11 Audit Output Contract)

### Files likely touched

- `eslint.config.js` — possible rule re-tuning or `ignores` additions
- `DEBUG_LOG.md` — root cause + before/after counts
- N source files — only if genuine violations identified (count TBD after diagnosis)

### Files to read (diagnosis)

- `eslint.config.js`
- `DEBUG_LOG.md` (baseline reference)
- Top offender files surfaced by lint output

### Deferred (carried forward)

- P1: Tooltip ref warning in `SupplyLibraryTab.tsx:94` — **trigger: Wave 13 or next color-bar work**
- P1: Legacy `DEBUG_LOG.md` queue (Waves 2-5) — **trigger: explicit re-prioritization**
- ESLint taxonomy rule (kebab-case enforcement) — **trigger: 3rd domain adopts the bus**
- `VisibilityContractAuditPanel` UI — **trigger: ≥1 non-color-bar adopter**
- CI audit-comment grep — **trigger: 3rd undocumented audit query**
- Multi-axis audit pass — **trigger: Wave 15**
- Zero-errors lint goal — **trigger: explicit doctrinal decision; not assumed**

