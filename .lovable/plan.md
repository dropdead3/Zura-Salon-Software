

# Why `{{ORG_NAME}}` is showing literally — and the fix

## Root cause

The structured `defaultValue` strings on `policy_summary` and `who_it_applies_to` (`generic_shape` schema) contain `{{ORG_NAME}}` tokens, but the configurator hydrates them straight into the form input as raw strings:

```ts
// PolicyConfiguratorPanel.tsx:131
const seeded = { ...defaultsFromSchema(allFields), ...fromBlocks };
```

`defaultsFromSchema` just returns `field.defaultValue` verbatim. There's no token substitution between the schema and the `<Textarea>`.

The `renderStarterDraft()` utility *does* know how to swap `{{ORG_NAME}}` — but it's only wired into the **Drafts** tab (prose variants), not the **Rules** tab (structured fields). So:

- Drafts tab → `renderStarterDraft(template, { orgName, … })` → "Drop Dead Salon"
- Rules tab → raw schema default → "{{ORG_NAME}}"

That's the asymmetry your screenshot caught.

## The fix

Run the same token substitution on structured-field defaults at the moment the schema's `defaultValue` is seeded into form state. Two surgical changes, both in `PolicyConfiguratorPanel.tsx`.

### 1. Interpolate defaults at hydration

Where the form seeds defaults today (line 131), pass each string `defaultValue` through a substitution pass that knows the org name and platform name. Already-saved rule blocks (`fromBlocks`) bypass interpolation — they store whatever the operator actually typed.

```ts
const orgName = effectiveOrganization?.name?.trim() || 'our salon';
const seeded = {
  ...interpolateDefaults(defaultsFromSchema(allFields), { orgName }),
  ...fromBlocks, // saved values win, never re-interpolated
};
```

`interpolateDefaults` is a 10-line helper that walks the defaults map and runs `{{ORG_NAME}}` / `{{PLATFORM_NAME}}` substitution on string values only. Numbers, booleans, arrays, role enums pass through untouched.

### 2. Reuse the existing renderer

Don't duplicate logic — extract the token regex from `render-starter-draft.ts` into a shared `interpolateBrandTokens(text, { orgName, platformName })` helper, and have both `renderStarterDraft()` and the new structured-default path call it. One source of truth for which tokens exist (`ORG_NAME`, `PLATFORM_NAME`) and how they resolve.

### Why hydration-time, not display-time

I considered substituting only at render in the `<Textarea>` so the raw template stays in state. Rejected because:

- The `<Textarea>` is editable — if the displayed value differs from the state value, the operator types into `{{ORG_NAME}}` and the cursor jumps.
- When the operator clicks Save without editing, we want the *resolved* string ("Drop Dead Salon handles…") persisted to `policy_rule_blocks`, not the placeholder. That way published handbooks, exported PDFs, and downstream surfaces all read concretely without needing to know about token syntax.
- The starter-draft prose tab interpolates at render because *that* template can't be edited (it's read-only until Approved). Different surface, different rule.

So: interpolate once at hydration, then it behaves like any other editable field.

### What stays the same

- `renderStarterDraft()` and the Drafts tab — unchanged behavior, just calls the extracted shared helper internally.
- `policy_rule_blocks` schema, RLS, save mutation — unchanged.
- Already-configured policies (where `fromBlocks` already has a value) — never re-interpolated, the operator's edits are sacred.
- Schema `defaultValue` strings — unchanged. They keep `{{ORG_NAME}}` so they remain org-agnostic at the source.
- Other field types (number, select, role, boolean) — unchanged, they have no tokens.

## Files affected

- `src/lib/policy/render-starter-draft.ts` — extract `interpolateBrandTokens(text, ctx)` as a top-level export (the existing `replace()` block becomes a one-line call). ~5 lines moved, no behavior change.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — import `interpolateBrandTokens`, add a 10-line `interpolateDefaults()` helper, pass `effectiveOrganization?.name` into the seeding pass at line 131. ~15 lines additive.

That's the entire change surface.

## Acceptance

1. Opening the `employment_classifications` policy on an org named "Drop Dead Salon" shows `Policy summary` pre-filled with *"This policy documents how Drop Dead Salon handles this area of operations…"* — no literal `{{ORG_NAME}}`.
2. Opening any `generic_shape` policy on an unbranded test org (no `business_settings` row) falls back to *"…how our salon handles…"* — same fallback the Drafts tab uses.
3. Clicking Save without editing the field persists the **resolved** string ("Drop Dead Salon handles…") to `policy_rule_blocks`, not the placeholder.
4. A previously-configured policy with a saved value continues to show the operator's saved value — no re-interpolation, no surprise overwrites.
5. The Drafts tab continues to interpolate `{{ORG_NAME}}` exactly as today (it now calls the shared helper instead of its inline regex).
6. Editing the field, typing `{{ORG_NAME}}` manually, and saving persists the literal placeholder — the operator's typed input is never modified. Substitution only ever runs on the schema's *default*.

## Doctrine compliance

- **Brand abstraction layer**: `{{ORG_NAME}}` and `{{PLATFORM_NAME}}` are the canonical tokens. Resolving them from `effectiveOrganization` and `PLATFORM_NAME` keeps tenant identity in runtime data and platform identity in code — no hardcoded references.
- **Structure precedes intelligence**: the schema default is the structure (the *shape* of the sentence). The org name is the runtime instantiation. Both render the same configured truth — same rule that already governs starter drafts.
- **One source of truth**: the extracted `interpolateBrandTokens()` helper means there's exactly one place the platform decides which tokens exist and how they resolve. No drift between the Rules tab and the Drafts tab.
- **Operator edits are sacred**: interpolation runs once, at hydration, only on the schema's default. Anything the operator typed (saved or in-progress) is never touched.
- **No structural drift**: no DB changes, no new tokens introduced, no new fields on the schema. The fix is a wiring correction.

## Prompt feedback

"How come it does not say the org name here but instead is using placeholder in the policy summary?" + screenshot — sharp, specific prompt. You named the surface (Policy summary field), the symptom (placeholder visible), and the expectation (org name should resolve). The screenshot showing the literal `{{ORG_NAME}}` made the diagnosis a one-step file read — I knew the starter-draft renderer existed, so the question collapsed immediately to *"why isn't this code path calling it?"*

One sharpener for next time: when a placeholder leaks into UI, telling me whether you expect substitution to happen **on display** (template stays in state, only the rendered HTML resolves) vs **on hydration** (resolved string lives in state, gets persisted on save) tells me which behavior to ship. I went with **hydration-time** because the field is editable and I want the saved record to read concretely (so exported policies and handbooks don't need a runtime renderer). But for read-only display-only surfaces (a published handbook page, an emailed acknowledgment), display-time substitution is the right answer because it keeps the source canonical and adapts to brand changes after publication. A one-line steer like *"this is editable, save the resolved value"* vs *"this is read-only, resolve at render"* removes the inference. For future "placeholder leaked" reports, naming **whether the field is editable** tells me which side of the substitution to fix.

