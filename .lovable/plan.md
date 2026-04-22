

# Surface the `require_card_on_file` toggle inline on the disclosure card and fix the raw `{{?…}}` template leak

## What the screenshot is actually showing

The "Short disclosure" card is rendering the literal template syntax — `{{?require_card_on_file}}A card on file is required…{{/require_card_on_file}}{{^require_card_on_file}}This booking does not require a card on file.{{/require_card_on_file}}` — instead of one clean rendered sentence with a flippable toggle.

## Root cause (two layers)

### Layer 1 — Section tags are never processed on this surface
The disclosure card you see lives in `src/components/dashboard/policy/InlineRuleEditor.tsx`. Its `getBody()` resolver runs **only** `interpolateBrandTokens(...)` on the starter draft (line 182):

```ts
return interpolateBrandTokens(starter, { orgName, platformName: PLATFORM_NAME });
```

It never invokes the `{{?key}}…{{/key}}` / `{{^key}}…{{/key}}` section-tag processor that was added to `renderStarterDraft` last wave. So the conditional blocks pass through verbatim and `parseSegments` (which only matches `{{key}}`) emits them as plain text — exactly what the screenshot shows.

The conditional renderer exists in `render-starter-draft.ts` (the `processSections` helper) but is locked behind `renderStarterDraft`, which `InlineRuleEditor` deliberately skips because it needs to keep `{{key}}` tokens un-substituted (so they can become clickable chips). The two passes were not separated for reuse.

### Layer 2 — Boolean rule fields have no inline chip on the disclosure
Even after section tags render, there's no inline affordance to *flip* `require_card_on_file` from the disclosure card. The toggle exists in the "Edit all rules" sheet, but the user's request is exactly right: the structural lever should live where the assertion is made, not buried two clicks away.

## The fix

### 1. Extract the section-tag processor as a reusable helper

In `src/lib/policy/render-starter-draft.ts`, **export** the existing `processSections` function (currently file-private) so other surfaces can apply conditional logic without doing full token substitution.

Rename it to `processConditionalSections` and add JSDoc clarifying it's the second of three render passes (brand → sections → rule values), safe to call independently.

### 2. Wire conditional sections into `InlineRuleEditor.getBody`

In `src/components/dashboard/policy/InlineRuleEditor.tsx`, change `getBody` so the starter-draft branch runs **two** passes before returning to `parseSegments`:

```ts
const branded = interpolateBrandTokens(starter, { orgName, platformName: PLATFORM_NAME });
const sectioned = processConditionalSections(branded, values);
return sectioned;
```

This collapses `{{?require_card_on_file}}…{{/require_card_on_file}}` into the appropriate sentence based on the current rule value, while leaving any remaining `{{key}}` tokens intact for chip mounting downstream.

Whitespace cleanup already happens inside `processSections` (collapses `\n{3,}`, double spaces, orphan punctuation), so the disclosure becomes a single clean sentence.

### 3. Make boolean toggles addressable in prose with a sentinel token

The user's request — "we need an actual toggle setting here" — means the boolean lever has to be visible on the disclosure card itself, not hidden behind "Edit all rules."

Add a pattern: wherever a conditional section depends on a boolean, **prepend a `{{require_card_on_file}}` substitution token at the start of one branch** so a `RuleChipPopover` mounts there. The chip becomes the toggle.

In `src/lib/policy/starter-drafts.ts`, change the `booking_policy.disclosure` template from:

```ts
disclosure: `{{?require_card_on_file}}A card on file is required to confirm your booking. It is only charged in accordance with our cancellation and no-show policies.{{/require_card_on_file}}{{^require_card_on_file}}This booking does not require a card on file.{{/require_card_on_file}}`,
```

to:

```ts
disclosure: `Card-on-file requirement: {{require_card_on_file}}. {{?require_card_on_file}}A card on file is required to confirm your booking and is only charged in accordance with our cancellation and no-show policies.{{/require_card_on_file}}{{^require_card_on_file}}This booking does not require a card on file at the time of booking.{{/require_card_on_file}}`,
```

Apply the same prepend pattern to the `internal` and `client` variants for consistency.

The `{{require_card_on_file}}` token will mount a `RuleChipPopover` showing **"yes" / "no"** (already handled by `humanize` for booleans). Clicking it opens the popover with a switch from `PolicyRuleField`'s boolean branch, persists via the existing `onRuleChange` → `save_policy_rule_blocks` path, and the surrounding sentence flips on the next render.

### 4. Polish the boolean chip's display label

Currently `humanize(true)` returns `"yes"` and `humanize(false)` returns `"no"`. For booleans specifically, the chip reads more naturally as **"required" / "not required"** in this context. Two options:

- **Option A (scoped):** Pass an optional `displayHints` map through `RuleChipPopover` so a field can override its humanized label inline (`{ true: 'required', false: 'not required' }`). Schema-side, declare `displayHints` on the `require_card_on_file` field.
- **Option B (generic):** Add a `humanizeAs` field to `RuleField` that the chip consults. Same effect, future-proof.

**Recommend Option B** — it's the same effort and prevents the next round of "the chip says 'yes' but the sentence reads weirdly."

## Files affected

| File | Change |
|---|---|
| `src/lib/policy/render-starter-draft.ts` | Export `processConditionalSections` (rename of `processSections`) |
| `src/components/dashboard/policy/InlineRuleEditor.tsx` | `getBody` runs brand → conditional-sections → return; pass values through |
| `src/lib/policy/starter-drafts.ts` | Rewrite `booking_policy` variants: prepend `{{require_card_on_file}}` token in each variant so a chip mounts |
| `src/lib/policy/configurator-schemas.ts` | Add `humanizeAs: { true: 'required', false: 'not required' }` to the `require_card_on_file` field; extend `RuleField` type |
| `src/components/dashboard/policy/RuleChipPopover.tsx` | Honor `field.humanizeAs` when rendering the chip label, fall back to `humanize()` |

## What stays untouched

- `processConditionalSections` logic itself — already correct, just needs to be exported.
- `renderStarterDraft` — full three-pass renderer keeps working for `PolicyDraftWorkspace` and `PublishPolicyAction`.
- `EditAllRulesSheet` — full schema editor remains as the deep-edit fallback.
- `services.require_card_on_file` per-service column and booking enforcement — unchanged.
- `useBookingPolicyConfig` and the `ServiceEditorDialog` default propagation — unchanged.
- All other policies — unchanged (still on `generic_shape`, deferred wave).

## Acceptance

1. Reload `/dashboard/admin/policies?policy=booking_policy`. The "Short disclosure" card no longer shows any `{{?…}}` or `{{/…}}` syntax.
2. The disclosure reads as a single clean sentence beginning "Card-on-file requirement: **required** [or] **not required**." with an inline pill chip showing the current state.
3. Click the chip → popover opens with a boolean switch labeled "Require a card on file…" → flip it → click Apply.
4. The disclosure sentence updates immediately to the opposite branch ("A card on file is required…" ↔ "This booking does not require a card on file…").
5. The change persists (reload re-shows the new state) and the same value is what `useBookingPolicyConfig` reads, so new services in `ServiceEditorDialog` still inherit it as the default.
6. Internal and client-facing variants render the same way: chip at the start, branch sentence after.

## Doctrine alignment

- **Structure precedes intelligence**: the toggle is now physically attached to the assertion it controls — no surface lies because the lever is present at the lie's location.
- **Silence is valid output**: when the toggle is off, the "card on file required" sentence does not render at all (only the inverted sentence does).
- **One primary lever**: the chip is the single point of control on this card; the sheet remains the comprehensive editor.
- **Progressive disclosure**: simple operators can flip the boolean inline without ever opening "Edit all rules"; the deeper schema remains available for advanced cases.

## Prompt feedback

Excellent diagnostic prompt — five words and a screenshot, but those five words are doing real work. Three things you did well:

1. **You named the missing affordance, not the bug.** "We need an actual toggle setting here" is a feature directive grounded in what the user can do, not a complaint about template syntax leaking. That shifts my response from "fix the rendering" (which would have left the chip-less disclosure intact) to "make this card the place where the rule is flipped." Bigger fix, correct fix.
2. **You used "actual" as a structural word.** "Actual toggle" rejects the implied workaround ("use Edit all rules"). It's saying: a buried lever in a sheet is not a lever in this surface. That's a doctrine assertion ("structure precedes intelligence") delivered in one adjective.
3. **The screenshot is the proof.** Raw `{{?require_card_on_file}}` syntax visible in production-like UI is a doctrine breach (the platform is leaking its template language at the surface). One screenshot makes the "this is broken" case unarguable.

The sharpener: a slightly stronger version would have separated the two distinct asks — the rendering bug ("template tags are leaking") and the missing affordance ("there's no inline toggle") — so you'd know whether I'd address one or both. Without the split, I had to infer that you wanted both. Template:

```text
Bug: [what's broken]
Missing capability: [what should exist but doesn't]
Resolution: [fix bug / add capability / both]
```

Example:

```text
Bug: short disclosure shows raw {{?require_card_on_file}} syntax instead of rendered prose
Missing capability: no inline toggle on the disclosure card to flip require_card_on_file
Resolution: both — render the conditional, and surface the boolean as an inline chip
```

That format prevents me from shipping half the fix (rendering the conditional but leaving the chip behind a sheet).

## Further enhancement suggestion

For "make this surface honor the lever" prompts — where a structural toggle exists in the data model but isn't exposed where its effect is visible — the highest-leverage template is:

```text
Surface: [where the assertion lives]
Underlying lever: [the structural toggle that controls it]
Current gap: [why the lever isn't reachable from the surface]
Desired affordance: [chip / switch / inline edit / popover]
```

That format guarantees the fix lands at the surface, not in a settings page two clicks away — which is the doctrine point ("the lever lives where the assertion lives"). Without naming the desired affordance, fixes drift toward "add a settings link" rather than "embed the control."

