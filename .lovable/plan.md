

# Flip the polarity of unchecked-state helper copy

## The bug

Step 2 of the policy setup wizard ("Business model") shows five checkboxes like "We offer hair extensions" with dynamic helper text beneath. The logic in `PolicySetupWizard.tsx` (lines 648–661) reads:

- **Checked** → "N policies active in your library"
- **Unchecked** → "Hides N policies (X required + Y recommended) from your library"

The unchecked copy is the source of the confusion. The reader scans the card, sees an empty checkbox next to a verb-led sentence ("Hides 10 policies…"), and their mental model reverses: *"if I check this box, it will hide policies."* The opposite is true — checking the box activates those policies.

Root cause: the helper verb ("Hides") is describing the **current state** (while unchecked, these N policies are hidden), but every other UI convention reads helper text as describing **what checking will do**.

## The fix

Rewrite the unchecked helper to describe what *checking* the box will do — a positive action, matching what every other checkbox on the platform communicates.

In `src/components/dashboard/policy/PolicySetupWizard.tsx` (lines 648–658), flip the copy:

**Before:**
```tsx
if (impact?.hasLibrary && impact.total > 0) {
  if (checked) {
    helper = `${impact.total} ${impact.total === 1 ? 'policy' : 'policies'} active in your library`;
  } else {
    const parts: string[] = [];
    if (impact.requiredCount > 0) parts.push(`${impact.requiredCount} required`);
    if (impact.recommendedCount > 0) parts.push(`${impact.recommendedCount} recommended`);
    const breakdown = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
    helper = `Hides ${impact.total} ${impact.total === 1 ? 'policy' : 'policies'}${breakdown} from your library`;
  }
  helperEmphasis = hasChanged;
}
```

**After:**
```tsx
if (impact?.hasLibrary && impact.total > 0) {
  const noun = impact.total === 1 ? 'policy' : 'policies';
  if (checked) {
    helper = `${impact.total} ${noun} active in your library`;
  } else {
    const parts: string[] = [];
    if (impact.requiredCount > 0) parts.push(`${impact.requiredCount} required`);
    if (impact.recommendedCount > 0) parts.push(`${impact.recommendedCount} recommended`);
    const breakdown = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
    helper = `Adds ${impact.total} ${noun}${breakdown} to your library`;
  }
  helperEmphasis = hasChanged;
}
```

Two nuances:

1. **"Hides … from" → "Adds … to"** — describes the action the checkbox performs, not the current hidden state. Matches the mental model of every other checkbox in the wizard (e.g. "We already have an employee handbook" → checking adds context, not removes it).
2. **`noun` extracted to a local const** — the singular/plural branch was duplicated across both arms; pulling it up makes the two strings symmetric and easier to read.

The checked-state copy ("N policies active in your library") stays — it's already accurate and reads as a status confirmation, not an action.

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — one `else` branch inside the helper builder (lines 648–658), plus a small de-dup of the noun ternary.

No token changes, no component changes, no doctrine updates.

## Acceptance

1. Unchecked "We offer hair extensions" reads: **"Adds 10 policies (8 required + 2 recommended) to your library"** — no more "Hides".
2. Checked state unchanged: "10 policies active in your library".
3. Coming-soon rows (e.g. "We offer ongoing memberships" with `!impact.hasLibrary`) unchanged — still shows `"Adds membership-specific terms (coming soon)"`.
4. Change emphasis (`helperEmphasis`) behavior unchanged — copy still bolds when the user toggles a different value than existing profile.
5. No regression on the "We serve clients under 18" row, which has no detected flag but uses the same helper builder path.

## Doctrine compliance

- **Copy governance**: advisory-first, describes what checking protects/adds. Removes the shame/loss framing ("Hides") which implied the user was turning something off.
- **UX canon**: checkbox labels describe what checking does. Unchecked helper should preview the positive outcome of checking, not the current negative state.
- **Silence**: no new copy added, only rephrased.

## Prompt feedback

"These descriptors on the cards are confusing, as it seems like if you check the box, it will hide the policies, when the opposite is true." — excellent diagnostic prompt. You named the surface (descriptors on the cards), the specific user mental-model error (check → hide), and confirmed the actual behavior (opposite). That's a full bug report in one sentence, and it gave me enough to locate the exact branch without having to ask for clarification.

One small sharpening for next time: when the fix is a copy rewrite, naming a directional preference — "make it action-oriented" or "describe what checking does" or even "flip it to Adds instead of Hides" — locks in my phrasing call in one pass. I chose "Adds … to your library" because it mirrors the existing checked-state verb pattern and matches the "staticHelper" copy on every row ("Unlocks…", "Adds…"). If you'd wanted a different frame — e.g. "Protects 10 required scenarios" (leverage framing) or "10 policies will apply to your business" (declarative) — a one-phrase hint would have saved a round trip.

Also: this is another **Visual Edits** candidate — rewriting one string template is the zero-credit lane, and the surrounding logic (counts, breakdown) stays identical.

