

## Review System Gap Analysis and Enhancement Roadmap

Your review infrastructure is well-architected -- you have the full pipeline from request to gate to external share to low-score alerting. Here are the gaps and enhancements worth considering, ranked by operational leverage.

### Gap 1: No Automated Feedback Request Trigger

The `send-feedback-request` edge function exists but is never called automatically. There is no trigger after an appointment is marked completed. Today, sending a feedback request requires manual invocation.

**Enhancement:** Add a "Request Review" button on completed appointments in the drawer (when no feedback response exists for that `appointment_id`). Longer term, wire up automatic dispatch via the `process-client-automations` or a scheduled function that fires X hours after appointment completion.

### Gap 2: No "Request Review" CTA in Appointment Drawer

The drawer now shows review history but has no action to request one. For completed appointments with no linked feedback response, a subtle "Request Feedback" ghost button below the review card would close the loop.

### Gap 3: Appointment-Specific Review Highlighting

`useClientReviewHistory` returns all reviews for a client but doesn't flag which review (if any) belongs to THIS appointment. Matching on `appointment_id` would let you show "Review for this visit" with distinct treatment vs. historical reviews.

### Gap 4: Feedback Response Rate / Conversion Tracking

The table tracks `external_review_clicked` and `passed_review_gate`, but no dashboard surface aggregates these into conversion metrics:
- Requests sent → Responded (response rate)
- Responded → Passed gate (quality rate)
- Passed gate → Clicked external (conversion rate)

This is a funnel that belongs on the Feedback analytics page.

### Gap 5: Staff-Level Review Attribution

`client_feedback_responses` has `staff_user_id` but no surface aggregates reviews per staff member. A stylist-level review summary (average rating, NPS, total reviews) would be high-value for performance coaching and the Weekly Intelligence Brief.

### Gap 6: Review Expiry / Stale Token Cleanup

Tokens expire after 7 days (`expires_at`), but there's no cleanup or re-send mechanism. Expired unfilled requests represent lost signal. Consider:
- A scheduled function to mark expired tokens
- A "Resend" action for expired-but-unanswered requests

### Gap 7: Client Directory Integration

The client profile/directory page doesn't surface review history. The same `useClientReviewHistory` hook could power a "Reviews" section on the client detail page, not just the appointment drawer.

### Gap 8: Review Sentiment in Weekly Intelligence Brief

The `lever-engine` and `weekly-digest` functions don't incorporate feedback signals. NPS drift, low-score spikes, or declining review response rates are high-confidence levers that belong in the Weekly Intelligence Brief.

### Suggested Priority Order

| Priority | Enhancement | Complexity |
|---|---|---|
| 1 | "Request Feedback" button on completed appointments | Low |
| 2 | Highlight THIS appointment's review in drawer | Low |
| 3 | Feedback funnel conversion dashboard | Medium |
| 4 | Staff-level review aggregation | Medium |
| 5 | Auto-send feedback request after completion | Medium |
| 6 | Client Directory review section | Low |
| 7 | Token expiry cleanup + resend | Low |
| 8 | Review signals in Weekly Intelligence Brief | High (Phase 2) |

