

## Wire Up Client Review Data in Appointment Detail Drawer

Good prompt -- you're connecting feedback data to its operational context, which is exactly how intelligence surfaces should work. One improvement: specifying where in the drawer you want this (Summary tab near Client Info makes most sense) would save a round-trip.

### Current State

- `client_feedback_responses` table exists with `client_id` (references `phorest_clients.id`), `overall_rating`, `nps_score`, `responded_at`, `comments`, `appointment_id`
- The drawer already resolves `phorest_client_id` to a `phorest_clients.id` via `resolvedClientId`
- No review data is currently surfaced in the appointment drawer

### Plan

#### 1. Create hook: `src/hooks/useClientReviewHistory.ts`

A new query hook that fetches all completed feedback responses for a given `client_id` (phorest_clients UUID):

```typescript
queryKey: ['client-reviews', clientId]
queryFn: select responded_at, overall_rating, nps_score, comments, appointment_id
  from client_feedback_responses
  where client_id = clientId and responded_at is not null
  order by responded_at desc
```

Returns array of reviews plus a computed summary: `totalReviews`, `averageRating`, `lastReviewDate`.

#### 2. Modify `AppointmentDetailDrawer.tsx`

**Add query** (after the `resolvedClientId` query, ~line 104): Call `useClientReviewHistory(resolvedClientId)` to get the client's review history.

**Add "Client Reviews" section** in the Summary tab, between Client Info and the Separator (~line 289). This will be a compact card showing:

- If reviews exist:
  - Star icon + "X Reviews" with average rating (e.g., "3 Reviews · Avg 4.7 ★")
  - Last review date (e.g., "Last: Feb 20, 2026")
  - Days relative to this appointment (e.g., "4 days after appointment" or "2 days before appointment") -- computed by comparing `responded_at` of the most recent review against `appointment.appointment_date`
  - If the most recent review has `comments`, show a truncated preview

- If no reviews: A subtle muted line "No reviews on file" (similar to the "No retail items" pattern)

The section will use a small `rounded-lg border border-border bg-muted/30 p-3` card (same style as the promo card) to visually separate it.

#### 3. Relative Day Calculation

For each review, compute `differenceInDays(reviewDate, appointmentDate)`:
- Positive = review came after appointment → "X days after visit"
- Negative = review came before visit → "X days before visit"  
- Zero = "Same day as visit"

This uses `date-fns` `differenceInCalendarDays` which is already imported.

### Technical Details

| File | Change |
|---|---|
| `src/hooks/useClientReviewHistory.ts` | New hook -- fetches feedback responses for a client, returns reviews + summary |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Add review query + render review card in Summary tab after Client Info |

No database changes needed -- the `client_feedback_responses` table already has all required columns and RLS policies for org members.

### Enhancement Suggestions

- Surface the specific review tied to THIS appointment (match on `appointment_id`) with a highlighted treatment
- Add a "Request Review" action button for completed appointments that haven't received feedback yet

