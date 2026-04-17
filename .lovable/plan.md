

## Prompt review

Clear consolidation ask — name the surface (appt detail sheet), the two sections to merge (Client Contact + top Call/Text buttons), and the layout direction (buttons right of contact info). Sharper next time: tell me what to do with the **Rebook** button (keep it standalone at the top? move it elsewhere?) since it's currently grouped with Call/Text. I'll propose: keep Rebook at the top as the primary action, move only Call/Text down into the Client Contact row.

## Diagnosis

Two redundant contact surfaces in `AppointmentDetailSheet.tsx`:

1. **Top action row** (~lines 1531–1557): Call / Text / Rebook buttons stacked above the tabs
2. **Client Contact section** (lower in Details tab): Phone + email rows with a copy icon

Phone number appears twice in the same view. Consolidating into one row tightens the sheet and removes redundancy.

## Plan — Wave 22.6: Consolidate Client Contact with Call/Text actions

### Behavior

**Before:**
```
[Call] [Text] | [Rebook]
─── tabs ───
APPOINTMENT
SERVICES  
STYLIST
CLIENT CONTACT
  📞 +1 (480) 543-0240         [copy]
  ✉️ No email on file
```

**After:**
```
[Rebook]                    ← stays at top, primary action
─── tabs ───
APPOINTMENT
SERVICES
STYLIST
CLIENT CONTACT
  📞 +1 (480) 543-0240   [Call] [Text] [copy]
  ✉️ No email on file    [Email] (if email present)
```

### Fix shape

In `AppointmentDetailSheet.tsx`:

1. **Top action row**: Remove Call and Text buttons (and the divider). Keep Rebook as the standalone primary action — it's a distinct workflow, not a contact action.
2. **Client Contact section** (phone row): Add inline `[Call]` and `[Text]` buttons to the right of the phone number, before the existing copy icon. Use `tokens.button.inline` (sm size, pill) for compactness.
3. **Email row enhancement** (bonus, low cost): If email exists, add an inline `[Email]` button that opens `mailto:` (kept as native handoff since email composition is universally expected to launch the OS mail client; we can revisit if you want a Zura-native composer later).
4. **Keep dialog wiring**: Reuse the existing `callDialogOpen` / `textDialogOpen` state and `<ContactActionDialog>` instances added in Wave 22.5 — only the trigger location moves.
5. **Empty phone state**: If no phone, hide the Call/Text buttons (existing behavior preserved).

### Acceptance checks

1. Top action row shows only `[Rebook]` (no Call/Text)
2. Client Contact phone row shows: phone number → `[Call]` → `[Text]` → copy icon, all inline, vertically centered
3. Click `[Call]` → existing Zura call dialog opens
4. Click `[Text]` → existing Zura text dialog opens
5. Copy icon still copies number to clipboard
6. If `client_phone` is null → row hides entirely (no orphan buttons)
7. Buttons use `tokens.button.inline` and respect dark mode
8. No regression to History/Photos/Notes/Color Bar tabs
9. Mobile: row wraps cleanly if narrow (buttons drop below number, not clipped)

### Files

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — remove top Call/Text buttons, inline them into Client Contact phone row

### Open question

Should the **Rebook** button stay at the top as a standalone primary action, or also move down into a "client actions" cluster? My recommendation: keep at top — it's a workflow trigger, not a contact action, and deserves visual prominence.

### Deferred

- **P2** Zura-native email composer (subject templates + send via SendGrid/org SMTP, log to `client_communications`) — trigger: when staff request branded outbound email
- **P2** Inline communication log preview under Client Contact ("Last text: 2d ago — 'Confirming your 4pm'") — trigger: after `client_communications` accumulates data

