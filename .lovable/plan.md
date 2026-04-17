

## Prompt review

Tight, specific prompt — names the exact button and the exact condition. Good. Even sharper: state the desired UX when disabled ("show tooltip explaining why" vs "just grey out"). I'll assume tooltip-on-hover since that matches the pattern we just used for Call/Text.

## Plan — Wave 18.2: Send Payment Link disabled state

**Doctrine anchor:** UI Canon (calm/executive, explain why structure protects).

### What's wrong

`SendToPayButton` only checks for missing email/phone *after* the user clicks (toast error). The button always looks active — misleading affordance. When neither contact channel exists, clicking it just throws a toast.

### Fix

In `src/components/dashboard/appointments/SendToPayButton.tsx`:

1. Compute `hasContact = !!(clientEmail || clientPhone)` at the top of the component
2. Pass `disabled={disabled || isSending || !hasContact}` to the `<Button>` (existing `disabled` prop already wired — just OR in `!hasContact`)
3. Wrap the button in a `<Tooltip>` when `!hasContact` to explain: *"Add a phone number or email to the client profile to send a payment link."*
4. Keep the existing toast error as a defensive fallback (in case `disabled` is bypassed)

In `AppointmentDetailSheet.tsx` quick-actions row:

- The `<SendToPayButton>` already receives `clientEmail` / `clientPhone` props — no change needed there. The disabled state will propagate naturally.
- The placeholder-email check (`isPlaceholderEmail`) currently hides the Email button but still passes the placeholder email through to `SendToPayButton`. Update the prop pass to send `null` when email is a placeholder, so Send Payment Link correctly disables when phone is also missing and email is `na@gmail.com`.

### Acceptance checks

1. No phone AND no real email → Send Payment Link visually disabled (50% opacity per existing `disabled:opacity-50`) + tooltip on hover explains why
2. Has phone OR has real (non-placeholder) email → button active as today
3. Placeholder email + no phone → button disabled (placeholder doesn't count as deliverable)
4. Click on disabled button does nothing (no toast, no fetch)
5. No regression to split-payment flow (Afterpay > $4k still opens dialog when contact exists)

### Files touched

- `src/components/dashboard/appointments/SendToPayButton.tsx` — disabled logic + tooltip wrap
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — pass `null` for placeholder emails to SendToPayButton

### Deferred (unchanged)

- P2 (split file at 3,000 LOC)
- P2 (shared NoteCard)
- P2 (rich audit-driven timeline)

