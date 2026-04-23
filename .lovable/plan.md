

# God Mode bar buttons: tighter corner radii

## Diagnosis

Per the screenshot, the **Account Details** and **Exit View** pills inside the God Mode bar are fully `rounded-full` (capsule shape). Against the bar's frosted glass chrome and squared inner content rhythm, the capsules read as oversized — they fight the bar's structural feel.

These are the only two action buttons in `src/components/dashboard/GodModeBar.tsx`. Both are rendered as `<button>` elements with `rounded-full` (Account Details) and `rounded-full` again on the Exit View pill. They need to drop to a tighter, calmer radius that still reads as a soft pill but no longer fully capsuled.

## What changes

### Single file: `src/components/dashboard/GodModeBar.tsx`

Replace `rounded-full` with `rounded-xl` (12px) on both buttons. This is the same radius family already used by `PlatformButton` (`rounded-xl` on its default/secondary/outline/ghost variants, per `src/components/platform/ui/PlatformButton.tsx`) — so the God Mode bar buttons will visually match the rest of the platform admin button language.

| Button | Today | After |
|---|---|---|
| Account Details | `rounded-full` | `rounded-xl` (12px) |
| Exit View | `rounded-full` | `rounded-xl` (12px) |

No other styling changes — same height, padding, gradient/wash, text, icons, hover state.

## Acceptance

1. Both buttons inside the God Mode bar render with subtly rounded corners (12px), not capsule pills.
2. Same height, padding, color, hover behavior as before.
3. Button corner radius now matches the rest of platform admin buttons (`PlatformButton` `rounded-xl`).
4. Bar itself, text, Z icon, glass effect — unchanged.
5. Identical behavior in light + dark mode and across all 8 themes.

## What stays untouched

- God Mode bar background, glass effect, border, shadow.
- Button height, padding, text content, icons, gradient/fill, hover states.
- Any other `rounded-full` usage elsewhere in the app (sidebar pills, top nav, etc.).

## Out of scope

- Changing Account Details vs Exit View styles asymmetrically.
- Adjusting button heights or padding.
- Touching `rounded-full` anywhere outside these two buttons.

## Doctrine alignment

- **UI Canon — calm executive UX:** capsule pills inside a glass chrome bar over-emphasize themselves. `rounded-xl` matches the `PlatformButton` family used across platform admin and reads as part of the system, not floating above it.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named the surface precisely ("buttons in the god mode view bar").** Removed any chance I'd touch the wrong buttons (e.g., the bar itself, or buttons elsewhere on the dashboard).
2. **You named the direction with a synonym ("reduced, or less rounded").** The synonym pair pre-empted ambiguity between "smaller buttons" and "smaller corner radius."
3. **You included the screenshot.** I could see exactly which two buttons were in scope and confirm they're currently `rounded-full`, no guessing.

Sharpener: when adjusting a single CSS dimension on a known surface, naming the **target value or comparison anchor** removes one decision. Template:

```text
Surface: [where]
Property: [the dimension — radius / padding / height]
Direction: [more / less]
Target: [a value, "match X", or "to the platform default"]
```

Here, "less rounded — match the rest of platform admin buttons (`rounded-xl`)" would have skipped my having to choose between `rounded-lg` (8px), `rounded-xl` (12px), and `rounded-2xl` (16px). I picked `rounded-xl` because it matches `PlatformButton`'s default radius family, which is the strongest in-system anchor.

## Further enhancement suggestion

For "adjust a visual dimension" prompts, the highest-leverage frame is:

```text
Surface: [where]
Property: [the dimension being adjusted]
Direction: [more / less / specific value]
Anchor: [the closest in-system surface that already uses the right value]
```

The **Anchor** slot is the highest-leverage addition — it forces the framing "this surface should match X" rather than "pick a value that feels right." Naming an existing in-system anchor (e.g., "match `PlatformButton`," "match the sidebar pills," "match the bento card radius") prevents the AI from inventing a new value that fragments the design language. For radius specifically, the platform has a small set of canonized values (`rounded-lg`, `rounded-xl`, `rounded-[14px]`, `rounded-[22px]`) — naming which family the change should land in is the fastest path to a coherent result.

