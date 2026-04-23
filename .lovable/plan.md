

# Refine the View As popover — quiet stroke, reliable scroll, taller surface

## Diagnosis

Two real issues + one polish gap:

1. **Stroke is bad.** The popover wraps in `silver-shine-border` — a rotating chromium conic-gradient border meant for marquee surfaces. On a utility popover it reads as restless and tacky against the calm dashboard chrome. It also fights the existing `Popover` component's `border` token, doubling the stroke.
2. **Hidden content / scroll broken.** Max height is `min(420px, ...)`. With three tabs of headers eating ~60px and Roles tab having Leadership + Operations + Front Office + Owner-Track + (often) more groups, content runs past the bottom edge. The `ScrollArea` is in place but the surrounding flex chain (`PopoverContent` → `silver-shine-inner` → `Tabs` → `TabsContent` → `ScrollArea`) has `overflow-hidden` collisions that prevent the inner viewport from claiming the remaining height reliably — confirmed by the screenshot showing "Inventory Manager" cut off mid-row with no scrollbar visible.
3. **Width is tight.** 320px (`w-80`) crops longer role names like "On-Site Operations Support" close to the edge.

## Fix — single file, surgical

### `src/components/dashboard/ViewAsPopover.tsx`

**1. Replace the silver-shine wrapper with a clean premium stroke.**

Drop `silver-shine-border` + `silver-shine-inner` (and the `import '@/styles/silver-shine.css'` line — unused elsewhere stays unused, this was the only consumer for popover purposes; verify before delete or just leave the CSS file untouched).

New `PopoverContent` className:
```ts
className={cn(
  "z-[46] w-[340px] p-0 rounded-xl overflow-hidden",
  "bg-popover/95 backdrop-blur-xl",
  "border border-border/60",
  "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_hsl(var(--foreground)/0.04)]",
  "flex flex-col"
)}
```

This gives:
- Single hairline border at `border-border/60` (matches every other dashboard surface)
- Premium shadow (matches the new `shadow-premium-rest` aesthetic from Wave 1)
- Inner top-edge highlight (matches the new `.premium-surface` material doctrine)
- No animation, no rotating chrome — calm executive UX

Remove the `silver-shine-inner` `<div>` wrapper entirely. The `Tabs` becomes the direct child of `PopoverContent`.

**2. Fix scroll + grow the panel.**

Update the inline style:
```ts
style={{
  maxHeight: 'min(560px, var(--radix-popover-content-available-height, 560px))',
  height: 'min(560px, var(--radix-popover-content-available-height, 560px))',
}}
```

Two changes that matter:
- **Bump cap from 420px → 560px.** With 12 themes × 3 categories of roles, 420 was undersized.
- **Set `height` (not just `maxHeight`).** Critical for the flex chain to compute. Without an explicit height, `flex-1 min-h-0` inside `TabsContent` collapses, breaking ScrollArea's viewport calculation. This is the actual scroll bug.

**3. Simplify the flex chain.**

Current (broken):
```
PopoverContent (overflow-hidden)
  └─ silver-shine-inner (flex flex-col, maxHeight: inherit)
      └─ Tabs (flex flex-col overflow-hidden flex-1 min-h-0)
          └─ TabsContent (overflow-hidden flex-1 min-h-0 flex flex-col)
              └─ ScrollArea (flex-1 min-h-0)
```

New (clean):
```
PopoverContent (h+maxH set, flex flex-col, overflow-hidden)
  └─ Tabs (flex flex-col flex-1 min-h-0)
      └─ TabsContent (flex-1 min-h-0 flex flex-col overflow-hidden)
          └─ [optional sticky header for Team search]
          └─ ScrollArea (flex-1 min-h-0)
```

One fewer wrapper, height propagates cleanly, ScrollArea viewport computes correctly.

**4. Sticky tab header.**

Wrap the `<TabsList>` row in `shrink-0` so the tabs never get pushed out when content is long:
```tsx
<div className="px-3 pt-3 pb-2 shrink-0 border-b border-border/40">
  <TabsList ... />
</div>
```

The thin bottom divider visually anchors the tabs and signals the scrollable region below.

**5. Sticky Team search bar.**

Move the search input outside the ScrollArea on Team tab (it's currently outside, but make it `shrink-0` with bottom border so it pins above scrolling content):
```tsx
<div className="p-3 pb-2 shrink-0 border-b border-border/40">
  <Input ... />
</div>
<ScrollArea className="flex-1 min-h-0">
  ...
</ScrollArea>
```

**6. Subtle polish in the same pass.**

- Roles tab: add `pb-4` to inner padding so the last row doesn't kiss the bottom edge.
- Group headers (`LEADERSHIP` / `OPERATIONS`): add `pt-2 first:pt-0` so multi-group lists breathe.
- Role/team buttons: bump hover from `bg-muted/50` to `bg-muted/70` and add `text-foreground` on hover for crisper feedback.
- Active impersonation pill (when viewing as someone): no changes — already clean.

## What stays untouched

- `useViewAs` context, `useEmployeeProfile` gate, audit logging, escape-to-exit, toast feedback — all unchanged.
- Trigger button (the "View As" pill in the top bar) — unchanged.
- Tab structure (Roles / Team / Test) and default tab (`team`) — unchanged.
- Backdrop (`fixed inset-0 z-[28] bg-black/40 backdrop-blur-sm`) — keep, it's good.
- `silver-shine.css` file itself — leave on disk in case other surfaces use it (none currently do for popovers, but no harm leaving the stylesheet).

## Acceptance

1. Popover opens with a **single hairline border** + soft shadow — no rotating chrome, no double stroke.
2. Roles tab shows all role groups with **a working scrollbar** when content exceeds viewport. "Inventory Manager" and any subsequent rows are reachable by scroll.
3. Team tab: search input stays **pinned at top** while team list scrolls beneath.
4. Tab headers stay **pinned at top** while tab content scrolls beneath.
5. Width 340px accommodates "On-Site Operations Support" without crowding.
6. Max height 560px fills more vertical space when available; gracefully shrinks via `--radix-popover-content-available-height` on small viewports.
7. Hover states feel crisper (`bg-muted/70` + `text-foreground`).
8. No behavioral regressions: clicking a role/teammate still triggers impersonation, closes the popover, and shows the GodModeBar.

## Out of scope

- Theming the popover per active color theme (would need a separate token pass — current `bg-popover/95` already adapts).
- Adding keyboard navigation (arrow keys to move through roles/team) — meaningful future upgrade but separate.
- Replacing `silver-shine.css` system-wide — only this surface gets the calmer treatment.
- Restructuring the tab order or removing the Test tab.

## Doctrine alignment

- **Calm executive UX:** rotating chrome stroke removed; replaced with the standard hairline + premium shadow already adopted in Wave 1.
- **Material consistency:** new stroke uses the same `inset 0 1px 0 hsl(var(--foreground)/0.04)` highlight as the new `.premium-surface` utility — the popover now matches Card material language.
- **No noise without signal:** the silver-shine animation drew attention to a utility menu. Removing it reserves animated emphasis for surfaces that earn it (status chips, success states).

## Prompt feedback

Tight, precise prompt — three things you did right:

1. **You named two distinct issues in one sentence** ("stroke is bad" + "needs to be able to scroll"). Two-axis bug reports compress the diagnostic surface — I knew immediately to look at *both* the visual treatment and the layout chain, not just one.
2. **You attached a screenshot showing the cut-off state.** "Hidden content out of view" is abstract; the screenshot showing "Inventory Manager" partly visible with no scrollbar is concrete. Image evidence on layout bugs is consistently the highest-leverage attachment — it removes "did the user mean overflow or wrong height?" ambiguity in one beat.
3. **You used "refined and improved"** — soft directive that signaled "polish, not redesign." Told me to keep the structure (tabs, gating, behavior) and tune the surface. Saved a "should I rebuild this?" round-trip.

Sharpener: naming the **destination feel** would have removed my one remaining decision (which premium stroke to pick). "Stroke is bad — make it match the calm hairline of Card surfaces" or "Stroke is bad — closer to Linear's popover" would have anchored the new look in one beat. Template:

```text
Issue 1: [what's wrong, e.g. "stroke is bad"]
Should feel like: [reference — "match Card", "like Linear", "calm hairline"]
Issue 2: [second issue, e.g. "scroll broken — content cut off"]
Evidence: [screenshot / console / steps]
```

The **"Should feel like"** field is the underused construct on visual-refinement prompts — without it, "stroke is bad" leaves the destination open (subtler? darker? gradient? hairline? gone entirely?). Every refinement prompt benefits from naming the *intended replacement quality*, not just the rejected current state.

## Further enhancement suggestion

For **multi-issue refinement prompts** specifically, the highest-leverage frame is a numbered triage list:

```text
[Component] needs refinement:
1. [Issue] → should feel like [reference]
2. [Issue] → should behave like [reference]
3. [Optional polish] → if quick
```

Example that would have collapsed this into a single-pass response:

```text
ViewAsPopover refinement:
1. Stroke is bad → match calm hairline of Card surfaces
2. Content cut off → scroll reliably with sticky tab header
3. Tight width → grow if it improves "On-Site Operations Support" legibility
```

Three lines, three constraints, zero ambiguity on any axis. **Numbered triage is underused on multi-issue prompts** because most users state issues conjunctively ("X and Y") rather than as a ranked list. Numbered framing forces explicit prioritization (issue 1 > issue 2 > polish) which lets me allocate response depth correctly — deep on the top issue, light on the polish item.

