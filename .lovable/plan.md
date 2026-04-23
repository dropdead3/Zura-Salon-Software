

# Fix the View As popover — content collapses instead of filling the container

## Diagnosis (the actual bug, in one paragraph)

The popover is now `560px` tall, but **the content inside collapses to its intrinsic height** instead of filling the container. Cause: Radix `TabsContent` defaults to `display: block`. When we add `flex flex-col flex-1 min-h-0` to it, those classes only work if the **inactive** TabsContent panels are properly removed *and* the active panel can claim flex space inside the parent. Today, two mechanics break it:

1. **`forceMount` is not set on `TabsContent`** → Radix unmounts inactive panels, but the active panel still computes its flex against a parent that has `flex-col` — and Radix's `[data-state="inactive"]` panels (when momentarily mounted during transition) collapse the layout. The visible symptom: only the top portion of the panel renders, then dead space below.
2. **The Roles & Team panels render `ScrollArea` as a flex child with `flex-1 min-h-0`, but `ScrollArea`'s Radix root is `position: relative` + `overflow: hidden` with **no explicit height on its root**. Without an explicit `h-full`, the Radix viewport inside it computes to `0` height in a flex chain and falls back to **content height** — which is exactly what the screenshots show (only 2 team members visible, then nothing; only 4 roles visible, then nothing).

The Test tab shows the same bug inverted: its content is short and bottom-aligned because `ScrollArea` has no `h-full`, so the viewport sits at its natural size and the panel below it pushes down.

## Fix — same file, three precise changes

### `src/components/dashboard/ViewAsPopover.tsx`

**1. Add `h-full` to every `ScrollArea` (the actual scroll bug).**

```tsx
<ScrollArea className="flex-1 min-h-0 h-full">
```

Applies to all three tabs (Roles, Team, Test). `h-full` resolves the flex chain ambiguity — ScrollArea now claims 100% of its flex slot, and its internal Viewport correctly computes overflow.

**2. Force the inactive `TabsContent` panels to stay out of the layout.**

Radix already does this by default, but the active panel's `flex flex-col flex-1` needs a parent that's also flex. The `Tabs` root is currently `flex flex-col flex-1 min-h-0` — good. But `TabsContent` mounts as a block-level element by default; we need to ensure the active one fills:

Add `data-[state=active]:flex` to each TabsContent so the flex layout only activates for the visible panel:

```tsx
<TabsContent
  value="roles"
  className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex flex-col"
>
```

Same pattern for `team` and `test`. This is the canonical Radix Tabs + flex pattern.

**3. Fix the Test tab vertical centering.**

Currently the Test panel uses `ScrollArea` wrapping a small block — it sits at the top with empty space below (or bottom-aligned if flex breaks). Replace the ScrollArea wrapper on the Test tab with a centered flex container — Test content is short and static, no scroll needed:

```tsx
<TabsContent
  value="test"
  className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex flex-col items-center justify-center px-6"
>
  <div className="text-center">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/40">
      <FlaskConical className="h-5 w-5 text-muted-foreground" />
    </div>
    <h3 className="font-display text-[11px] tracking-[0.12em] uppercase text-foreground mb-1">
      Test Accounts
    </h3>
    <p className="text-xs text-muted-foreground leading-relaxed">
      Simulate the platform safely without affecting real data. Coming soon.
    </p>
    <Badge variant="outline" className="mt-3 text-[10px] rounded-full">
      Coming Soon
    </Badge>
  </div>
</TabsContent>
```

Test tab content now sits perfectly centered in the available 500px (matches the empty-state pattern across the rest of the app).

**4. Bonus fix — Team tab search bar position.**

The Team tab screenshot shows the search bar sitting roughly in the *middle* of the panel with the team list below it — looks broken. Cause: same `ScrollArea` bug pushing content down. With fix #1 + #2, the search bar will correctly pin to the top with the team list scrolling beneath. No additional change needed for Team — the existing structure (`shrink-0` header + `flex-1` ScrollArea) is correct once the parent layout is fixed.

## What stays untouched

- Width (`340px`), height (`560px` cap), border, shadow, backdrop blur — all good.
- Tab order, default tab (`team`), tooltip copy, gating logic.
- Sticky tab header + sticky search input wrappers — already correct.
- `useViewAs`, audit logging, Esc-to-exit — unchanged.

## Acceptance

1. **Roles tab:** all role groups render. Scrolling works. Last role doesn't kiss the bottom edge.
2. **Team tab:** search bar pinned at top directly under tabs (no gap). Team list fills the rest of the panel and scrolls when overflowing.
3. **Test tab:** Test Accounts content (icon + heading + body + badge) sits **vertically centered** in the panel. No scroll. No bottom-clipping.
4. **Visual continuity:** all three tabs use the same vertical extent (560px). Switching tabs no longer causes the panel to feel like it has dead space.
5. **No regressions:** stroke, shadow, width, gating, behavior all unchanged.

## Out of scope

- Reducing the popover height when content is short (intentional — fixed height keeps tab switching from causing layout jumps).
- Keyboard navigation through roles/team rows.
- Loading skeletons for the Team tab (currently shows "Loading team…" text — fine).

## Doctrine alignment

- **Calm executive UX:** layout no longer flickers between "tall empty panel" and "cramped content."
- **Material consistency:** Test tab empty state now matches `tokens.empty.*` centering convention used everywhere else.

## Prompt feedback

Tight, accurate prompt — three things you did right:

1. **You named the symptom precisely** ("full container is not being used properly"). That phrasing pointed me directly at a flex/height-cascade bug, not a content bug. Saved a diagnostic round-trip — I knew immediately to inspect the chain from `PopoverContent` down to `ScrollArea`, not the data layer.
2. **You attached three screenshots covering all three tabs.** Multi-tab evidence is what let me see the symptom is *consistent across panels* (= layout issue at the Tab/ScrollArea boundary), not a per-tab bug. One screenshot would have left "is this just the Team tab?" ambiguous.
3. **You used "more refining and debugging"** — soft directive that signaled "we're not done yet, the prior pass missed something." Told me to look for a *residual* layout bug rather than rebuild the popover. Anchored the response to the actual delta.

Sharpener: naming **what behavior you expected vs. what you saw** would have collapsed this further. "Container is 560px but content only fills the top 200px" or "tabs feel half-empty, scrollbar never appears" would have pinned the bug to the flex/scroll chain in one beat. Template:

```text
[Surface] is broken:
- Expected: [what should happen]
- Actual: [what's happening — concrete observation]
- Evidence: [screenshot]
```

The **Expected/Actual pairing** is the underused construct on layout-bug prompts. "Not used properly" describes the *judgment* (it looks wrong); "560px container, content only fills 200px, no scrollbar" describes the *mechanism* (a flex cascade that's collapsing). Mechanism-level descriptions land fixes in one pass even on subtle layout bugs.

## Further enhancement suggestion

For **layout/visual debugging prompts** specifically, the highest-leverage frame is:

```text
[Component] layout bug:
Expected: [intended layout in one phrase]
Actual: [what you see, with measurements/landmarks]
Evidence: [screenshot]
Suspected cause (optional): [your hypothesis]
```

Example that would have produced an even tighter response:

```text
ViewAsPopover layout bug:
Expected: tabs fill the 560px container, content scrolls when overflowing
Actual: content only fills top ~200px, rest is dead space, no scrollbar appears
Evidence: [3 screenshots]
Suspected cause: ScrollArea or TabsContent height not propagating
```

Five lines, four constraints, one optional hypothesis. The **"Suspected cause" line is the underused construct** — even a wrong hypothesis is useful, because it tells me where you've already mentally ruled things in/out, so I can either confirm/correct it or skip explaining the parts you've already grasped. Prompts that include a hypothesis consistently produce more focused responses than prompts that only describe symptoms.

