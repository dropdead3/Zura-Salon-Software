

## Prompt review

Sharp instinct — this is the **hospitality moat**. Generic "client notes" become a junk drawer ("dye allergy," "cancelled twice," "wants bangs," "kids named Max and Lila") because they mix three different intents: *clinical* (allergies, formula), *behavioral* (cancels, no-shows, prefers AM), and *personal* (Italy trip, dating, marathon training). When all three live in one stream, the personal stuff drowns and stylists stop bothering to capture it. Sharper next time: name the *outcome* you want — "I want stylists to greet clients with one personal callback per visit" — that frames the spec as a behavior change, not a UI add. You did this implicitly with the Italy/movie/date examples; clear enough.

But here's the strategic trap I want to flag: **adding a fourth notes surface ("About Client") on top of the existing three (Appointment Notes, Client Notes, Booking Assistant Notes) makes the junk drawer worse.** The right move is to *separate by intent*, not stack by surface. We already have "Client Notes" (cross-visit, persistent). What's missing is a **typed, time-decayed personal memory layer** that surfaces *one curated callback* on the appointment card and detail sheet — not another freeform textarea.

## Diagnosis — current notes surfaces

| Surface | Hook | Scope | Intent | Junk-drawer risk |
|---|---|---|---|---|
| **Appointment Notes** | `useAppointmentNotes` | Per-appointment | Stylist scratchpad for *this* visit | Low (now ledger via Wave 22.24) |
| **Client Notes** | `useClientNotes` | Cross-visit, persistent | Catch-all client info | **HIGH** — currently mixes allergies + birthday wishes + cancellation patterns |
| **Notes From Booking Assistant** | `appointment.notes` field | Per-appointment | Booker's intake note | Low (single source) |
| **`phorest_clients.notes`** | embedded in client row | Cross-visit | Legacy catch-all | High (no structure) |

The user's request — "Italy trip, movie, date" — belongs in **none** of these. Those notes are *episodic personal threads* that need to surface as a **callback prompt at the next visit** ("Ask how Italy was"), then archive themselves once acknowledged.

## Plan — Wave 22.25: Hospitality Memory Layer ("About Client" + Callback Prompts)

### Strategic shape

Two layers, one new concept:

1. **About Client (durable personal facts)** — kids, partner, pets, profession, hobbies, dietary restrictions, pronouns. Things that persist for years and don't expire. Lives at the top of the Client Detail sheet as a structured "About" card with typed slots, NOT a freeform note list.

2. **Callbacks (episodic threads to follow up on)** — "Going to Italy in March," "First date Saturday," "Trying out for community theater." Things with a *trigger date* or *next visit* horizon. Surface as a calm prompt on the appointment card and at the top of the appointment detail sheet: *"Ask how the Italy trip went."* One acknowledgment archives it.

### Layer 1 — "About Client" structured card

**Where it lives:**
- **Client Detail Sheet** (`ClientDetailSheet.tsx`): new "About" section at the top of the Overview tab, above visit history. Always-visible, scannable in 2 seconds.
- **Appointment Detail Sheet** (`AppointmentDetailSheet.tsx`): same compact "About" block in the Details tab, above Client Notes Preview (replaces nothing — additive).
- **Booking flow client profile** (`ClientProfileView.tsx`): same compact block.

**Structure (typed slots, not freeform):**

```
ABOUT ERIC
─────────────────────────────────────────
Pronouns        he/him
Family          Wife Sarah · Kids Max (8), Lila (5)
Pets            Golden retriever named Cooper
Profession      ER nurse · works night shifts
Hobbies         Marathon running · woodworking
Dietary         Gluten-free
Sensitivities   Allergic to ammonia
─────────────────────────────────────────
[+ Add a fact]
```

Each slot is optional. Empty slots hidden. One-click inline edit per slot. Stylists can add custom slots ("Always orders oat milk latte").

**Why typed slots beat freeform:**
- Forces information *architecture* — stylists learn what's worth capturing
- Scannable in seconds (no reading paragraphs)
- AI/automation can later use structured data ("flag clients with kids during back-to-school season")
- No duplication — "wife Sarah" gets captured once, not in 4 different notes

**Schema (new table):**

```sql
CREATE TABLE public.client_about_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES phorest_clients(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('pronouns','family','pets','profession','hobbies','dietary','sensitivities','custom')),
  label text,           -- only used when category = 'custom'
  value text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: is_org_member for select, is_org_member for insert/update/delete
-- Index on (organization_id, client_id)
```

### Layer 2 — Callbacks (episodic prompts)

**Where it lives:**
- **Appointment card on the Schedule grid** (`AppointmentCardContent.tsx`): single-line yellow chip *if* a callback exists for this client: *"💬 Ask about Italy trip"* (truncated, full text on hover).
- **Appointment Detail Sheet** Details tab: dedicated "Follow up" block at the very top, above contact info — impossible to miss when opening the appointment.
- **Client Detail Sheet**: "Open threads" section listing all unacknowledged callbacks for this client.

**UI (Appointment Detail Sheet — top of Details tab):**

```
FOLLOW UP                                          [Mark heard ✓]
─────────────────────────────────────────────────────────────────
💬  Ask how Italy was — set Mar 02 by Jenna B.
💬  First date Saturday — set Apr 10 by Marcus T.
─────────────────────────────────────────────────────────────────
```

**Capture flow:**
- "+ Add follow-up" button on Client Detail sheet *and* on Appointment Notes ledger (Wave 22.24)
- Single textarea: "What should we ask about next time?"
- Optional date picker: "Trigger by [date]" (defaults to "next visit")
- Saves to `client_callbacks` table

**Acknowledgment flow:**
- "Mark heard" button on the prompt → sets `acknowledged_at` and `acknowledged_by`
- Acknowledged callbacks disappear from active prompts but stay in client history ("Past follow-ups" expandable section)
- Honors alert-fatigue: if a callback is more than 90 days past trigger, auto-archive with a "stale — never asked" tag

**Schema (new table):**

```sql
CREATE TABLE public.client_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES phorest_clients(id) ON DELETE CASCADE,
  prompt text NOT NULL,                              -- "Ask how Italy was"
  trigger_date date,                                  -- when it becomes active (null = next visit)
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  outcome_note text,                                  -- optional: "She loved it, going back next year"
  archived_reason text                                -- 'acknowledged' | 'stale' | 'manual'
);
-- RLS: is_org_member for all ops
-- Index on (organization_id, client_id, acknowledged_at) for fast "active callbacks" lookup
```

### How this reads on the appointment card

Currently appointment cards show name, service, time, status. New: **one** subtle yellow chip when an active callback exists, capped at one chip per card to honor alert-fatigue doctrine:

```
ERIC DAY                              9:00 AM
Combo Cut · Jenna B.                  ●  Confirmed
💬  Ask about Italy trip
```

If multiple callbacks: show count *"💬 2 follow-ups"* — full list in detail sheet.

### How this reads in Client Directory

In the directory list row, a small `💬 N` indicator next to clients with active callbacks. Hover tooltip: *"3 open follow-ups."* Single-click into the detail sheet.

### Onboarding copy (the "easy and understandable" part)

The first time a stylist opens a client with no About facts, show a calm one-liner above the empty section:

> *"Capture the personal details that make Eric feel known — kids' names, pets, hobbies, what he's working on. We'll surface them next time he books."*

The first time a stylist captures a callback, show a tooltip:

> *"We'll remind you to ask about this at Eric's next appointment. Mark it heard once you've followed up."*

No videos, no walkthroughs. The tooltip teaches the loop in one sentence.

### Acceptance checks

1. New "About" card on Client Detail sheet shows typed slots; empty state guides first capture
2. Stylist can add/edit/delete About facts inline; each slot edits independently
3. New "Add follow-up" CTA on Client Detail sheet captures callbacks with optional trigger date
4. Callback prompt appears at the *top* of the Appointment Detail sheet Details tab (above contact)
5. Single yellow chip ("💬 Ask about Italy") appears on the Schedule grid card when an active callback exists
6. "Mark heard" button archives the callback with optional outcome note
7. Acknowledged callbacks move to "Past follow-ups" expandable section
8. Callbacks 90+ days past trigger auto-archive with `archived_reason = 'stale'`
9. About facts and callbacks both scoped by `organization_id` with `is_org_member` RLS
10. Multi-callback case shows count chip, not stacked chips (alert-fatigue)

### Files

**New (database migration):**
- `client_about_facts` table + RLS
- `client_callbacks` table + RLS
- Optional cron/edge to mark stale callbacks (or just compute client-side via `trigger_date < now() - 90 days`)

**New (hooks):**
- `src/hooks/useClientAboutFacts.ts` — read + upsert + delete
- `src/hooks/useClientCallbacks.ts` — read active + acknowledge + create + archive

**New (components):**
- `src/components/dashboard/clients/ClientAboutCard.tsx` — structured slot card
- `src/components/dashboard/clients/ClientCallbacksPanel.tsx` — active callback prompts + add form
- `src/components/dashboard/clients/CallbackChip.tsx` — single-line chip for appointment cards

**Edits:**
- `src/components/dashboard/ClientDetailSheet.tsx` — render `<ClientAboutCard>` + `<ClientCallbacksPanel>` at top of Overview
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — render compact About block + Callbacks at top of Details tab
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — render `<CallbackChip>` when active callback exists
- `src/components/dashboard/schedule/booking/ClientProfileView.tsx` — render compact About block
- `src/pages/dashboard/ClientDirectory.tsx` — `💬 N` indicator in list rows

### Open questions (need your call)

1. **Should "About" facts be visible to assistants and front desk, or stylist-only?** Going with **org-wide visible** (no privacy flag) since they're hospitality cues, not clinical data. Tell me if you want a private flag.
2. **Should callbacks auto-create from booking-assistant intent?** E.g., booker captures "client mentioned going to Italy" → auto-suggests a callback. Defer (P3) unless you want it now.
3. **Should we migrate existing freeform `client_notes` into typed About slots?** Defer (P3) — stylists can re-capture as they encounter clients. Auto-migration would mis-categorize.

### Deferred

- **P2** AI-assisted callback drafting: when a stylist adds an Appointment Note containing a personal mention ("she's going to Italy in March"), suggest *"Create follow-up: Ask how Italy went"* with one-click accept. Trigger: after this layer ships and stylists actively use callbacks.
- **P3** "Hospitality score" on client cards — % of visits with an acknowledged callback. Surfaces operators who are building real relationships vs. transactional ones. Trigger: after 90 days of callback data accumulates.
- **P3** Birthday/anniversary auto-callbacks — "Wish Sarah happy birthday" auto-generated from `phorest_clients.birthday`. Trigger: after manual callbacks prove the workflow.
- **P3** Cross-staff callback ownership — "Marcus captured this; he should follow up." Today any stylist on the appointment can mark heard. Trigger: if multi-stylist orgs report ownership confusion.
- **P3** Callback templates ("Ask about [trip] · [event] · [project]") to speed capture. Trigger: after observing what stylists actually type.

