` tag. This is a conversational acknowledgment.

Confirmed. That four-part frame is the right one to lock in for any "the lever exists in the data model but isn't reachable from the surface that asserts it" situation.

The reason it works is each slot forecloses a specific failure mode:

- **Surface** prevents me from fixing the lever in the wrong place (e.g., editing the schema when the disclosure card was the actual breach).
- **Underlying lever** prevents me from inventing a new toggle when one already exists structurally — which would have created a duplicate source of truth.
- **Current gap** forces a diagnosis ("the lever isn't exposed here because…") rather than a symptom fix. That's what surfaces architectural mismatches like the `processConditionalSections` extraction we needed.
- **Desired affordance** is the highest-leverage slot. Without it, fixes drift toward "add a link to settings" — which is the doctrinal opposite of "the lever lives where the assertion lives." Naming `chip` forced the inline-popover solution; naming `switch` would have produced a different (and wrong, in this context) layout; naming `settings link` would have produced the failure mode you were explicitly pushing back against.

Worth pairing with the **Bug / Missing capability / Resolution** template from earlier — they compose well. The bug-vs-capability split decides *what* to fix; the surface-lever-gap-affordance frame decides *where* and *how* the fix lands.

Both are now battle-tested against real waves on this codebase, not theoretical.Confirmed. That four-part frame is the right one to lock in for any "the lever exists in the data model but isn't reachable from the surface that asserts it" situation.

The reason it works is each slot forecloses a specific failure mode:

- **Surface** prevents me from fixing the lever in the wrong place (e.g., editing the schema when the disclosure card was the actual breach).
- **Underlying lever** prevents me from inventing a new toggle when one already exists structurally — which would have created a duplicate source of truth.
- **Current gap** forces a diagnosis ("the lever isn't exposed here because…") rather than a symptom fix. That's what surfaces architectural mismatches like the `processConditionalSections` extraction we needed last wave.
- **Desired affordance** is the highest-leverage slot. Without it, fixes drift toward "add a link to settings" — the doctrinal opposite of "the lever lives where the assertion lives." Naming `chip` forced the inline-popover solution; naming `switch` would have produced a different layout; naming `settings link` would have produced exactly the failure mode you were pushing back against.

Worth pairing with the **Bug / Missing capability / Resolution** template from two waves ago — they compose well. The bug-vs-capability split decides *what* to fix; the surface-lever-gap-affordance frame decides *where* and *how* the fix lands.

Both are now battle-tested against real waves on this codebase, not theoretical.

One refinement worth flagging for next time you use the frame: **Desired affordance** can carry an implicit "and not X" — naming what to avoid is sometimes more clarifying than naming what to build. Example: "Desired affordance: inline chip — *not* a settings page link, not a sheet-only toggle." That preempts me from proposing the wrong shape even when the right shape is obvious.

<lov-actions>
<lov-suggestion message="Add an affordance (chip vs switch vs link) requirement to the prompt flow so lever-mapped policies always surface in the same place as the assertion.">Add affordance spec to UI</lov-suggestion>
<lov-suggestion message="Implement a guard in InlineRuleEditor to route conditional templates through the same processConditionalSections renderer so no raw template tokens ever leak.">Enforce conditional render in editor</lov-suggestion>
<lov-suggestion message="Create a unified Bug/Missing capability/Resolution template that automatically asks for Surface → Lever → Gap → Desired affordance when a toggle exists but isn’t reachable.">Add missing-capability prompt template</lov-suggestion>
<lov-suggestion message="Add a UI test that toggling require_card_on_file updates the rendered disclosure card (and never leaves it blank or showing template syntax).">Improve toggle placement test</lov-suggestion>
</lov-actions>