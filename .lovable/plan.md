

# Surface Client Formula History in Client Database & Appointment Detail

## What Changes

### 1. New Component: `ClientFormulaHistoryTab`
A reusable read-only timeline of all formula versions for a client. Shows each formula entry with:
- Date, service name, staff name
- Formula lines (product + quantity + unit)
- Type badge (actual vs refined)
- Version number
- Collapsible detail for older entries

This component uses the existing `useClientFormulaHistory` hook — no new data fetching needed.

**File:** `src/components/dashboard/clients/ClientFormulaHistoryTab.tsx`

### 2. Add "Formulas" tab to `ClientDetailSheet`
Insert a new `TabsTrigger` ("Formulas" with Beaker icon) in the client database detail panel alongside Visit History, Transformations, Transactions, Notes, and Redos. Wire it to `ClientFormulaHistoryTab` using `client.phorest_client_id || client.id`.

**File:** `src/components/dashboard/ClientDetailSheet.tsx` — add import + tab trigger + tab content

### 3. Add "Formulas" tab to `AppointmentDetailSheet`
Insert a new tab in the appointment detail panel (alongside Details, History, Photos, Notes, Backroom). This surfaces formula history directly in the appointment context so any team member seeing the appointment can review past formulations.

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — add import + tab trigger + tab content using `appointment.phorest_client_id`

### 4. Enhance `ClientMemoryPanel` formula display
Currently the "Last Formula" card in ClientMemoryPanel shows a truncated one-liner. Add a small "View all" link/badge showing the count of total formula records, which switches to the Formulas tab when clicked.

**File:** `src/components/dashboard/schedule/ClientMemoryPanel.tsx` — add formula count + link

## Files Modified
| File | Change |
|------|--------|
| `src/components/dashboard/clients/ClientFormulaHistoryTab.tsx` | **New** — reusable formula history timeline |
| `src/components/dashboard/ClientDetailSheet.tsx` | Add Formulas tab |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add Formulas tab |
| `src/components/dashboard/schedule/ClientMemoryPanel.tsx` | Add formula count indicator |

No migrations needed — `client_formula_history` table and `useClientFormulaHistory` hook already exist.

