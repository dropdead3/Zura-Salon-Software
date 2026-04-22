

# Three enhancements to the POS Cancellations & Fees tab

These are additive polish on top of the read-only summary that just shipped. Each one strengthens the source-of-truth contract without re-introducing a write path.

## 1. Anchor scrolling on jump-link

Today the jump-link from POS settings → Bookings & Payments sets `?category=bookings-payments&anchor=<section>` but the destination page does nothing with the `anchor` param. The cross-surface handoff dumps the operator at the top of the page and they have to find the section themselves.

**Fix:** add a `useEffect` in the Bookings & Payments page that reads `searchParams.get('anchor')`, finds the matching section by `id`, and calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` once data has loaded. Apply matching `id` attributes to each section wrapper (`payment`, `cancellation`, `no-show`, `online-booking`).

Also add a brief flash highlight (250ms `bg-primary/5` ring) on the targeted section so the operator's eye lands where they were sent. Wears off automatically.

**Files:**
- `src/pages/dashboard/admin/BookingsPayments.tsx` — anchor consumer + scroll logic + section `id`s. ~25 lines added.
- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` — confirm jump-link emits the right anchor keys (`payment`, `cancellation`, `no-show`, `card-on-file`). ~5 lines verified.

## 2. POS receipt preview line per card

Each summary card today shows the structured value ("3 days · $50 fee"). Add a second line below it titled **"On the receipt:"** that renders the first sentence of the client variant's `body_md` for that policy — verbatim, the words the client will see when the terminal prints or emails them.

This converts the tab from "what's configured" to "what the client experiences." Same read-only doctrine — we never write `body_md` from this surface, only render the first sentence (truncated at ~140 chars with ellipsis).

For the no-show card specifically, render the no-show fee sentence; for the cancellation card, render the cut-off sentence. Picking the right sentence per policy uses simple keyword extraction from the rendered prose (find the sentence containing the rule's primary token like `{{cancellation_window_hours}}`).

If a policy has no approved client variant yet, show "Not yet approved — Publish in Bookings & Payments to set the receipt copy." with the same jump-link.

**Files:**
- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` — add `<ReceiptPreviewLine>` subcomponent, wire to `policy_variants.body_md` already returned by the data hook. ~50 lines added.
- `src/lib/policy/extract-receipt-sentence.ts` (new) — pure helper that extracts the relevant sentence from rendered prose given a policy key. ~40 lines.

## 3. Drift watcher (last-edited timestamp per card)

Each card gets a small footer line: **"Last edited 3 days ago by Jane Smith"** — relative timestamp + actor name pulled from the policy's most recent `policy_versions` row (or `policy_rule_blocks.updated_at` if newer).

This makes source-of-truth visible without re-litigating where edits happen. An operator who sees "Last edited 6 months ago" knows the rule may be stale; one who sees "Last edited 2 hours ago by Marcus" trusts what they're looking at and knows who to ask.

Uses `formatRelativeTime` from `src/lib/format.ts` (already imported in the codebase). Actor name resolves via `employee_profiles` lookup against `policy_versions.created_by` (or `approved_by` if the version is approved). Falls back to "by a team member" if the user record is missing — never shows a raw UUID.

This same pattern will land on the Bookings & Payments page itself in a follow-up for symmetry, but POS settings benefits more immediately because it's the surface where operators most often ask "wait, is this still right?"

**Files:**
- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` — add `<LastEditedFooter policyId>` subcomponent. ~30 lines added.
- `src/hooks/policy/usePolicyLastEdited.ts` (new) — query hook returning `{ updatedAt, actorName }` for a given policy. ~50 lines.

## What stays untouched

- Wave 28.16 Bookings & Payments page structure — only gains the anchor consumer + section `id`s, no editing changes.
- The four policies' rule schemas, RPCs, variants, and pipelines — unchanged.
- Single source of truth — confirmed: this tab still has zero write paths.
- All other POS settings tabs — unchanged.

## Acceptance

1. Click "Edit in Bookings & Payments →" on any POS Cancellations & Fees card → page navigates, scrolls smoothly to the matching section, and that section briefly flashes a subtle ring before settling.
2. Each summary card renders three lines: the structured value, an "On the receipt:" preview of the client-facing sentence, and "Last edited X ago by Name."
3. If a policy has no approved client variant, the receipt preview line shows the empty-state copy with the same jump-link instead of a blank space.
4. Last-edited timestamp updates within ~30s of an edit on the Bookings & Payments page (via shared React Query cache invalidation).
5. Actor name resolves to the operator's display name from `employee_profiles`; never shows a raw UUID. Falls back to "a team member" if missing.
6. Confirmed by code review: no new write paths added to the POS settings tab. Single source of truth intact.
7. The receipt preview never displays placeholder tokens (`{{cancellation_window_hours}}`) — only fully-rendered prose.

## Files to read for follow-on questions

- `src/pages/dashboard/admin/BookingsPayments.tsx` — where anchor scrolling lands.
- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` — where the receipt preview + last-edited footer land.
- `src/lib/policy/extract-receipt-sentence.ts` (new) — sentence extraction logic.
- `src/hooks/policy/usePolicyLastEdited.ts` (new) — last-edited data source.

## Why these three together

Each one closes a different trust gap:

- **Anchor scrolling** closes the *navigation* gap — the surface that says "edit it over there" should put you exactly there.
- **Receipt preview** closes the *empathy* gap — operators configure rules in the abstract; clients experience prose. Showing the prose closes the loop.
- **Drift watcher** closes the *staleness* gap — read-only surfaces can rot silently. Visible timestamps make rot impossible to miss.

All three are read-only, all three reuse infrastructure that already exists, and all three reinforce rather than dilute the source-of-truth doctrine you just bought.

## Prompt feedback

Best prompt format you've used in this thread. Three things made it land: (1) **you wrote the suggestions yourself first** instead of asking me to brainstorm — that means I'm grading and structuring instead of inventing, which is much higher signal for both of us, (2) **each suggestion has a one-line "why"** that names the value clearly ("turns the tab from 'what's set' into 'what your client will see'") so I don't have to guess your intent, and (3) **you grouped them as enhancements not requirements** — that gives me permission to push back on any one of them without breaking the whole batch.

The sharpener: when you write a list of enhancements, naming the **priority order** in three words ("ship #1 first" / "all three together" / "just thinking aloud") prevents me from over-investing in implementation detail on something you wanted to think about, not build now. I assumed "all three together because they share a surface" but if you'd written "just thinking aloud" I'd have given you a much shorter response that engaged with each idea conceptually without scoping files. Three words of build-intent per enhancement-list saves a planning round.

The deeper meta-lesson on my side: when an operator brings me a list of self-authored ideas, the wrong move is to silently re-rank or reject them — that signals "I know better than you." The right move is to take them at face value, name what each one actually buys, and surface any tradeoff that isn't obvious from the suggestion text. All three of your ideas were good; my job was to translate them into a build, not to defend the prior wave by trimming them. I should treat operator-authored enhancement lists as a high-trust signal that the operator has been thinking about the surface longer than I have in this turn — and respond by extending their thinking, not filtering it.

