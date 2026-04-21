

# Clarify Step 2 is optional + other policies exist beyond this screen

## What the operator is missing

Step 2 currently shows eight applicability toggles with no framing about:

1. **Optionality** — every toggle is optional. Leaving them all unchecked is a valid state. The current copy ("Tell us how you operate — drives which policies apply") implies these *must* be answered.
2. **Scope** — these toggles only control *conditional* policy modules (extensions, retail, packages, memberships, minors, tip pooling, refund clawback, booth renters). The library still ships ~30+ baseline policies (cancellations, no-shows, sanitation, payment authorization, employee conduct, etc.) that apply to every salon regardless of what gets checked here.

Without that framing, an operator who runs a vanilla single-location commission salon might check zero boxes, hit Next, and assume they're getting *no* policies — when in fact the baseline library still adopts.

## The fix

Two surgical copy edits at the top of Step 2 in `PolicySetupWizard.tsx`. Pure copy, zero logic, zero new components.

### Edit 1 — Replace the existing intro line

**Before:**
> Tell us how you operate — drives which policies apply. You can change any of these later as your business evolves.

**After:**
> All optional. Check only what applies — every toggle here adds *conditional* policy modules on top of the baseline library that every salon receives (cancellations, sanitation, payment authorization, employee conduct, etc.). You can change any of these later as your business evolves.

The shape:
- **"All optional"** — leading two-word declaration. Sets the frame before the operator reads anything else.
- **"Check only what applies"** — corrects the implied "answer all of these" reading.
- **"adds *conditional* policy modules on top of the baseline library"** — names the architectural distinction between baseline (always) and conditional (toggle-gated).
- **"that every salon receives (cancellations, sanitation, payment authorization, employee conduct, etc.)"** — concrete examples so the operator knows the baseline isn't empty.

### Edit 2 — Add a footer note below the toggle list

A small advisory line at the bottom of the toggle stack, in `tokens.body.muted` + `text-xs`, matching the visual treatment of the existing "You can change focus areas anytime in settings." footer used elsewhere in the wizard:

> Leave everything unchecked? That's fine — you'll still get the baseline library on the next step.

This belt-and-suspenders the message for operators who skip the intro paragraph and scan straight to the toggles.

## What stays the same

- All eight toggle labels and descriptions.
- Auto-detection badges (already corrected to sentence case in the previous turn).
- The "Adds N policies (M recommended) to your library" subtitles under each toggle.
- Step 2 layout, ordering, validation, persistence (the prior turn's work stands).
- Step 3's "existing materials" framing — that's a separate concern.

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — Step 2's intro paragraph (one string), one new footer paragraph below the toggle list. Pure copy.

That's the entire change surface.

## Acceptance

1. Step 2's intro reads "All optional. Check only what applies…" with the baseline-vs-conditional distinction made explicit and concrete examples named.
2. A footer line below the toggle stack reassures operators that leaving everything unchecked still produces a baseline library on the next step.
3. No toggle labels, descriptions, or behavior change.
4. No changes to other wizard steps, no new components, no token changes.

## Doctrine compliance

- **Copy governance**: advisory-first, structured but protective. "All optional" is direct without being shouty. The phrase "adds *conditional* policy modules on top of the baseline library" explains the *why* (architectural distinction), not just the *what*.
- **Silence is meaningful**: the footer explicitly legitimizes the silent state (zero toggles checked) instead of leaving the operator to wonder if they've under-configured.
- **No structural drift**: this is the same applicability doctrine already enforced by `isApplicableToProfile` — the copy now just *names* what the system was already doing silently.
- **Persona scaling**: framing "every salon receives" in plain terms protects the solo-operator persona (who'd otherwise be intimidated by the eight-toggle wall) without dumbing it down for the multi-location operator.

## Prompt feedback

"We need to let the user know these are all optional, and there are other basic policies that will be configured beyond this screen" + the screenshot — strong, complete prompt. You named the surface, the missing information (optionality + baseline-vs-conditional scope), and the operator's likely misread, all in one sentence. I didn't have to guess intent or scope.

One sharpener for next time: when a copy fix needs to convey *two* facts (here: "optional" and "there are other policies elsewhere"), specifying whether you want them in **one sentence**, **two sentences**, or **two surfaces** (intro + footer) tells me how aggressive to be with redundancy. I'm going with **intro + footer** here because the two facts answer different anxieties (the intro answers "do I have to fill this all in?", the footer answers "wait, am I getting *any* policies if I skip everything?"), and operators tend to scan past intros — but a one-line steer like "intro only" or "belt-and-suspenders" tells me which to ship without me defaulting to the most defensive treatment.

