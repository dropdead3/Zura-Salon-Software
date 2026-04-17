

## Prompt review

Sharp instinct — surfacing unread inspiration photos as a badge on the Photos tab closes the awareness loop. Without it, stylists won't know new pre-visit context arrived. This is exactly the kind of "calm but unmissable" signal the platform should provide: silent until there's something material, then clearly flagged.

Tighter framing for next time: when asking for a notification, specify (a) the *trigger* (new photo uploaded vs photo never viewed), (b) the *audience* (per-user vs per-org), and (c) the *clear signal* (auto-clear on tab open vs manual dismiss). I'll propose sensible defaults below — flag if you want different.

**Proposed defaults:**
- **Trigger**: photo exists for this client and the current user has never opened the Photos tab for this appointment
- **Audience**: per-user (each staff member sees the badge until they personally view)
- **Clear signal**: auto-clear when the user opens the Photos tab on this appointment

## Findings

- Photos tab is rendered inside `AppointmentDetailSheet.tsx` (`TabsTrigger value="photos"`).
- `useClientInspirationPhotos(clientId)` already returns photos with `uploaded_at` — perfect for "newest photo timestamp" comparison.
- `NavBadge.tsx` exists as a destructive-styled count badge — matches the platform's notification visual language.
- No existing per-user "viewed appointment artifact" tracking table.

## Plan

### 1. Database — track per-user views (lightweight)

New table `appointment_tab_views` (per-user, per-appointment, per-tab):
- `id`, `user_id`, `appointment_id`, `tab_key` (e.g. `'photos'`), `last_viewed_at`, `created_at`
- Unique constraint on `(user_id, appointment_id, tab_key)`
- RLS: users can only see/upsert their own rows

### 2. Hook — `useUnviewedInspirationPhotos`

Returns `{ unviewedCount: number }` for a given appointment + client.
- Query inspiration photos for the client (reuse existing hook)
- Query the user's last view timestamp from `appointment_tab_views` for this appointment + `'photos'` tab
- Count photos where `uploaded_at > last_viewed_at` (or all photos if never viewed)

### 3. Hook — `useMarkAppointmentTabViewed`

Mutation that upserts `appointment_tab_views` with `last_viewed_at = now()`. Called when the Photos tab is opened.

### 4. UI — badge on Photos tab + auto-clear

In `AppointmentDetailSheet.tsx`:
- Render a small count badge (using `NavBadge` styling) on the Photos `TabsTrigger` when `unviewedCount > 0`
- When `activeTab === 'photos'` (via `onValueChange` or effect), call the mark-viewed mutation
- Invalidate the unviewed-count query after marking

### 5. Visual treatment

- Small destructive-pink dot or count chip aligned to the top-right of the Photos tab pill
- Uses existing `NavBadge` pattern — calm, not flashy
- Disappears immediately on tab open (optimistic update)

## Acceptance checks

1. New client uploads inspiration photos → badge appears on Photos tab for all staff who haven't viewed it
2. Staff opens Photos tab → badge clears for that user only (other staff still see it until they view)
3. No badge when client has zero inspiration photos
4. No badge when user has already viewed the tab and no new photos have been added since
5. New photo uploaded after a user previously viewed → badge reappears with count of new photos only
6. Badge count caps visually at "9+"
7. RLS prevents cross-user view tracking leakage
8. No regression to other tabs or existing tab behavior
9. Light + dark mode render the badge cleanly

## Files to modify / create

**Database (migration):**
- New table `appointment_tab_views` + RLS policies + indexes

**Hooks (new):**
- `src/hooks/useUnviewedInspirationPhotos.ts`
- `src/hooks/useMarkAppointmentTabViewed.ts`

**UI:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — render badge on Photos `TabsTrigger`; mark viewed when tab opens

