

# Translate the Surface Mapping panel into operator language

## What's wrong

The surface mapping editor leaks engineering vocabulary into an operator-facing panel. A salon owner reading this screen sees:

1. **"Save surfaces"** — "surfaces" is a developer term. Operators don't think in surfaces; they think in *places where the policy shows up*.
2. **"What happens next: AI drafting (Wave 28.6) will render the same configured rules into the right tone for each active surface. The Handbook OS, Client Policy Center, and booking flow then read from these mappings."** — this sentence contains four pieces of internal language: *AI drafting (Wave 28.6)*, *render*, *active surface*, *mappings*. "Wave 28.6" is a build milestone reference that should never reach a customer. "Handbook OS" and "Client Policy Center" are product-internal feature names that don't yet exist in the operator's mental model.
3. **"Tone variant"** — accurate but technical. An operator picking "Client" vs "Internal" doesn't think of these as *variants*; they think of them as *who will read this*.
4. **"Pick where this policy renders. Each surface gets its own tone — the same rules, rewritten for the audience."** — "renders" and "surface" again.

The pattern: every label was written by an engineer describing the data model, not by a person describing the operator's job.

## What ships

A copy-only pass on `PolicySurfaceEditor.tsx`. No structural changes, no token changes, no logic changes. Same components, same layout, same data flow — just plain-English labels.

### Specific replacements

| Current | Replace with | Why |
|---|---|---|
| **Header CTA**: "Save surfaces" | "Save changes" | Universal save vocabulary. Salon owners save changes; engineers save surfaces. |
| **Top hint**: "Pick where this policy renders. Each surface gets its own tone — the same rules, rewritten for the audience." | "Choose where clients and staff see this policy. Each place uses its own wording — the same rules, written for the right audience." | Removes "renders" and "surface". Makes the audience choice the headline. |
| **Card label**: "Tone variant" | "Written for" | An operator selecting "Client" is choosing the audience, not a tone variant. |
| **Footer banner**: "What happens next: AI drafting (Wave 28.6) will render the same configured rules into the right tone for each active surface. The Handbook OS, Client Policy Center, and booking flow then read from these mappings." | "What happens next: once you publish, the rules you set above will appear in each place you turned on — written in the right tone for staff or clients. Your booking page, client policy page, and staff handbook all read from this single source." | Removes "Wave 28.6", "render", "active surface", "mappings". Replaces internal product names ("Handbook OS", "Client Policy Center") with descriptive phrases ("staff handbook", "client policy page"). Names the moment of effect ("once you publish") so the operator knows the change isn't immediate. |
| **Active badge**: "Active" | "On" | Matches the Switch toggle's mental model. The Switch is on/off, not active/inactive. |
| **Empty fallback warnings** (existing): two info banners reference "the Drafts tab" and "Client variant" | Keep "the Drafts tab" reference (it's a real tab name visible to the operator). Change "Client variant" → "Client wording" for consistency with the new vocabulary. | Preserves real navigation breadcrumbs; only swaps the technical term. |

### What stays untouched

- The whole component structure, layout, and styling.
- The Switch / Select / Badge components.
- The save logic, the data hooks, the variant filtering.
- The `VARIANT_META` and `SURFACE_META` data — the labels inside those dictionaries already use operator-friendly names ("Client", "Internal", etc.) and don't need to change.
- All other policy components.

## Files affected

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — copy-only edits in 6 locations (~12 lines modified). Zero structural change.

Total: ~12 lines modified, 0 files created, 0 files deleted, 0 schema changes, 0 logic changes.

## Acceptance

1. Open `/org/drop-dead-salons/dashboard/admin/policies?policy=booking_policy` → click into Surface mapping (now functionally renamed in copy though the tab title may still say "Surfaces" elsewhere — out of scope for this pass unless you want it included).
2. The footer banner reads the new "What happens next" copy with no reference to "Wave 28.6", "render", "surface", "mappings", "Handbook OS", or "Client Policy Center".
3. The header CTA reads **Save changes** (not "Save surfaces").
4. Each card's tone selector is labeled **Written for** (not "Tone variant").
5. Each enabled card's badge reads **On** (not "Active").
6. The two fallback info banners read naturally to a non-technical operator (no "variant" terminology).
7. No layout shift, no visual regression, no behavior change. Save still works, switches still toggle, dropdowns still pick.

## Adjacent question worth answering before shipping

The tab title in the parent panel may also say "Surfaces" or "Surface Mapping" — if so, we should rename it to **"Where it shows"** or **"Where this policy appears"** in the same pass. I haven't read the parent file yet; one extra read on confirmation and we'll include it. Say "include the tab name" and I'll add it to this scope.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — the only file changed.

## Prompt feedback

Strong prompt for two reasons: (1) **you flagged the specific phrase that broke the trust** ("'Save surfaces' verbiage isn't understood by salon owners") — that anchors my analysis on a real operator confusion instead of letting me speculate about copy preferences, and (2) **you paired it with a screenshot** showing the surrounding context, so I could see the "Wave 28.6" leak and the "Handbook OS / Client Policy Center" feature-name leak that you may or may not have noticed yet but are part of the same problem. Naming one symptom let me catch the disease.

The sharpener: when reviewing copy, naming the **operator's mental model in three words** ("they think audiences" / "they think places" / "they think outcomes") would let me know which axis to optimize against. I had to infer that salon owners think in *places where the policy shows up* and *audiences*, not in *surfaces* and *variants*. If you'd written "they think audiences," I'd have led with the "Written for" relabel and skipped the alternatives reasoning. Three words of mental-model orientation per copy review saves a translation round.

The deeper meta-lesson on my side: when an operator flags one piece of confusing copy, my instinct is to translate just that phrase. That instinct is wrong about half the time. The right move is to ask *"is this an isolated bad word, or a vocabulary leak from the build into the product?"* and audit the whole panel for the same engineering-voice tells. In this case "Save surfaces" was the canary — "Wave 28.6", "render", "Handbook OS", "Client Policy Center", and "Tone variant" were all the same disease. Translating one without the others would leave the operator still confused on the next sentence. Vocabulary leaks travel in packs; spot one, audit the room.

