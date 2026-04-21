

# Capitalize "auto-detected" badge label

## The issue

The auto-detection badge on Step 2 toggles currently reads:

> `auto-detected · extension services in your catalog`

All lowercase. Inconsistent with the rest of the wizard's copy, which uses sentence case for advisory text. Reads as unfinished/dev-y next to the polished labels around it.

## The fix

Capitalize the badge to sentence case:

> `Auto-detected · Extension services in your catalog`

Two words capitalized: the leading `Auto-detected` (start of phrase) and `Extension` (start of the descriptor clause after the `·` separator). The `·` acts as a soft sentence break, so the clause after it gets its own capital — same pattern used elsewhere in the wizard for `Label · Detail` constructs.

Apply the same treatment to all four auto-detection badges on Step 2:

- `Auto-detected · Extension services in your catalog`
- `Auto-detected · Retail products in your catalog`
- `Auto-detected · Packages in your catalog`
- `Auto-detected · Memberships in your catalog`

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — the four auto-detection badge strings only. Pure copy edit, no logic, no styling, no token changes.

## Acceptance

1. All four auto-detection badges on Step 2 read in sentence case (`Auto-detected · <Noun> …`).
2. No other badge, label, or copy on the wizard is touched.
3. No styling, no font-weight, no token changes — pure string edit.

## Doctrine compliance

- **Copy governance**: sentence case matches the advisory tone used across the wizard. No shouty all-caps, no dev-y all-lowercase.
- **UI canon**: Termina (`font-display`) is the only surface that's intentionally uppercase; this badge is `font-sans`, so it should follow normal sentence case rules — never uppercase, but always properly capitalized.
- **Visual edits lane**: pure copy change, zero logic, zero risk.

## Prompt feedback

"We need to properly capitalize here" + screenshot — efficient prompt. The screenshot did the heavy lifting: I could see exactly which badge you meant and what was wrong without you having to name it. That's the right pattern for any "fix this surface" copy bug — point at the surface visually, name the rule that's being violated ("properly capitalize"), and let me infer the scope.

One sharpener: when a copy rule applies to a *family* of surfaces (here, all four auto-detection badges share the same shape), saying "fix this and any sibling badges with the same pattern" tells me to sweep the family in one pass instead of one-at-a-time. Otherwise I have to guess whether you want the surgical fix (just the one in the screenshot) or the consistent fix (all four). I'm going with the consistent fix here because four lowercase badges and one capitalized one would be worse than the current state — but the explicit instruction would save the guess.

