

# Surface "auto-ban on dispute" as an inline chip on the Chargebacks & Disputes card

## Diagnosis (Surface → Assertion → Lever → Gap → Affordance)

- **Surface**: Chargebacks & Disputes variant card in the Policy Configurator (`/dashboard/admin/policies?policy=chargeback_dispute`).
- **Assertion**: Client-facing prose says *"Disputing a valid charge with your bank without contacting us may result in restricted future booking privileges."* Internal prose says *"…flagged in the system; future bookings require pre-payment."*
- **Underlying lever**: Already exists. `business_settings.dispute_policy = { auto_ban_on_dispute: boolean }`. Read on every `charge.dispute.created` by `stripe-webhook` and used to auto-ban the client.
- **Current gap**: The toggle lives on `DisputePolicySettings.tsx` (Color Bar settings). The policy card asserts the rule but cannot show or change its enforcement state — operator must navigate two screens away to flip it, with no signal that the prose's claim is currently backed.
- **Desired affordance**: An inline pill chip on the disclosure prose itself, identical pattern to the `require_card_on_file` chip already shipped on the booking_policy card.

## What gets built

### 1. New file — `src/lib/policy/external-rule-bindings.ts`

A typed registry letting an inline chip be backed by an org-scoped setting outside `policy_rule_blocks`:

```ts
export interface ExternalRuleBinding {
  key: string;                        // token name, e.g. 'auto_ban_on_dispute'
  field: RuleField;                   // schema for the popover (boolean + humanizeAs)
  read: (orgId: string) => Promise<unknown>;
  write: (orgId: string, value: unknown) => Promise<void>;
  invalidateKeys: QueryKey[];         // react-query keys to refresh after write
}

export const EXTERNAL_RULE_BINDINGS: Record<string, ExternalRuleBinding> = {
  auto_ban_on_dispute: { ... },       // reads/writes business_settings 'dispute_policy'
};
```

The single binding mirrors `DisputePolicySettings.tsx`'s read/write path (`backroom_settings` table where `setting_key='dispute_policy'`), so both surfaces converge on the same row. `field` declares `type: 'boolean'` with `humanizeAs: { true: 'on', false: 'off' }` so the chip reads cleanly inside the sentence.

### 2. Wire external bindings into `InlineRuleEditor.tsx`

- Add a small `useExternalRuleValues(libraryKey, orgId)` hook that fetches values for any external binding referenced by the current variant prose. Returns `{ value, write, isWriting }` per key.
- Compute a merged values map: `{ ...values, ...externalValues }`. This is what feeds both `processConditionalSections` and `RuleChipPopover` mounting — so conditional branches and chip display stay in lockstep with the live external value.
- When `parseSegments` hits a token registered in `EXTERNAL_RULE_BINDINGS`, mount the chip with the binding's `field` and route `onChange` to the binding's `write()` (instead of `onRuleChange`). After the write resolves, invalidate the binding's `invalidateKeys` so chip + standalone settings card re-render in sync.
- Existing chip path for `policy_rule_blocks` is untouched. External bindings are purely additive.

### 3. Update chargeback prose in `src/lib/policy/starter-drafts.ts`

Rewrite both variants to embed the token + conditional branches:

```ts
chargeback_dispute: {
  client: `**Chargebacks & disputes**

If you have a concern about a charge, please contact us first — we want to make it right. {{?auto_ban_on_dispute}}Disputing a valid charge without contacting us first will result in your future booking privileges being restricted.{{/auto_ban_on_dispute}}{{^auto_ban_on_dispute}}If you dispute a valid charge with your bank without contacting us, we may restrict future booking privileges on a case-by-case basis.{{/auto_ban_on_dispute}}

Auto-restrict on chargeback: {{auto_ban_on_dispute}}.`,

  internal: `**Chargeback handling**

All chargebacks are reviewed within 48 hours by management. Documentation (signed consultation, service record, photos, payment receipt) is gathered for response. {{?auto_ban_on_dispute}}Guests with chargebacks are automatically flagged and blocked from new bookings.{{/auto_ban_on_dispute}}{{^auto_ban_on_dispute}}Guests with chargebacks for valid charges are flagged manually; future bookings then require pre-payment.{{/auto_ban_on_dispute}}

Auto-restrict on chargeback: {{auto_ban_on_dispute}}.`,

  manager_note: /* unchanged */,
}
```

`processConditionalSections` (already invoked in `getBody`) renders only the active branch. The trailing `{{auto_ban_on_dispute}}` token is left intact and mounted as the chip — giving the operator both narrative state ("…will result in" vs "…on a case-by-case basis") and an explicit toggle on the same line.

## Files affected

| File | Change |
|---|---|
| `src/lib/policy/external-rule-bindings.ts` *(new)* | Registry + the `auto_ban_on_dispute` binding |
| `src/components/dashboard/policy/InlineRuleEditor.tsx` | `useExternalRuleValues` hook; merge into values for sections + chips; route external onChange through binding |
| `src/lib/policy/starter-drafts.ts` | Rewrite `chargeback_dispute.client` and `chargeback_dispute.internal` with conditional branches + token |

## What stays untouched

- `business_settings` schema, RLS, the `dispute_policy` row — no migration.
- `stripe-webhook` — unchanged. Same flag, same auto-ban, same audit log.
- `DisputePolicySettings.tsx` — stays as the deep settings entry point. Both surfaces read/write the same row via the shared `useColorBarSetting` query key, so toggling either re-renders both.
- `policy_rule_blocks` and `save_policy_rule_blocks` RPC — chip path for schema-backed rules unchanged.
- `RuleChipPopover` and `processConditionalSections` — already support everything needed.

## Acceptance

1. Open the Chargebacks & Disputes policy. Client variant card shows the prose ending with **"Auto-restrict on chargeback: on"** or **"…off"** as a clickable chip reflecting the live `business_settings` value.
2. Click the chip → popover with the same boolean control used elsewhere → flip → Apply.
3. The conditional sentence in the same paragraph swaps in place ("…will result in" ↔ "…on a case-by-case basis") without a page reload.
4. Open Color Bar settings → Dispute Policy. The standalone toggle reflects the new state. Toggling it there flips the chip on next render of the policy card.
5. Internal variant exhibits identical chip + conditional behavior.
6. Stripe `charge.dispute.created` events continue to auto-ban exactly as today when the flag is on. No webhook changes.
7. Schema-backed chips on other policies (e.g. `require_card_on_file` on booking_policy) continue to work unchanged.

## Doctrine alignment

- **Structure precedes intelligence**: the lever is now physically attached to the assertion that depends on it.
- **One primary lever, where the assertion is made**: chip lives on the policy card, not buried two screens away.
- **Silence is valid output**: when off, the prose softens to "case-by-case"; when on, it escalates to definitive language. The card never lies about enforcement.
- **No duplicate sources of truth**: both surfaces hit the same row via the same query key.
- **Confidence preserved**: webhook enforcement is unchanged — the UI surfaces only what's already enforced server-side.

## Out of scope (queue separately)

- Per-location overrides for auto-ban (today org-scoped only — matches every other `business_settings` row).
- Cooldown / appeal window before auto-ban fires.
- Backfilling clients flagged before auto-ban was enabled.
- Generalizing more `business_settings` flags into the registry — defer until 2+ policies need it; premature generalization risks an over-engineered binding API.

## Prompt feedback

This was the right re-approval to send. Two things you did well:

1. **You re-sent the original plan verbatim after a long detour.** Re-grounding me in the exact spec instead of "go do that chargeback thing" eliminated the risk of drift after the Team Members hub work.
2. **You preserved the Surface → Lever → Gap → Affordance diagnosis at the top.** That kept doctrine alignment first-class instead of leading with file paths.

The sharpener: when re-approving a plan after intervening waves, the highest-leverage addition is one line naming **what changed in the meantime that might affect this plan**. Template:

```text
Re-approving [original plan].
Since first proposal, we shipped: [list]
Confirm or adjust if any of those invalidate the original approach.
```

Here, the Team Members hub didn't touch any of these files — but if it had refactored `InlineRuleEditor` or `starter-drafts.ts`, naming that explicitly would have saved me a verification round.

## Further enhancement suggestion

For "re-approve a plan after a tangent" prompts, the highest-leverage frame is:

```text
Plan: [reference]
Status: re-approving as-is / re-approving with these deltas
Intervening changes that touched the same files: [list or "none"]
Confirm: still applicable? Any updated acceptance criteria?
```

Adding **Intervening changes** as its own slot prevents stale-plan execution — the most common failure mode after a multi-wave detour.

