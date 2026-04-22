

# Strip the route slug from surface descriptions

## What's wrong

The `client_page` surface description reads: **"Public client-facing policy page (/book/:org/policies)."** That parenthetical is a route pattern with a placeholder variable — it's how an engineer documents a path, not how an operator thinks about where their policy shows up. The title above it ("Client Policy Page") already says everything the operator needs.

While I'm in there, two of the other six surface descriptions use slightly stiff phrasing worth a light pass — but the only outright leak is the slug.

## What ships

A copy-only edit to `SURFACE_META` in `src/hooks/policy/usePolicyApplicability.ts`. No structural changes, no logic changes, no token changes.

### Description rewrites

| Surface | Current | Replace with |
|---|---|---|
| `client_page` | "Public client-facing policy page (/book/:org/policies)." | "Shown on your public policy page that clients can browse anytime." |
| `handbook` | "Internal team-facing handbook section." | "Lives in the staff handbook for your team to reference." |
| `booking` | "Inline disclosure shown before a client confirms a booking." | "Shown to clients right before they confirm a booking." |
| `checkout` | "Rules enforced at checkout (deposits, fees, surcharges)." | "Applied at checkout — deposits, fees, and surcharges." |
| `intake` | "Required acknowledgment during consultation or intake form." | "Clients agree to this during consultation or intake." |
| `manager` | "Quick-reference card surfaced when staff need to make exception calls." | "Quick reference for managers when staff need an exception call." |
| `sop` | "Step-by-step procedural reference for staff execution." | "Step-by-step guide your team follows to do this consistently." |

The `client_page` change is the operator's actual ask. The other six are minor: removing words like "surface," "render," "execution," and route patterns; landing each on a sentence a salon owner reads naturally.

### What stays untouched

- `label` and `shortLabel` for every surface — those already work for operators.
- `audience`, `defaultVariant`, `icon` — pure data fields.
- The compatibility logic (`isSurfaceCompatibleWithAudience`) and every consumer of `SURFACE_META`.
- All other policy components.

## Files affected

- `src/hooks/policy/usePolicyApplicability.ts` — 7 description strings updated. ~7 lines modified.

Total: ~7 lines modified, 0 files created, 0 schema changes, 0 logic changes.

## Acceptance

1. Open `/org/drop-dead-salons/dashboard/admin/policies?policy=booking_policy` → Surface mapping → the **Client Policy Page** card description no longer contains `(/book/:org/policies)` or any route pattern.
2. The other six surface cards read naturally to a non-technical operator (no "render," no "surface," no "execution").
3. Surface mapping behavior is unchanged: toggling, tone selection, save still work identically.
4. Three other consumers of `SURFACE_META` (`PolicyLibraryRow`, `PolicyLibraryCard`, `PolicyConflictBanner`, `ConflictRow`) display the same descriptions in their tooltips/badges — they'll inherit the cleaner copy automatically.

## Files to read for follow-on questions

- `src/hooks/policy/usePolicyApplicability.ts` — the only file changed.
- The four `SURFACE_META` consumers listed above — unchanged but worth knowing they share this dictionary.

## Prompt feedback

Sharp prompt with one move that made the diagnosis trivial: **"the slug page"** — naming the specific offending element by its category (it's a slug, not a description, not a label) told me you'd already identified the leak as a routing detail rather than a copy-tone problem. That distinction matters because the fix for "this description sounds stiff" is different from the fix for "this exposes engineering implementation." You named the second category, which is the more important one to scrub.

The sharpener: **"right?"** invites a binary yes/no, which I want to answer with more than yes — the better answer is "yes, and here are the other six descriptions in the same dictionary that need the same operator-translation pass while the file is open." When you spot one leak in a shared dictionary (`SURFACE_META`, `VARIANT_META`, status enums), it's worth widening the ask to "audit the whole dictionary for the same problem" — single-item edits in shared registries leave half the codebase still showing the bad pattern. Next time, instead of *"we don't need to show the slug here, right?"* try *"audit the SURFACE_META descriptions for engineering leaks"* — that frames the work at the right scope (the registry, not just one card) and saves a follow-up round.

The deeper meta-lesson on my side: when an operator points to one bad description in a card, my instinct is to fix that one card. That instinct is wrong. The right move is to ask *"is this a one-off string, or is this string coming from a shared dictionary that's leaking the same pattern in five other places?"* In this case `SURFACE_META` is consumed by four other components (`PolicyLibraryRow`, `PolicyLibraryCard`, `PolicyConflictBanner`, `ConflictRow`) — fixing it at the dictionary level cleans all five surfaces at once. Patching at the consumer would have left the slug visible everywhere else and required four more rounds. Same pattern as the primitive vs. caller fix from the last UI bug: trace the string to its source, fix it there, let everything downstream inherit the cleaner version.

