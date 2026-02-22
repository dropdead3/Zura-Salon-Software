

# Phase 5: Deferred Items Build + Gap Analysis

## Summary

This phase implements the four deferred items from Phase 4, then performs a comprehensive gap analysis. The deferred items are: (1) push/email notifications for assistant blocks, (2) auto-suggestion algorithm, (3) interactive block resizing in DayView, and (4) assistant utilization analytics card.

---

## Change 1: Push and Email Notifications for Assistant Time Blocks

**Problem**: Assistant block events (creation, acceptance, decline) only generate in-app notifications. Users who are not actively looking at the app miss time-sensitive coverage requests.

**What changes**:

**File**: `src/hooks/useAssistantTimeBlocks.ts`
- After inserting in-app notifications (both for direct assignment and pool notifications), invoke the existing `send-push-notification` edge function for each target user with title/body/url pointing to `/dashboard/schedule`
- This reuses existing push infrastructure (`push_subscriptions` table, `send-push-notification` function, `usePushNotifications` hook)

**File**: New edge function `supabase/functions/notify-assistant-block/index.ts`
- Accepts `{ block_id, event_type, actor_user_id }` where event_type is `created`, `accepted`, or `declined`
- Fetches the block, determines notification targets
- Sends push notification via the same Web Push logic already in `send-push-notification`
- Sends email via `sendOrgEmail` to the target user(s) with a simple template: block details + link to schedule
- Handles rate limiting: no duplicate notifications for the same block within 5 minutes

---

## Change 2: Auto-Suggestion Algorithm for Assistant Assignment

**Problem**: When a coverage request is created without a specific assistant, there is no intelligent suggestion for who the best match is. The system currently shows "Any available assistant" and relies on manual selection or pool notification.

**What changes**:

**File**: New hook `src/hooks/useAssistantAutoSuggest.ts`
- Given a `locationId`, `date`, `startTime`, `endTime`, returns a ranked list of suggested assistants
- Ranking criteria (weighted):
  1. Is scheduled at this location on this day (from `employee_location_schedules`) -- highest weight
  2. Has no overlapping appointments or time blocks (conflict-free) -- required
  3. Historical acceptance rate: count of `confirmed` blocks vs total assigned blocks -- tiebreaker
  4. Workload balance: fewer confirmed blocks today = higher rank -- tiebreaker
- Returns `Array<{ user_id, name, photo_url, score, reasons: string[] }>`

**File**: `src/components/dashboard/schedule/RequestAssistantPanel.tsx`
- Import `useAssistantAutoSuggest` and show a "Suggested" badge next to the top-ranked assistant in the picker
- If only one assistant scores well, auto-select them with a note: "Auto-suggested based on availability and history"

---

## Change 3: Interactive Block Resizing in DayView

**Problem**: Once created, assistant time blocks cannot be visually resized on the calendar. Users must delete and recreate to adjust timing.

**What changes**:

**File**: `src/components/dashboard/schedule/AssistantBlockOverlay.tsx`
- Add a bottom-edge drag handle (a thin bar at the bottom of each overlay block)
- On drag, calculate the new `end_time` based on pixel offset, snapping to 15-minute increments
- On drag end, call `updateBlock` mutation with the new `end_time`
- Only show the drag handle when the current user is the requester and the block is not yet confirmed
- Visual feedback: ghost outline showing the new end time during drag

**File**: `src/hooks/useAssistantTimeBlocks.ts`
- Extend the `updateBlock` mutation to also accept `start_time` and `end_time` fields

---

## Change 4: Assistant Utilization Analytics Card

**Problem**: There is no visibility into how effectively the assistant system is being used -- acceptance rates, coverage hours, response times.

**What changes**:

**File**: New component `src/components/dashboard/analytics/AssistantUtilizationCard.tsx`
- A standard analytics card (PinnableCard wrapper, design token compliance) showing:
  - Total requests (last 30 days)
  - Acceptance rate (confirmed / total)
  - Average response time (time between creation and status change)
  - Coverage hours (sum of confirmed block durations)
  - Top assistants (ranked by confirmed hours)
- Uses a new hook `useAssistantUtilizationStats`

**File**: New hook `src/hooks/useAssistantUtilizationStats.ts`
- Queries `assistant_time_blocks` with date range filter
- Aggregates:
  - `totalRequests`: count all
  - `acceptedRequests`: count where status = 'confirmed'
  - `acceptanceRate`: accepted / total
  - `totalCoverageMinutes`: sum of (end_time - start_time) for confirmed blocks
  - `avgResponseMinutes`: average of (updated_at - created_at) for confirmed blocks
  - `topAssistants`: group by assistant_user_id, sum confirmed hours, join profiles

**File**: Register in the Analytics Hub page under a relevant tab (Team or Operations)

---

## Change 5: Gap Analysis Pass (Post-Build)

After implementing Changes 1-4, perform a full audit:

**Data Completeness**:
- Verify `organization_id` filtering is present on all new queries
- Confirm notification deduplication prevents spam
- Validate utilization stats handle edge cases (zero blocks, null times)

**UX Polish**:
- Confirm drag resize has proper cursor feedback and snap indicators
- Verify auto-suggest badge uses design tokens (not raw classes)
- Ensure analytics card follows card header canon (icon box + title + MetricInfoTooltip)
- Check push notification permission prompt UX

**Action Flow**:
- Verify email notifications include unsubscribe links (via existing `sendOrgEmail`)
- Confirm drag resize triggers conflict check before saving
- Validate auto-suggest does not override explicit user selection

---

## Technical Details

### Files Created

| File | Purpose |
|---|---|
| `supabase/functions/notify-assistant-block/index.ts` | Push + email notifications for block events |
| `src/hooks/useAssistantAutoSuggest.ts` | Ranked assistant suggestion algorithm |
| `src/hooks/useAssistantUtilizationStats.ts` | Aggregated utilization metrics |
| `src/components/dashboard/analytics/AssistantUtilizationCard.tsx` | Analytics card component |

### Files Modified

| File | Changes |
|---|---|
| `src/hooks/useAssistantTimeBlocks.ts` | Call notify edge function on block create/accept/decline; extend updateBlock with time fields |
| `src/components/dashboard/schedule/RequestAssistantPanel.tsx` | Add auto-suggest badge to picker |
| `src/components/dashboard/schedule/AssistantBlockOverlay.tsx` | Add bottom-edge drag resize handle |
| `src/components/dashboard/schedule/AssistantBlockActions.tsx` | Call notify edge function on accept/decline |
| Analytics Hub page | Register AssistantUtilizationCard |

### Database Changes

- **Migration**: Add `assistant_time_blocks` to realtime publication (if not already present -- verify)
- No new tables required; utilization stats are computed from existing `assistant_time_blocks` data

### Dependencies

- No new npm packages; drag uses native pointer events (same pattern as appointment drag-and-drop)
- Email uses existing `sendOrgEmail` from `_shared/email-sender.ts`
- Push uses existing `send-push-notification` infrastructure

