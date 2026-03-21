

## Enrich Dock Appointment Detail with Client Intelligence

### Current State
When tapping into an appointment card, the detail screen shows 3 tabs: **Services** (mixing bowls), **Notes** (appointment notes only), and **Summary** (bowl stats). No client history, past formulas, visit count, or preferences are surfaced. A basic `DockClientQuickView` bottom sheet exists separately but only shows name, email, notes, and 5 recent visits.

### Proposed Enhancement — Add a "Client" Tab

Add a **4th tab** ("Client") to `DockAppointmentDetail` that serves as the stylist's memory panel — everything they need to know about this client before and during the appointment.

#### Client Tab Content (top to bottom)

1. **Client Identity Card**
   - Avatar circle with initials, name, phone, email
   - Visit count badge ("12 visits") and first-visit date
   - CLV tier pill (Platinum/Gold/Silver/Bronze) if available

2. **Last Formula Section**
   - Service name + date of last formula
   - Product lines with weights (e.g., "Koleston 7/0 — 30g, 6% Developer — 60g")
   - Ratio display (e.g., "1:2")
   - Source label ("Client's Last Visit")
   - Uses existing `useInstantFormulaMemory` hook

3. **Visit History Timeline** (last 5-8 visits)
   - Date, service name, stylist name, status
   - Compact card rows, same styling as `DockClientQuickView`
   - Uses existing `useClientVisitHistory` hook

4. **Client Notes**
   - Notes from client profile record (not appointment notes — those are on the Notes tab)
   - Read-only display

5. **Processing Time Hint**
   - Average processing time from past completed visits
   - "Avg. 45 min processing" — helps with scheduling awareness

### Files to Create/Modify

| Action | File | Change |
|--------|------|--------|
| Create | `src/components/dock/appointment/DockClientTab.tsx` | New tab component with all 5 sections above |
| Modify | `src/components/dock/appointment/DockAppointmentDetail.tsx` | Add 4th "Client" tab with `User` icon to the tab bar |

### Data Sources (all existing — no new DB queries needed)

- **Client profile**: Query `phorest_clients` or `clients` by `phorest_client_id` / `client_id` from the appointment (same pattern as `DockClientQuickView`)
- **Last formula**: `useInstantFormulaMemory(clientId, serviceName)` — already resolves the 3-priority hierarchy
- **Visit history**: `useClientVisitHistory(phorestClientId)` — already fetches all past appointments with stylist names
- **Processing time**: Computed from visit history start/end times (same as `useClientMemory`)

### Design

All sections use platform dark tokens (`--platform-bg-card`, `--platform-border`, `--platform-foreground`, etc.), `font-display` for headers, `rounded-xl` cards. Formula lines displayed in a compact table with product name and weight columns. The tab icon is `User` from lucide-react.

### Suggestions for Future Enhancement

- **Allergy/sensitivity flags** — surface any noted allergies or sensitivities prominently at the top with a warning tint
- **Favorite products** — show retail products the client has purchased before (from checkout data)
- **Photo timeline** — link to before/after transformation photos from `client_transformation_photos`
- **No-show rate** — subtle indicator if client has a history of cancellations/no-shows

