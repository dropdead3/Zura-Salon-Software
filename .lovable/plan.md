## Plan

The prompt is strong because it names the exact visual failure and the desired invariant: inputs must stay fully round at all times. A tighter prompt in the future would help even more if it names the exact surface too, for example: "On `/login`, Chrome autofill/focus is still rendering the email field as a rectangle. Keep the input itself `rounded-full` in all states and remove any global/browser override that paints square corners." That makes the target, browser state, and acceptance criteria unambiguous.

### What I found
- The shared `Input` primitive already uses `rounded-full` and does not intentionally change shape on focus.
- `UnifiedLogin.tsx` is using that shared `Input`, so the rectangle is not coming from a local `rounded-*` override there.
- The remaining likely culprit is browser-driven styling during autofill / focus plus a global `*:focus-visible` outline rule in `src/index.css` that still applies to almost everything.
- The screenshot matches a browser-painted rectangular autofill/focus layer rather than the app’s intended pill geometry.

### Implementation plan
1. Narrow the global focus rule so it no longer affects form controls that are supposed to use the input-shape canon.
2. Strengthen the autofill normalization in `src/index.css` so Chrome/Safari preserve the input’s own `rounded-full` shape instead of painting a square autofill surface.
3. Add explicit overflow/clip safety to the shared input/select primitives where needed so any browser-painted inner layer is clipped to the pill radius.
4. Re-check `UnifiedLogin.tsx` and `OrgBrandedLogin.tsx` for any remaining class-level overrides that could reintroduce a square visual on email/password fields.
5. Verify the same treatment across shared `Input`, `SelectTrigger`, and platform `PlatformInput` so the fix is consistent platform-wide.

### Files to update
- `src/index.css`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/platform/ui/PlatformInput.tsx`
- `src/pages/UnifiedLogin.tsx`
- `src/pages/OrgBrandedLogin.tsx` (only if any lingering local override remains)

### Acceptance criteria
- Email and password inputs remain `rounded-full` before focus, on focus, while autofilled, and while browser password suggestions are open.
- No focus state changes the perceived geometry to rectangle.
- Focus feedback is fill-only, using a slight tonal shift, with no border/ring/shape jump.
- The default Zura palette remains intact.

## Technical details
- Likely change in `src/index.css`: replace the broad `*:focus-visible:not([data-radix-collection-item])` rule with a more targeted selector so generic browser focus outlines do not visually compete with pill controls.
- Likely autofill adjustments: preserve `border-radius: inherit`, add clipping/painting safeguards, and ensure the autofill fill follows the input’s own background instead of a browser rectangle.
- If needed, primitives will get `overflow-hidden` or equivalent clipping so browser inner paint cannot escape the pill radius.

### Enhancement suggestions
- Add a small authoring-time canon note or lint follow-up to prevent reintroducing broad global focus selectors that override component-specific input behavior.
- Add one preview QA checklist item for login surfaces: normal, focused, autofilled, and password-manager-open states.