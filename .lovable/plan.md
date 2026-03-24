

## Surface Client Alerts on Services Tab

### Problem
Stylists on the Services tab (where mixing happens) have no visibility into allergy/sensitivity alerts or profile notes — they must switch to the Client tab to see them. This is a safety concern.

### Approach
Add a compact, read-only banner area at the top of the Services tab that shows:
1. **Allergy/Sensitivity alert** (rose-themed banner, same style as Client tab) — only if one exists
2. **Profile notes** (muted card) — only if notes exist

Reuse the same `detectAllergyFlags` helper already in `DockClientTab.tsx`. Extract it to a shared location. Query the same client profile data.

### Changes

**1. Extract `detectAllergyFlags` to shared utility**

Create `src/lib/backroom/detect-allergy-flags.ts` with the `ALLERGY_KEYWORDS` array and `detectAllergyFlags` function moved from `DockClientTab.tsx`.

**2. Create `DockClientAlertsBanner` component**

New file: `src/components/dock/appointment/DockClientAlertsBanner.tsx`

- Accepts `phorestClientId`, `clientId`, and `clientName` props (available from the appointment object)
- Runs the same client profile query (keyed to `dock-client-profile` so it shares cache with Client tab — zero extra network calls)
- Renders:
  - If allergy detected: compact rose banner with `AlertTriangle` icon, "ALLERGY / SENSITIVITY" label, and the text. No edit button (read-only here).
  - If profile notes exist: compact muted card with `FileText` icon, "PROFILE NOTES" label, and the notes text (truncated to 2 lines with expand toggle if long).
  - If neither exists: renders nothing.
- Uses `DOCK_TEXT.category` for labels, `px-7` horizontal padding to match Services tab spacing.

**3. Update `DockServicesTab.tsx`**

Insert `<DockClientAlertsBanner>` at the very top of the return JSX (line 235), before the bowl grid container. Pass `appointment.phorest_client_id`, `appointment.client_id`, and `appointment.client_name`.

**4. Update `DockClientTab.tsx`**

Replace the local `detectAllergyFlags` and `ALLERGY_KEYWORDS` with an import from the new shared utility.

### Result
Allergy alerts and profile notes are always visible at the top of the Services tab before any mixing begins. Shares the cached query — no duplicate API calls. Read-only on this tab; editing stays on the Client tab.

