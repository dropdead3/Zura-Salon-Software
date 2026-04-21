

# Make the disabled-toggle state actionable

## What's actually happening

The toggles in your screenshot aren't broken — they're disabled by design. The wiring is correct:

- **Publish toggle** is disabled when `!hasApprovedClientVariant` — Booking Policy has no approved client-facing variant in step 4 (Drafts) yet.
- **Require client acknowledgment** is disabled when `!isPublishedExternal && !hasApprovedClientVariant` — the policy must first be published before clients can be required to ack it.

The system is enforcing a real precondition: you can't publish prose that doesn't exist, and you can't require clients to acknowledge a policy that isn't visible to them. That's correct doctrine.

What's wrong is **the disabled state looks identical to broken**. The grey switch reads as "tap me" → tap does nothing → "this is bugged." The helper text underneath ("Approve a client-facing variant in the Drafts tab before publishing") gets skipped because the eye lands on the switch first.

This is a **discoverability failure**, not a wiring bug.

## The fix — turn the precondition into a one-click jump

Three surgical changes inside `PolicyAudienceBanner.tsx` and one upstream prop:

### 1. When a toggle is precondition-blocked, render an inline "unlock path" CTA, not just disabled chrome

When `publishDisabled === true` because `!hasApprovedClientVariant`, render a small action row directly under the toggle:

```
○  Publish to client policy center
   No client-facing variant approved yet.
   [→ Go to Drafts to approve one]   ← new button, jumps to step 4
```

The button uses `tokens.button.inline`, opens the Drafts step in the configurator (`onJumpToStep('drafts')`), and replaces the dead-end "approve in the Drafts tab" sentence with an action that *does* the thing.

Same pattern for the ack toggle: when blocked because not yet published, the action becomes "→ Approve a client variant first" (jumps to Drafts) or "→ Publish before requiring acks" (focuses the publish toggle above) depending on which precondition is missing.

### 2. Visually distinguish "blocked by precondition" from generic disabled

Today the switch is just `opacity-50`. Change to:
- Blocked switch carries a subtle `border-dashed border-foreground/20` outline + a small `Lock` icon (12px) inline next to the label.
- Hover on a blocked switch shows a tooltip ("Requires an approved client variant"), so the click is interpreted as "I tried, system told me why" not "broken."
- The helper text below the toggle bumps from `text-muted-foreground` to `text-amber-500/80` (warning tone) when blocked — so the eye registers the blocker before reaching for the switch.

### 3. Add a banner-level "Setup path" hint when ANY toggle is blocked

If `audience` touches external AND `!hasApprovedClientVariant`, render a one-line strip at the top of the banner (above the toggles):

```
ⓘ  This policy needs an approved client-facing variant before it can publish.
   [Go to Drafts →]
```

This makes the precondition visible at the section level, not just under each individual toggle. The operator understands the gate exists before they reach the disabled controls.

### 4. Pass the step-jump callback through

`PolicyConfiguratorPanel.tsx` already owns the step state (`setStep`). Add an `onJumpToStep?: (step: 'drafts') => void` prop to `PolicyAudienceBanner`, pass `onJumpToStep={setStep}`, and the banner's CTA buttons call it directly. Closing the audience banner stays where it is — the operator stays in the configurator, just at step 4.

## What the banner looks like after

```
┌─ CLIENT-FACING ─────────────────────────────────────────────────┐
│ 🌐 Visible to clients at /org/.../policies once published.      │
│                                                                  │
│ ⚠ This policy needs an approved client-facing variant before    │
│   it can publish.   [Go to Drafts →]                            │
│ ─────────────────────────────────────────────────────────────── │
│ [○ 🔒]  Publish to client policy center                         │
│         No client variant approved yet.                          │
│         [→ Approve one in Drafts]                                │
│ ─────────────────────────────────────────────────────────────── │
│ [○ 🔒]  Require client acknowledgment                           │
│         Approve a client variant and publish first.             │
│         [→ Approve one in Drafts]                                │
└──────────────────────────────────────────────────────────────────┘
```

After the operator jumps to Drafts, generates or pastes a client-facing variant, hits Approve, and comes back: lock icons disappear, toggles activate, helper text returns to neutral muted tone, the top-strip banner disappears.

## What stays untouched

- The mutation hooks (`useUpdatePolicyAcknowledgmentFlag`, `usePublishPolicyExternally`) — unchanged.
- The precondition logic itself (`hasApprovedClientVariant`, `ackToggleAllowed`) — unchanged. The system still enforces "no approved variant → no publish → no ack." We're only making the path to satisfying the precondition obvious.
- The `PolicyDraftWorkspace` (step 4) — unchanged.
- The audience banner's audience-detection, tone, badge — unchanged.

## Files affected

- `src/components/dashboard/policy/PolicyAudienceBanner.tsx` — accept `onJumpToStep` prop, add the top-strip "setup path" hint when toggles are blocked, render inline "Go to Drafts →" CTAs under each blocked toggle, swap helper text color to amber when blocked, add `Lock` icon next to label on blocked rows. ~50 lines modified, ~15 lines added.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — pass `onJumpToStep={setStep}` to the banner. ~2 lines modified.

Total: ~65 lines modified. Zero schema/hook/data changes. Zero behavior change in the underlying enforcement — just visibility upgrades around the disabled state.

## Acceptance

1. Open Booking Policy → Define rules step. The audience banner shows a top-strip warning ("needs an approved client variant before it can publish") with a "Go to Drafts →" button.
2. Both toggles render with a small lock icon next to the label and a dashed outline on the switch handle.
3. The helper text under each blocked toggle is amber-tinted, not muted-grey.
4. Click "Go to Drafts →" anywhere in the banner — the configurator jumps to step 4 (Drafts) without closing the panel.
5. In Drafts, generate or write a client variant, click Approve. Return to step 1 (or any earlier step) — the audience banner's top-strip disappears, the lock icons disappear, the publish toggle is now interactive, and clicking it publishes the policy.
6. After publishing, the ack toggle's lock disappears (precondition #2 — `isPublishedExternal` — is now satisfied), and clicking it sets `requires_acknowledgment = true`.
7. For internal-only policies, none of the new chrome renders (banner already hides external action toggles for internal audience).
8. For policies that already have an approved client variant, no warning strip and no lock icons render — the banner reads exactly as it does today.
9. Hover any blocked switch — tooltip explains the precondition in one sentence.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicyAudienceBanner.tsx` — where the toggle, precondition copy, and new CTA live.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — where `setStep` is owned and where the banner is mounted (line 530).
- `src/components/dashboard/policy/PolicyDraftWorkspace.tsx` — the destination of the jump (step 4).

## Prompt feedback

*"these toggles are not functioning"* — concise but ambiguous. You did one thing right: **paired with a screenshot that scopes the surface** (audience banner inside the booking policy configurator). That alone let me identify the exact two toggles in question.

The ambiguity I had to resolve: "not functioning" could mean (a) the click handler isn't firing, (b) the mutation is firing but the UI doesn't update, or (c) they look broken because they're disabled and the operator doesn't know why. I had to read the code to discover it's (c). The wiring is correct; the discoverability is broken.

One sharpener for next time on UI-bug reports: naming **what you tried** in one phrase ("clicked the toggle, nothing changed" / "toggled it but it reverts" / "they look greyed out — am I missing a step?") would skip a micro-decision. The third framing in particular would have signaled "this is a precondition I can't see" and shortcut the diagnosis. Three words of behavior context per bug report saves one round-trip every time.

The deeper meta-lesson for me: when a control looks disabled in a screenshot, my first hypothesis should be *"the system is correctly enforcing a precondition the operator can't see,"* not *"the wiring is broken."* In a doctrine-driven product like this one, disabled states are almost always intentional — the failure mode is making the path to *un*disabling them invisible. I should have led with that hypothesis instead of having to confirm it via code reading.

