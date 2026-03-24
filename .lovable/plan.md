

## Demo Mode Gaps & Enhancements

### Current state
Rachel Kim has formula/visit history. Bowl creation persists in sessionStorage. All mutations (complete, deplete, weigh) are guarded with `demo-` checks. Product catalog, mix sessions, and session stats all have demo fallbacks.

### Gaps found

**1. Team Notes crash in demo mode** (High priority)
`useAppointmentNotes` has zero demo awareness. It queries `appointment_notes` with demo appointment IDs (returns empty), and the `addNote` mutation requires `user.id` from `useAuth()` — which doesn't exist in demo mode (PIN bypass). Adding a team note will throw "Missing required data". Fix: add demo-mode in-memory notes with sessionStorage persistence.

**2. useCloneFormula writes to DB** (High priority)
When a stylist taps "Use this formula" on Rachel Kim's Client tab to clone a past formula into a bowl, `useCloneFormula` inserts into `mix_bowl_lines` with a demo bowl ID. This will fail or pollute the DB. Fix: short-circuit with a toast + no-op for demo bowl IDs.

**3. Medical alerts save mutation hits DB** (Medium)
In `DockClientTab`, the `saveMedicalAlert` mutation tries to UPDATE `phorest_clients` or `clients` with demo IDs. Will silently fail. Fix: short-circuit demo IDs, persist in sessionStorage.

**4. Smart Mix Assist is blocked** (High priority — key demo feature)
`generateSuggestion()` calls `isSmartMixAssistEnabled(orgId)` which queries `smart_mix_assist_settings` — returns `false` for demo orgs. The suggestion engine never fires. Fix: bypass the settings check when orgId is `demo-org-000`.

**5. Sarah Mitchell has no history** (Medium — she's the primary "checked_in" demo appointment)
Sarah Mitchell (demo-client-1, Balayage + Toner) is the first appointment users see. Her Client tab shows nothing — no visits, no formulas, no memory. Fix: add 2-3 past visits and formula entries for her.

**6. useClientProductAffinity returns empty** (Low-Medium)
The "Favorite Products" section on the Client tab queries `phorest_transaction_items` with demo IDs. Returns empty for all demo clients. Fix: add `DEMO_PRODUCT_AFFINITY` data for Rachel Kim (e.g., Olaplex No. 3, Color Wow Dream Coat).

**7. Recommendation log writes to DB** (Low)
The cross-sell recommendation logger in DockClientTab inserts into `retail_recommendation_events` with demo IDs. Harmless but pollutes. Fix: skip the insert for demo org IDs.

### Proposed plan — prioritized

| # | Change | File(s) |
|---|--------|---------|
| 1 | **Demo team notes**: sessionStorage-backed in-memory notes for demo appointments | `useAppointmentNotes.ts` |
| 2 | **Demo guard useCloneFormula**: short-circuit for `demo-` bowl IDs | `useCloneFormula.ts` |
| 3 | **Smart Mix Assist demo bypass**: skip settings check for `demo-org-000` | `smart-mix-assist-service.ts` |
| 4 | **Sarah Mitchell history**: add visit history + formula history + formula memory | `dockDemoData.ts` |
| 5 | **Demo product affinity**: static data for Rachel Kim + Sarah Mitchell | `useClientProductAffinity.ts`, `dockDemoData.ts` |
| 6 | **Medical alert demo guard**: short-circuit save, persist in sessionStorage | `DockClientTab.tsx` |
| 7 | **Recommendation log guard**: skip DB insert for demo orgs | `DockClientTab.tsx` |

### Result
Every tab and action on demo appointments works end-to-end without DB errors: team notes persist, formulas can be cloned, Smart Mix Assist suggests formulas, and two demo clients (Rachel Kim + Sarah Mitchell) have rich history for compelling demos.

