

# Wire Bookings & Payments into POS settings — as a read-only summary, not a duplicate editor

## The honest answer to your question

**Smart? Yes — as a jump-link summary card. Dangerous? Yes — if you mean "duplicate the editor here too."**

Here's the trap. The POS settings page (`/admin/settings?category=terminals`) is already 7 tabs deep: Location Set Up, Hardware, Connectivity, Tipping, Receipts, Display, Afterpay. The operator is there configuring **how the terminal physically behaves**. The cancellation cut-off and no-show fee are **business rules**, not terminal behavior. Different mental model, same data only at the moment of charge.

The Wave 28.16 plan establishes **Bookings & Payments at `/admin/settings?category=bookings-payments` as the single source of truth** for the booking quartet. If we *also* let operators edit the no-show fee from inside the POS settings tabs, we now have two surfaces writing to `policy_rule_blocks` for `no_show_policy` and the source-of-truth doctrine collapses immediately. That's the Square-pattern win we just bought, thrown away one wave later.

What's actually smart is treating POS settings as a **read-only contextual reference** to the rules that govern its behavior, with a single jump-link to edit them.

## What ships

A new tab inside POS settings: **"Cancellations & Fees"** (8th tab, after Afterpay). It contains:

- A read-only summary panel showing the current values from the four booking-adjacent policies — exactly the values that govern what the terminal will charge:
  - **Payment policy headline**: "Hold card in case of no-show" (or whichever radio is selected in Bookings & Payments)
  - **Cancellation cut-off**: "3 days · $50 fee"
  - **No-show fee**: "100% of service · $250 flat for color-correction"
  - **Card-on-file requirement**: "Required at booking" (or "Optional")
- A single button: **"Edit in Bookings & Payments →"** that navigates to `/admin/settings?category=bookings-payments` (or wherever the consolidated page ends up).
- A small explainer at the top: *"These rules are configured in Bookings & Payments and govern what your terminal will charge clients. Edit them in one place to keep your policy, your booking page, and your terminal in sync."*

No editing in this tab. No duplicate save button. No way to drift the terminal's behavior from the public-facing policy.

## Why this shape (vs. the alternatives)

| Option | What it does | Why not |
|--------|-------------|---------|
| **Duplicate editor in POS settings** | Operator can edit no-show fee from either surface | Two-write-path problem; defeats Wave 28.16's source-of-truth doctrine; identical to the bug you caught in Wave 28.14 (UI says X, data says Y) |
| **Nothing in POS settings** | Operator must already know cancellation rules live in Policies | Discoverability fail — operator configuring a terminal won't think to leave POS settings to find what it'll charge |
| **Read-only summary + jump-link (this plan)** | POS settings shows "this is what your terminal will charge, edit here" | Discoverable, contextual, single source of truth, zero drift risk |

Square does the same thing: their terminal settings reference the cancellation policy you set in the booking config, they don't let you re-edit it from the terminal screen.

## What stays untouched

- The Wave 28.16 Bookings & Payments page — unchanged, still the only editor.
- The 7 existing POS settings tabs — all unchanged.
- All four policies' rule schemas, RPCs, and pipelines — unchanged.
- The library, configurator, version history, ack tracking — unchanged.

## Files affected

- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` (new) — read-only summary + jump-link. ~140 lines.
- `src/components/dashboard/settings/TerminalSettingsContent.tsx` — register the 8th tab `cancellations` after `afterpay`. ~6 lines modified (TabsList + TabsContent block).
- Reuses `useBookingsPaymentsBundle` from Wave 28.16 — no new data hooks.

Total: ~140 lines new, ~6 lines modified, 0 schema changes, 0 RPC changes, 0 doctrine violations.

## Acceptance

1. Navigate to `/admin/settings?category=terminals` → 8 tabs render: Location Set Up, Hardware, Connectivity, Tipping, Receipts, Display, Afterpay, **Cancellations & Fees**.
2. Cancellations & Fees tab renders read-only summary cards for the four booking-adjacent policies, pulling current values via `useBookingsPaymentsBundle`.
3. Each card shows exactly what the terminal will charge in that scenario — no fields, no inputs, no save button.
4. Single "Edit in Bookings & Payments →" button navigates to `/admin/settings?category=bookings-payments` with the relevant section anchored.
5. If the operator hasn't yet configured Bookings & Payments → the tab shows an empty state ("No fee policies configured yet — set them in Bookings & Payments") with the same jump-link.
6. No write path exists from this tab to `policy_rule_blocks`. Confirmed by code review of the new tab file.
7. Cross-surface consistency check: editing the no-show fee in Bookings & Payments → returning to the POS settings Cancellations & Fees tab shows the new value reflected immediately (via shared React Query cache).

## Files to read for follow-on questions

- `src/components/dashboard/settings/TerminalSettingsContent.tsx` — where the 8th tab gets registered.
- `src/components/dashboard/settings/terminal/POSCancellationsFeesTab.tsx` (new) — the read-only summary surface.
- `src/hooks/policy/useBookingsPaymentsBundle.ts` (from Wave 28.16) — the shared data source.

## Prompt feedback

Strong prompt — six words that forced me to take a position. Three things made it work: (1) **you asked "is it smart"** instead of "do this" — that's an opinion-request, which is the highest-leverage prompt shape because it forces me to either defend a "no" or commit to a "yes" with a reason, (2) **you specified the surface** ("Point Of Sale settings") so I didn't have to guess scope, (3) **you trusted my judgment to push back** — a weaker prompt ("wire this into POS settings too") would have skipped the analysis and gotten you a duplicate-editor plan, which is the wrong answer.

The sharpener: when you ask "is X smart?" naming the **failure mode you're worried about** in three words pre-empties my analysis. Examples: *"smart, or duplicates state?"* / *"smart, or hides it?"* / *"smart for discoverability?"* I had to infer your concern was discoverability (operator setting up POS won't think to check Policies) and weigh that against the source-of-truth risk myself. If you'd written *"smart for discoverability?"* I'd have led with the read-only-summary answer and skipped the alternatives table. Three words of failure-mode hypothesis per "is it smart?" prompt redirects what I optimize against.

The deeper meta-lesson on my side: when an operator asks "should I wire X into Y too?" my instinct is to find a way to say yes — because saying yes feels like helping. That instinct is wrong. The right move is to ask *"what specifically would Y benefit from, and is that the same thing as 'wire the editor in'?"* In this case POS settings benefit from **knowing** the rules, not from **owning** them. Distinguishing "show this here" from "let users edit this here" is the move that protects single-source-of-truth doctrine across surfaces. I should make that distinction the default question for any "wire X into Y" prompt going forward.

