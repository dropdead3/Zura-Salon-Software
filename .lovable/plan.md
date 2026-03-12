

# Assistant Prep Mode — Implementation Plan

## Current State

The codebase already has **partial prep mode support**:
- `MixSession` interface has `is_prep_mode`, `prep_approved_by`, `prep_approved_at` fields
- `PrepModeBanner` component exists with approve/pending UI
- `prep_mode_enabled` and `prep_approved` event types exist in `mix-session-service.ts`
- Session creation supports `mixed_by_staff_id` and `service_performed_by_staff_id` (dual staff roles)
- Prep mode toggle exists in `MixSessionManager`

What's **missing**:
1. Bowl-level prep states (`prepared_by_assistant`, `awaiting_stylist_approval`)
2. Assistant-specific event types for granular tracking
3. Stylist review workflow with Adjust/Discard actions on prepared bowls
4. Assistant daily prep dashboard view
5. Proper bowl state machine extensions

## Architecture

```text
Assistant opens appointment
  → Enables Prep Mode toggle (existing)
  → Creates session with mixed_by_staff_id = assistant
  → Prepares bowls → status: prepared_by_assistant
  → Session enters awaiting_stylist_approval state

Stylist opens same appointment
  → Sees PrepModeBanner (existing, enhanced)
  → Reviews each bowl: Approve / Adjust / Discard
  → Approved bowls → status: open (editable)
  → Session transitions to active
```

## Implementation

### 1. Bowl State Machine Extensions

Add two new statuses to `MixBowlStatus`:

```
prepared_by_assistant → awaiting_stylist_approval → open → sealed → reweighed
                                                  → discarded
prepared_by_assistant → discarded
```

New transitions in `bowl-state-machine.ts`:
- `prepared_by_assistant` → `awaiting_stylist_approval`, `discarded`
- `awaiting_stylist_approval` → `open` (approved), `discarded`

Add helpers: `isPreparedBowl()`, `isAwaitingApproval()`

### 2. Session State Machine Extensions

Add `awaiting_stylist_approval` to `MixSessionStatus`:
- `draft` → `awaiting_stylist_approval` (when assistant finishes prep)
- `awaiting_stylist_approval` → `active` (stylist approves)
- `awaiting_stylist_approval` → `cancelled`

### 3. New Event Types

Add to `mix-session-service.ts`:
- `assistant_prep_started`
- `assistant_bowl_prepared`
- `stylist_bowl_approved`
- `stylist_bowl_adjusted`
- `assistant_prep_discarded`

Add these to `VALID_EVENTS_BY_STATUS.draft` and a new `awaiting_stylist_approval` status entry.

### 4. Enhanced PrepModeBanner + Stylist Review UI

Extend `PrepModeBanner` to show per-bowl review when session is in `awaiting_stylist_approval`:
- Each prepared bowl shows formula, weights, assistant name
- Three actions per bowl: **Approve**, **Adjust Formula**, **Discard**
- "Approve All" bulk action
- Approval transitions bowl `awaiting_stylist_approval` → `open`, emits `stylist_bowl_approved`
- Adjust opens bowl editor with pre-filled lines, emits `stylist_bowl_adjusted`

Create `src/components/dashboard/backroom/StylistBowlReview.tsx` for the per-bowl review card.

### 5. Assistant Daily Prep View

Create `src/components/dashboard/backroom/AssistantDailyPrep.tsx`:
- Fetches today's appointments that have color/chemical services
- Shows list: time, service name, client name, suggested formula (via `resolveFormulaMemory`)
- "Start Prep" action per appointment opens `MixSessionManager` in prep mode
- Wire into dashboard for assistant role users

Create hook `src/hooks/backroom/useAssistantDailyPrep.ts`:
- Queries today's appointments with service types requiring mixing
- Cross-references with existing mix sessions to show prep status

### 6. Integration Updates

**`MixSessionManager.tsx`**: 
- When `is_prep_mode` and assistant finishes adding bowls, add "Submit for Review" button that transitions session to `awaiting_stylist_approval`
- When stylist opens a session in `awaiting_stylist_approval`, show `StylistBowlReview` instead of normal bowl cards

**`BackroomTab.tsx`**: No changes needed (already passes through correctly).

### 7. Database Migration

Add columns to `mix_bowls` table:
- `prepared_by_staff_id` (uuid, nullable) — tracks which assistant prepared the bowl

No new tables needed.

## Build Order

1. Extend bowl state machine with new statuses
2. Extend session state machine with `awaiting_stylist_approval`
3. Add new event types to `mix-session-service.ts`
4. Database migration: add `prepared_by_staff_id` to `mix_bowls`
5. Create `StylistBowlReview.tsx` component
6. Update `PrepModeBanner` for per-bowl review
7. Update `MixSessionManager` for submit-for-review flow
8. Create `useAssistantDailyPrep` hook
9. Create `AssistantDailyPrep` dashboard component

## Edge Cases

| Case | Handling |
|---|---|
| Stylist changes service after prep | Prepared bowls remain; stylist can discard and re-prep |
| Assistant prep abandoned | Session stays in draft/awaiting; no auto-cleanup |
| Stylist adjusts formula | `stylist_bowl_adjusted` event logged, bowl transitions to `open` with modified lines |
| Multiple assistants prep same appointment | Second assistant sees existing prep session |
| No formula available for prep | Assistant manually adds products (no SmartMixAssist bypass) |

