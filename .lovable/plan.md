

# Assistant Time Block Calendar -- Gaps and Enhancements Analysis

## Your Prompt Feedback

Strong instinct to pressure-test before building. Asking "what else connects to this?" is exactly how you prevent orphaned features. One refinement: frame it as "what existing surfaces need to *consume* this new data?" -- that catches display gaps that pure architecture reviews miss.

---

## Gap 1: Notification Flow for Assistants

**Problem**: The current `appointment_assistants` system sends an in-app notification when assigned. Time blocks need the same -- or better.

**Enhancement**: When a stylist requests a time block and names a specific assistant, fire a notification with accept/decline actions. If left as "any available," notify all eligible assistants in that location.

**Impact**: Without this, assistants won't know they've been requested unless they're staring at the calendar.

---

## Gap 2: DayView Card Rendering -- Assistant's Perspective

**Problem**: Today, DayView renders appointment cards in the *lead stylist's* column with "w/ AssistantName" badges. But there's no indication in the *assistant's own column* that they have a time block obligation.

**Enhancement**: Render a semi-transparent "assist block" in the assistant's DayView column -- similar to how Block/Break categories render with the hatched pattern, but using a distinct visual (e.g., dashed border, muted primary tint, with the requesting stylist's name). This reuses the existing `getEventStyle()` positioning logic.

**Files affected**: `DayView.tsx` (new overlay layer), `Schedule.tsx` (pass time block data down)

---

## Gap 3: WeekView and AgendaView Parity

**Problem**: The plan targets DayView only. WeekView and AgendaView also display appointment data and assistant badges. If an assistant views their week, they won't see their time block obligations.

**Recommendation**: Phase 1 focuses on DayView. Phase 2 extends to WeekView (compact block indicators in the weekly grid) and AgendaView (list items for the assistant's blocks). This is acceptable as long as the plan document explicitly marks it as deferred -- which it does.

---

## Gap 4: Conflict Detection for Assistants

**Problem**: The existing `useAssistantConflictCheck` hook checks whether an assistant has overlapping appointments when being assigned. Time blocks need the same treatment -- if an assistant already has a confirmed time block with Stylist A from 10-12, requesting them for Stylist B at 11-1 should show a conflict warning.

**Enhancement**: Extend conflict detection to query `assistant_time_blocks` in addition to `phorest_appointments` and `appointment_assistants`.

---

## Gap 5: Relationship to Existing `appointment_assistants` Table

**Problem**: Two systems will coexist -- per-appointment assistant assignments and time-block-based scheduling. This creates potential confusion: "Is the assistant assigned to this appointment, or do they just have a time block that overlaps?"

**Recommendation**: Time blocks are the *scheduling* mechanism (when to show up). Per-appointment assignments remain the *attribution* mechanism (who helped on what, for reporting/payroll). Both can coexist cleanly if the UI makes the distinction clear. The appointment detail panel should show both: "Assistants on this appointment" (from `appointment_assistants`) and "Assistants scheduled during this window" (from `assistant_time_blocks`).

---

## Gap 6: QuickBookingPopover and Booking Wizard Integration

**Problem**: When booking a new appointment via `QuickBookingPopover`, there's no surface to request assistant coverage for that booking. Currently, assistants are assigned *after* the appointment exists.

**Enhancement (Phase 2)**: Add an optional "Request Assistant" toggle at the end of the booking flow. When enabled, it auto-creates a time block matching the new appointment's time window. This is a convenience shortcut, not a blocker for Phase 1.

---

## Gap 7: AddTimeBlockForm Reuse

**Problem**: `AddTimeBlockForm.tsx` already handles Break/Block creation with stylist selection, duration presets, and reason codes. The assistant time block request form has similar UX needs (time range, optional notes, stylist picker).

**Enhancement**: Consider building `RequestAssistantPanel.tsx` as a sibling component that shares the same time-picker patterns and duration preset logic, rather than duplicating it. The key difference is that assistant blocks need a *requesting stylist* context (auto-filled from the column clicked) and a *target assistant* picker (optional).

---

## Gap 8: Appointment Card Tooltip Enhancement

**Problem**: When hovering over an appointment card, there's no indication that an assistant time block covers this window.

**Enhancement**: In the expanded card tooltip (DayView), add a subtle "Assistant scheduled" indicator when a confirmed time block overlaps. This gives the lead stylist confidence that help is coming without opening the detail panel.

---

## Enhancement Summary Table

| Enhancement | Phase | Priority | Effort |
|---|---|---|---|
| Notification flow for time block requests | 1 | High | Low (reuse existing notification insert pattern) |
| Assistant column overlay in DayView | 1 | High | Medium (new render layer) |
| Conflict detection across time blocks | 1 | High | Low (extend existing hook) |
| Coexistence clarity (appointment_assistants vs time blocks) | 1 | Medium | Low (UI labeling) |
| Reuse AddTimeBlockForm patterns | 1 | Medium | Low (shared components) |
| Card tooltip "assistant scheduled" indicator | 1 | Low | Low |
| WeekView/AgendaView parity | 2 | Medium | Medium |
| Booking flow "Request Assistant" shortcut | 2 | Low | Medium |

---

## Recommendation

Ship Phase 1 with: database table, DayView overlay, request panel, notifications, and conflict detection. Defer WeekView/AgendaView parity and booking flow integration to Phase 2. The existing `appointment_assistants` table stays intact -- it serves a different purpose (attribution) than time blocks (scheduling).

