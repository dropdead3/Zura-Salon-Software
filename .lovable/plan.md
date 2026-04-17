

## Prompt review

Solid continuation prompt — short, contextual, references the open drawer in the screenshot. Even sharper next time: name the *one thing* you want fixed first ("Stylist section duplicates the same person") instead of "continue working." That gets a focused single-pass fix instead of a multi-area sweep. For broader cleanups like this, "audit + propose" framing is fine — what you did — but flag the highest pain point so it gets the most attention.

## Plan — Wave 18: Appointment Detail Drawer Cleanup (P0/P1)

**Doctrine anchor:** `phorest-decoupling-and-zura-native-operations` + `high-concurrency-scalability`.

### Findings (from screenshot + code audit)

| # | Finding | Where | Pri |
|---|---|---|---|
| 1 | Stylist block renders **two rows for the same person** ("Alexis (Booked)" + "Alexis Heasley (Preferred)") because preferred-stylist row prints whenever a preferred stylist exists, with no identity-collapse | `AppointmentDetailSheet.tsx` ~L1677-1706 | **P0** |
| 2 | Total ($125.30) ≠ services subtotal ($135.00) with **no explanation of the delta** (discount? tax? tip? deposit applied?) | ~L1580-1587 | **P0** |
| 3 | Client Contact only shows email (often `na@gmail.com` placeholder); phone/last-visit/visit-count/CLV not consolidated; no "missing data" hint | ~L1814-1845 | **P0** |
| 4 | No quick-actions row — Call / Text / Email / Rebook / Send-to-Pay all live deep in tabs or kebab menu | header area ~L1413 | **P0** |
| 5 | Drawer fires **~12 queries on open** (clientRecord, visitHistory, householdData, clientNotes, appointmentNotes, assistants, serviceAssignments, auditLog, unviewedPhotos, locationData, linkedRedos, matchedClient) — most for tabs not yet visible | full file | **P0** |
| 6 | History/Notes/Photos/Color Bar tab content always mounted via `TabsContent` (Radix renders all by default unless `forceMount={false}` + lazy) | ~L1978-2236 | **P1** |
| 7 | History tab: no empty state guidance; Photos tab: no count summary; Notes tab: identical card pattern duplicated 3× (could share a `<NoteCard>` component) — render cost + maintenance | tabs section | **P2** (deferred) |

### Implementation plan

**Fix #1 — Collapse stylist duplication:**
- Compute `isSameAsPreferred = preferredStylist?.user_id === appointment.stylist_user_id` (also tolerate name match fallback)
- When same: render **one** row showing the stylist with **both badges** ("Booked" + green "Preferred")
- When different: keep current two-row layout (booked on top, preferred below with mismatch/preferred badge)
- Drop the redundant Star-icon row when it would just repeat the same person

**Fix #2 — Total/pricing breakdown:**
- Replace the single Total row with a **detail breakdown** when totals don't match the services sum:
  - Subtotal: $135.00
  - Discount (if any): -$X.XX
  - Tax (if any): +$X.XX
  - Tip (if any): +$X.XX
  - **Total: $125.30**
- Pull the deltas from the appointment record (discount/tax/tip fields if present) or from the matched transaction (`matchedClient` query already loaded)
- If only `total_price` is known and no breakdown data exists, show a tiny "i" tooltip: *"Total reflects POS-applied discounts or tax. Open in POS for full breakdown."*

**Fix #3 — Client Contact completeness:**
- Add fields in priority order: **Phone** (call + text), **Email** (mailto + copy), **Last visit + visit count** (already loaded via `visitHistory`), **CLV tier** (if available on `clientRecord`)
- Detect placeholder emails (regex: `/^(na|none|noemail|test)@/i` or empty domain) → render as muted with "Add real email" link to client profile
- Single empty state: "No contact info — Add details in client profile" CTA

**Fix #4 — Quick actions row (under header, above tabs):**
- 5 pill buttons using `tokens.button.cardAction`: **Call** (tel:), **Text** (sms:), **Email** (mailto:), **Rebook** (calls existing `onRebook`), **Send to Pay** (mounts existing `<SendToPayButton>` inline)
- Disabled state when source data missing (no phone → Call/Text disabled with tooltip)
- Sits in a single horizontal row; on narrow drawers wraps to 2 rows

**Fix #5 — Lazy tab content (perf):**
- Move expensive per-tab queries behind `enabled: activeTab === 'X'`:
  - `useClientVisitHistory` → `enabled: activeTab === 'history' || activeTab === 'details'` (Details uses last-visit, History uses full list)
  - `useAuditLog` → `enabled: activeTab === 'history'`
  - `useUnviewedInspirationPhotos` → keep on (needed for badge)
  - `useAppointmentNotes` → `enabled: activeTab === 'notes' || activeTab === 'details'` (Details preview shows 2 most recent)
- Add `staleTime: 60_000` on `clientRecord`, `householdData`, `linkedRedos`, `matchedClient`, `serviceAssignments` (all rarely change mid-session)

**Tabs content audit (light-touch this wave):**
- History tab: add empty-state copy ("First visit with you — no history yet")
- Photos tab: add count summary at top
- Notes tab: keep as-is structurally; note shared component as deferred refactor

### Acceptance checks

1. When booked stylist == preferred stylist: only **one** stylist row with both badges
2. When totals differ from services sum: breakdown rows render; when matched: only single Total
3. Client Contact shows phone, email, last visit, visit count; placeholder emails called out
4. Quick actions row visible directly under header status bar; disabled states tooltip-explained
5. Switching tabs only fires that tab's heavy queries; cold drawer open issues fewer parallel requests
6. Tests still 111/111
7. Logged in `DEBUG_LOG.md` as Wave 18 with leverage marker

### Files to modify

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — stylist collapse, total breakdown, contact section, quick actions row, tab gating
- `src/hooks/useClientVisitHistory.ts` — accept `enabled` option
- `src/hooks/useAppointmentAuditLog.ts` — accept `enabled` option
- `src/hooks/useAppointmentNotes.ts` — accept `enabled` option
- `DEBUG_LOG.md` — Wave 18 findings + ranked register

### Deferred (with trigger conditions)

- **P2 #7** (shared `<NoteCard>` for note rendering, duplicated 3× in file) — trigger: next time we add note features (mentions, reactions, edit-in-place)
- **P2** (split `AppointmentDetailSheet.tsx` 2,650 LOC into per-tab files) — trigger: file crosses 3,000 LOC OR a third tab gets added
- **P2** (replace the 4-segment lifecycle bar with a single rich timeline including timestamps from `auditEntries`) — trigger: when audit log surfaces in Wave 18 perf gating still feels useful enough to expose visually

