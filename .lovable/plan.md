

## Prompt review

Sharp instinct — the copy "No client linked" reads as a contradiction when the header literally shows "ERIC DAY." From the operator's perspective: *"There's clearly a client there — what do you mean not linked?"* The system is technically correct (no `phorest_client_id` foreign key) but the language exposes internal data plumbing instead of explaining the actual situation. Sharper next time: add the diagnostic context you already had ("the name shows but the message says no client") — that framing makes the bug obvious in one sentence. You did this well.

## Diagnosis

`AppointmentDetailSheet.tsx` L2443:
```tsx
{appointment.phorest_client_id ? (
  <InspirationPhotosSection ... />
) : (
  <h3>No client linked</h3>
  <p>Link a client to this appointment to add transformation photos.</p>
)}
```

Two separate issues:

**1. Inaccurate copy.** When `client_name` exists but `phorest_client_id` does not (manual entry, walk-in with name, pre-CRM client), the message implies the appointment is empty. It should distinguish "no client at all" (true walk-in) from "named client not linked to a CRM record" (the Eric Day case).

**2. Missed fuzzy match.** At L1047 the file already computes `resolvedClientId = appointment?.phorest_client_id || matchedClient` (fuzzy match by phone). The Photos tab at L2443 ignores this — so even when we *can* resolve the client by phone, we still show the empty state. Other tabs (Color Bar history L2475, ClientMemoryPanel L1596) also pass the raw `phorest_client_id`, but Photos is the only one with a hard "No client linked" wall.

## Plan — Wave 22.22: Photos tab — accurate empty state + fuzzy-match resolution

### Fix 1 — Use `resolvedClientId` instead of raw `phorest_client_id`

`AppointmentDetailSheet.tsx` L2443:
```tsx
{resolvedClientId ? (
  <>
    <InspirationPhotosSection clientId={resolvedClientId} />
    <TransformationTimeline clientId={resolvedClientId} phorestClientId={resolvedClientId} />
  </>
) : ( /* empty state */ )}
```

This automatically picks up walk-ins whose phone matches an existing client — no extra UI needed.

### Fix 2 — Three-state empty copy

Replace the single "No client linked" branch with three clearer states:

```tsx
) : appointment.client_name ? (
  // Named but not linked to CRM
  <div className={tokens.empty.container}>
    <Camera className={tokens.empty.icon} />
    <h3 className={tokens.empty.heading}>{appointment.client_name} isn't in your client list yet</h3>
    <p className={tokens.empty.description}>
      Add {appointment.client_name.split(' ')[0]} as a client to start tracking transformation photos.
    </p>
    {/* Optional: <Button onClick={handleLinkClient}>Add Client</Button> */}
  </div>
) : (
  // True walk-in, no name at all
  <div className={tokens.empty.container}>
    <Camera className={tokens.empty.icon} />
    <h3 className={tokens.empty.heading}>Walk-in appointment</h3>
    <p className={tokens.empty.description}>
      Add client details to this appointment to track transformation photos.
    </p>
  </div>
)
```

### Optional — Add a "Link / Create Client" CTA

Defer for now (P3) unless you want it in this wave. The rename + fuzzy match resolves 90% of the confusion; the CTA is the next step.

### Acceptance checks

1. Eric Day appointment (named, no `phorest_client_id`, no phone match) shows: **"Eric Day isn't in your client list yet"** instead of "No client linked"
2. Walk-in with phone that matches an existing client (fuzzy match hits) → Photos render normally
3. True walk-in (no name, no phone) shows: **"Walk-in appointment"**
4. Linked appointment (has `phorest_client_id`) → Photos render unchanged
5. Notes/History tabs unaffected (no copy churn outside Photos)

### Files

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — single block swap at L2442–2458 (use `resolvedClientId` + three-state empty copy)

### Open question

None — going with rename + fuzzy match. Tell me if you also want the inline "Add Client" CTA in this wave.

### Deferred

- **P3** Add inline "Add to client list" button on the named-but-unlinked empty state, opening the existing client-create flow pre-filled with `client_name` / `client_phone` / `client_email`. Trigger: after this ships and operators ask for a one-click path.
- **P3** Apply the same `resolvedClientId` pattern to Color Bar history (L2475) and any other surface still gating on raw `phorest_client_id`. Trigger: audit after this wave.

