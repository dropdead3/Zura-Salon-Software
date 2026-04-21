

# Surface the "Core Functions" tier on the Policies page

## What's missing today

The Policies page has **26 policies marked `required`** — but they're all displayed as one undifferentiated wall under a "Required" header with a single completion meter. That tells the operator "you have 26 things to do" without telling them **why each one matters or which ones the software actually consumes**.

The truth is a sharper hierarchy:

1. **Core functions** (6 policies) — POS and booking *use* these values directly. Deposits, cancellation fees, no-show fees, payment terms, dispute evidence. Without them, the software falls back to platform defaults; the operator is never blocked, but their salon's specific terms don't render anywhere.
2. **Required for governance** (20 policies) — Employment classifications, progressive discipline, extension warranty, escalation paths. The software runs fine without them; *the business* is exposed without them.
3. **Recommended & optional** (~21 policies) — Already grouped correctly today.

The user's insight is right: full policy configuration isn't necessary to *operate*, but the operator currently can't tell which 6 unblock real software behavior vs. which 20 just protect their business.

## The fix — a new "Core functions" tier above "Required"

Promote a 6-policy subset to a visually distinct, clearly-labeled top group on the Policies page:

```
┌─ Core functions ──────────────────────────────────────────────┐
│  These power POS and booking. Defaults work out of the box —  │
│  configure to make them yours.                                │
│                                                                │
│  ✓ Booking Policy           Powers the public booking page    │
│  ◯ Deposit Policy           Drives deposit collection at      │
│                             booking and on the booking page    │
│  ◯ Cancellation Policy      Drives the fee charged when a     │
│                             client cancels late                │
│  ◯ No-Show Policy           Drives the fee charged when a     │
│                             client no-shows                    │
│  ◯ Payment Policy           Renders on receipts and the       │
│                             public booking page                │
│  ◯ Chargeback & Dispute     Used as evidence when contesting  │
│                             a chargeback in PaymentOps         │
│                                                                │
│  3 of 6 configured — using defaults for the other 3           │
└────────────────────────────────────────────────────────────────┘

┌─ Required for governance ─────────────────────────────────────┐
│  Protect your business. The software runs without these,     │
│  but your operations and team don't have a written contract.  │
│                                                                │
│  [20 cards in current grid layout]                            │
└────────────────────────────────────────────────────────────────┘

┌─ Recommended & Optional ──────────────────────────────────────┐
│  [unchanged]                                                   │
└────────────────────────────────────────────────────────────────┘
```

### The 6 Core Function policies (final list)

| Policy key | Category | What software consumes it | If unset → |
|---|---|---|---|
| `booking_policy` | client | Public booking surface (`HostedBookingPage`, `create-public-booking`) | Default booking terms render on the public booking page |
| `deposit_policy` | client | `collect-booking-deposit` edge function, deposit fields on services | Deposits not collected unless the operator turns them on per-service manually |
| `cancellation_policy` | client | `charge-card-on-file` cancellation fee path; `submit-dispute-evidence` evidence field | Cancellation fees can't be charged automatically; dispute evidence is empty |
| `no_show_policy` | client | `charge-card-on-file` no-show fee path; daily no-show automation | No-show fees can't be charged automatically |
| `payment_policy` | financial | Receipt footers, public booking page disclosure, terminal receipts | Default disclosure renders; operator's specific accepted methods/refund terms don't surface |
| `chargeback_dispute` | financial | `submit-dispute-evidence` rebuttal field in PaymentOps | Dispute evidence relies on Stripe defaults; operator's rebuttal language isn't pre-loaded |

Selection rule: a policy is "core function" if **at least one edge function or production surface reads its values at runtime**. This is the empirical filter — not opinion.

### How the doctrine ships

A new column on `policy_library` would be cleanest, but we don't need it. The 6 keys are stable and tiny — declare them in code:

```ts
// src/lib/policy/core-function-policies.ts
export const CORE_FUNCTION_POLICY_KEYS = [
  'booking_policy',
  'deposit_policy',
  'cancellation_policy',
  'no_show_policy',
  'payment_policy',
  'chargeback_dispute',
] as const;

export const CORE_FUNCTION_CONSUMERS: Record<string, string> = {
  booking_policy: 'Powers the public booking page',
  deposit_policy: 'Drives deposit collection at booking',
  cancellation_policy: 'Drives the fee charged when a client cancels late',
  no_show_policy: 'Drives the fee charged when a client no-shows',
  payment_policy: 'Renders on receipts and the public booking page',
  chargeback_dispute: 'Pre-loads dispute evidence in PaymentOps',
};
```

This keeps the doctrine in one file, type-safe, and easy to read in PR diffs. If we ever expand the set (e.g., when refund/redo wires into a new automation), it's one line + one consumer label.

### Soft-nudge enforcement (per your answer)

- **POS and booking never block** when a core-function policy is unset — the platform falls back to its default.
- The `PolicyLibraryCard` for an unconfigured core-function policy renders a subtle one-line tag: *"Using platform default — configure to make it yours."* — `font-sans text-xs text-muted-foreground`, no badge, no escalation.
- No global banner. No toast. No interrupt. The Policies page itself is the surface that explains the tier.

### Visual treatment

- **New section header**: `Core functions` rendered with `font-display text-xs tracking-[0.14em] uppercase text-foreground` (same scale as today's `Required` header) so it sits in the existing rhythm.
- **One-sentence subtitle** under the header: *"These power POS and booking. Defaults work out of the box — configure to make them yours."* (`font-sans text-xs text-muted-foreground`)
- **Per-card consumer line**: a single line below the existing card title showing the `CORE_FUNCTION_CONSUMERS[key]` text. Same `font-sans text-xs text-muted-foreground` scale as today's `short_description`. No icon, no badge.
- **Progress meter**: same pattern as today's Required meter — `3 of 6 configured · 50%` with the existing thin progress bar.
- **The existing `Required` header** is renamed to `Required for governance` with subtitle *"Protect your business. The software runs without these, but your operations and team don't have a written contract."* — so the relationship between the two tiers is explicit.
- The 6 core policies are **removed from the existing `Required` group** to avoid double-counting. The `Required for governance` count drops from 26 to 20. Progress meter math updates accordingly.

## Doctrine alignment

- **Lever and confidence**: the operator can now see *which 6 levers actually move POS/booking outputs*. The other 20 are governance, not operations.
- **Silence is meaningful**: no banners, no blocking, no toasts. The Policies page is the only place this hierarchy is named.
- **Sensible defaults**: every core-function policy has a platform default — booking and POS always work. The operator opts in to specificity.
- **Structure precedes intelligence**: this is structural visibility, not new intelligence. We're documenting what already exists.
- **Brand abstraction**: copy uses neutral verbs ("Powers the public booking page", "Renders on receipts") — no tenant or vendor references.
- **No structural drift**: zero DB changes, zero new tables, zero new flags. One new file + one rendered section.

## Files affected

- `src/lib/policy/core-function-policies.ts` (new) — declares the 6 keys + consumer-label map. ~25 lines.
- `src/pages/dashboard/admin/Policies.tsx` — split the current `requiredEntries` into `coreFunctionEntries` + `governanceRequiredEntries`. Render two grouped sections with the new headers/subtitles. Update progress-meter math. ~60 lines additive, ~10 lines modified inside the existing `(() => { … })()` IIFE.
- `src/components/dashboard/policy/PolicyLibraryCard.tsx` — accept an optional `consumerLabel?: string` prop. Render it as a subtle line under the title when present. When the policy is a core function and not yet adopted, render *"Using platform default — configure to make it yours."* in the same slot. ~15 lines additive, fully backwards-compatible.
- `src/__tests__/policy-library-content.test.ts` — add a guard test asserting every key in `CORE_FUNCTION_POLICY_KEYS` exists in the live `policy_library` and is `recommendation = 'required'`. Prevents drift if a key is renamed. ~15 lines additive.

That's the entire change surface. ~115 lines additive across 4 files. Zero DB changes, zero new RPCs, zero schema changes.

## Acceptance

1. Open `/dashboard/admin/policies`. The first group is **Core functions** with the 6 cards listed above and the subtitle *"These power POS and booking. Defaults work out of the box — configure to make them yours."*
2. The second group is **Required for governance** with 20 cards (down from 26) and the subtitle naming what it protects.
3. The Core functions group has its own progress meter (`X of 6 configured`). The governance meter is `Y of 20`. The two never overlap.
4. Each Core function card shows a one-line consumer label under the title (e.g., on Deposit Policy: *"Drives deposit collection at booking"*).
5. Unadopted Core function cards additionally show: *"Using platform default — configure to make it yours."* in the same scale as the consumer label.
6. The existing "Hide adopted" toggle still works — it now hides adopted core-function cards too.
7. POS, the public booking page, the cancellation fee charge flow, and dispute evidence submission **continue to work unchanged** when none of the 6 core policies are configured. Platform defaults render. Nothing blocks.
8. The `Recommended & Optional` group is untouched.
9. Lint guard: removing or renaming any key in `CORE_FUNCTION_POLICY_KEYS` without updating the live `policy_library` fails the test suite — drift can't ship silently.

## Files to read for follow-on questions

- `src/lib/policy/core-function-policies.ts` (new) — single source of truth for the tier.
- `src/pages/dashboard/admin/Policies.tsx` — the consumer; rendering logic for both tiers.
- `src/components/dashboard/policy/PolicyLibraryCard.tsx` — consumer-label slot.

## Prompt feedback

*"What policies are absolutely necessary for POS and appointment bookings to function? We need to surface that doctrine if there are some that must be set up before the core functions of the software will work, like payment processing and booking flows, etc, so users can see that full policy configuration isn't necessary, but it helps their business become more organized and structured."* — this is one of your strongest prompts in the thread. You did three exceptional things: (1) **named the operational fear in plain English** ("absolutely necessary for POS and appointment bookings to function") — that's the empirical filter that gave me the 6-vs-26 split, (2) **named the user-facing payoff** ("users can see that full policy configuration isn't necessary, but it helps") — that pre-resolved the tone (advisory, not blocking), and (3) **named the doctrine you wanted surfaced**, not the UI mechanism — which let me pick "split into tiers + soft-nudge" instead of inventing a wizard or a checklist.

One sharpener for next time on doctrine prompts like this: naming the **enforcement question** in one phrase ("never block / soft nudge / hard block on specific actions") would skip the clarifying question entirely. I asked because the answer reframes the whole UI — but you can pre-empt that micro-decision by adding one line like *"never block — defaults always work, just surface the doctrine"* to a prompt of this shape. You'd save one round-trip on every doctrine prompt going forward.

