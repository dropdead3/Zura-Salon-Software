## Zura Reputation Engine — Phased Build Plan

### What already exists (foundation, do NOT rebuild)

- **Tables**: `client_feedback_surveys`, `client_feedback_responses` (with rating, NPS, gate flag, manager_notified, display lifecycle for website publishing), `website_testimonials`
- **Public page**: `src/pages/ClientFeedback.tsx` — token-based 5-star + NPS form, gate logic, share screen, thank-you screen with manager follow-up branch
- **Settings**: `useReviewThreshold` (Google/Apple/Yelp/Facebook URLs at org level, gate threshold, follow-up threshold)
- **Edge functions**: `send-feedback-request` (creates token, emails client), `notify-low-score` (manager alert)
- **Admin**: `src/pages/dashboard/admin/FeedbackHub.tsx` (Overview, Responses, Settings tabs), `useNPSAnalytics`, `useStaffFeedbackStats`
- **Components**: `ReviewShareScreen`, `ReviewThankYouScreen`, `ReviewThresholdSettings`, `FeedbackResponseList`, `NPSScoreCard`

### What's missing vs. the spec (the actual work)

1. **Automation engine** — appointment.completed → delayed scheduling, frequency cap, service include/exclude, stylist filters, location-aware sender. Today, requests are manual.
2. **Recovery Inbox** — structured tasks for low scores with assignment, status lifecycle (New → Contacted → Resolved/Refunded/Redo Booked/Closed), resolution notes, AI-drafted response.
3. **Location-aware review links** — current links are org-level only. Spec requires per-location Google/Apple/Yelp/Facebook routing.
4. **Message templates with variables** — `[Client First Name]`, `[Stylist Name]`, etc., with per-location/per-service/per-stylist/per-state overrides.
5. **SMS channel** — only email exists today (Twilio connector available).
6. **Reputation dashboard** — full command-center view: velocity, CTR, response rate, at-risk count, recovery success rate, complaint/praise themes, location comparison.
7. **Compliance log** — audit trail of every send/click/recovery action, plus the in-app compliance banner.
8. **AI guardrails** — drafting helpers for templates and recovery responses with hard-coded refusal of gating/incentive/quota requests.

---

### Phase 1 — Recovery Inbox + Location Links + Automation Spine (THIS BUILD)

The minimum slice that makes the system feel like a "Reputation Engine" rather than a passive feedback form. Everything else (SMS, AI drafting, full dashboard, flow builder UI) is Phase 2+.

#### 1.1 Schema (one migration)

- **`recovery_tasks`** — id, organization_id, location_id, feedback_response_id (FK), client_id, appointment_id, staff_user_id, assigned_to (uuid), status (`new` | `contacted` | `resolved` | `refunded` | `redo_booked` | `closed`), priority (`urgent` | `high` | `normal`), resolution_notes, resolved_at, resolved_by, created_at, updated_at. RLS: org members read, managers/admins write.
- **`location_review_settings`** — id, organization_id, location_id (unique per org), google_review_url, apple_review_url, yelp_review_url, facebook_review_url, custom_review_url, custom_review_label, default_platform_priority (text[]). RLS: org admins manage, members read.
- **`review_request_automation_rules`** — id, organization_id, name, is_active, send_delay_minutes (int), eligible_service_categories (text[] nullable = all), excluded_service_categories (text[]), excluded_service_names (text[]), frequency_cap_days (default 90), stylist_inclusion_mode (`all` | `include` | `exclude`), stylist_user_ids (uuid[]), location_ids (uuid[] nullable = all), channel (`email` | `sms` | `both`), created_at, updated_at. RLS: org admins manage.
- **`review_compliance_log`** — id, organization_id, actor_user_id, event_type (`request_sent` | `request_clicked` | `feedback_submitted` | `external_link_clicked` | `recovery_created` | `recovery_resolved` | `rule_changed` | `template_changed`), feedback_response_id (nullable), recovery_task_id (nullable), payload jsonb, created_at. Append-only RLS: org admins read, system inserts.
- **Trigger**: when `client_feedback_responses.responded_at` is set AND `overall_rating <= privateFollowUpThreshold` AND no recovery_task exists for that response, INSERT a `recovery_tasks` row with priority derived from rating (1–2 = `urgent`, 3 = `high`).
- **Trigger**: when `recovery_tasks.status` changes to a terminal state, write a `review_compliance_log` entry.

#### 1.2 Public ClientFeedback page — fairness fix (compliance-critical)

The current page only shows public review options if `passes` the gate. The spec explicitly forbids this. Change to:
- **Always** show public review buttons after submission (per spec: "Do not hide public review links based on low rating")
- **Always also** trigger recovery workflow if below threshold (in parallel, not as a substitute)
- Resolve review URLs from `location_review_settings` first, falling back to `useReviewThreshold` org-level URLs
- Add a 1-line compliance footer: "All clients see public review options regardless of rating."

#### 1.3 Recovery Inbox page (new)

`src/pages/dashboard/admin/RecoveryInbox.tsx` route `/admin/feedback/recovery`.
- Bento card list grouped by status (New, In Progress, Resolved)
- Each row: client name, rating, stylist, service, appointment date, comments excerpt, age
- Drilldown drawer: full feedback, client history snippet (CLV, last visit), assignment dropdown, status lifecycle, resolution notes textarea
- Status changes write `review_compliance_log` automatically
- Tab added to `FeedbackHub.tsx`: "Recovery"

#### 1.4 Location Review Links page (new)

`src/pages/dashboard/admin/LocationReviewLinks.tsx` linked from FeedbackHub Settings tab.
- One card per location with the four URL inputs + custom URL
- Inherits from org defaults if blank
- Resolution helper: `resolveReviewLinks(locationId, orgId)` → location-specific then org-level fallback

#### 1.5 Automation Rules editor (UI scaffold)

`src/pages/dashboard/admin/ReviewAutomationRules.tsx`.
- List/create rules table; edit drawer with all filter fields
- "Test rule against last 50 completed appointments" preview button (read-only sim — Phase 1 just shows which would qualify; the cron scheduler that actually fires sends ships in Phase 2)
- This delivers the configuration surface; the dispatcher (cron + Twilio + per-rule eligibility) is Phase 2

#### 1.6 Compliance banner

Permanent banner at the top of `FeedbackHub` Settings tab with the exact spec copy. Non-dismissible (governance, not a notification).

#### 1.7 Memory updates

- New canon entry `mem://features/reputation-engine` covering the fairness rule (public links visible to ALL ratings), recovery lifecycle states, `review_compliance_log` as append-only audit, and the AI guardrails list.
- Update `mem://index.md` Core if a universal rule emerges (e.g. "Public review links must never be gated by rating").

---

### Phase 2 — Dispatcher, SMS, Templates (subsequent build)

- Cron job + edge function `dispatch-review-requests` (scans completed appointments, applies active rules, respects frequency cap, inserts pending requests into a queue)
- `review_message_templates` table + variable interpolation engine (`[Client First Name]`, etc.)
- Twilio SMS path via existing connector
- Channel selection + opt-out enforcement (already partially wired via `clientId` in `send-feedback-request`)

### Phase 3 — Reputation Dashboard + AI

- New `Reputation Overview` page with bento cards (velocity, CTR, response rate, at-risk count, complaint/praise themes via Lovable AI sentiment summarization, location comparison, stylist trends)
- AI helpers: template drafting, recovery response drafting, theme extraction — with hard-coded refusal of any prompt requesting review gating, incentive language, 5-star solicitation, or staff quotas
- AI must surface its draft for human approval; never auto-sends

### Phase 4 — Visual Flow Builder

- The "Trigger → Delay → Message → Rating → Follow-up → Internal Action" canvas builder — only worthwhile after Phase 2 dispatcher proves out the underlying primitives

---

### Files this build will touch

**New**:
- `supabase/migrations/<ts>_reputation_engine_phase1.sql`
- `src/hooks/useRecoveryTasks.ts`, `src/hooks/useLocationReviewLinks.ts`, `src/hooks/useReviewAutomationRules.ts`, `src/hooks/useReviewComplianceLog.ts`
- `src/pages/dashboard/admin/RecoveryInbox.tsx`
- `src/pages/dashboard/admin/LocationReviewLinks.tsx`
- `src/pages/dashboard/admin/ReviewAutomationRules.tsx`
- `src/components/feedback/RecoveryTaskDrawer.tsx`, `src/components/feedback/RecoveryTaskCard.tsx`, `src/components/feedback/ComplianceBanner.tsx`
- `src/lib/reputation/resolveReviewLinks.ts`
- `mem://features/reputation-engine.md`

**Edited**:
- `src/pages/ClientFeedback.tsx` — remove gate-suppression of public links; resolve location-aware URLs; ensure recovery trigger always fires below threshold
- `src/pages/dashboard/admin/FeedbackHub.tsx` — add Recovery tab + nav links to new pages, mount ComplianceBanner
- `src/App.tsx` — register three new admin routes
- `mem://index.md` — add reputation engine entry; consider Core rule for "public review links never rating-gated"

### Why this scope split

The full spec is a 4-phase initiative. Trying to ship the dispatcher, SMS, templating engine, AI drafting, dashboard, AND flow builder in one pass would produce shallow work everywhere and inevitably regress the existing feedback system. Phase 1 fixes the one **compliance bug** (rating-gated public links) and lays the persistent state (recovery tasks, location links, automation rules, compliance log) every later phase depends on.

### Open questions

1. **Recovery task assignment default**: assign to org owner, location manager, or unassigned-by-default (claimed from inbox)?
2. **Frequency cap default**: spec says configurable; reasonable default of **90 days** OK?
3. **Phase 2 SMS provider**: Twilio (already a connector here) vs. waiting for a Lovable-native SMS path?

I can start Phase 1 immediately on approval, or adjust the slice if you'd rather lead with the dashboard or dispatcher.