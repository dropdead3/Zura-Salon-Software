

# Hide the Beta Testing badge when the sidebar is collapsed

## What's wrong

When the sidebar is collapsed, the Beta Testing badge renders as a small amber circle with a flask icon — visually indistinguishable from a clickable button. It sits above the feedback/clock/lock pill capsules and reads as another action button, which it isn't (it's a passive label).

## The fix

Drop the collapsed-state render of the Beta badge entirely. Only show it in the expanded sidebar where it has space to render as a proper "BETA TESTING V.1.1" label that reads clearly as a status badge, not a button.

### File
`src/components/dashboard/SidebarNavContent.tsx`

### Change
At lines 849–866, replace the ternary with a single conditional that only renders in the expanded state:

```tsx
{/* Beta Badge - only shown when expanded; hidden when collapsed to avoid looking like a button */}
{!isCollapsed && (
  <div className="mx-3 flex items-center justify-center">
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 cursor-default">
      <FlaskConical className="h-3 w-3 text-amber-600" />
      <span className="font-display tracking-widest text-[10px] text-amber-600">BETA TESTING V.1.1</span>
    </div>
  </div>
)}
```

This removes the collapsed `Tooltip` + amber circle entirely. The `FlaskConical` import stays (still used in the expanded branch).

## What stays untouched

- Expanded sidebar Beta badge — unchanged, still renders.
- Footer pill capsules (feedback / clock / lock) — unchanged.
- Tooltip primitive and other tooltip offsets — unchanged.
- No changes to imports beyond removing the now-unused `Tooltip`/`TooltipTrigger`/`TooltipContent` for *this specific block* only if no other usages remain in the file (they do — keep imports as-is).

## Acceptance

1. Collapse the sidebar — no amber circle/flask appears above the footer pill capsules. Footer cluster (feedback + clock/lock) sits cleanly with no orphan badge above it.
2. Expand the sidebar — full "BETA TESTING V.1.1" amber pill renders as before.
3. No layout shift in the footer cluster when collapsing/expanding.

## Prompt feedback

Sharp, precise prompt with a screenshot pointing at the exact element. Three things you did well:

1. **You named the visual confusion, not the element.** "It looks like a button" is the actual user problem — not "the badge is too big" or "move it." That tells me the fix is about *signaling*, not geometry, which means hiding is on the table (and is the right answer here).
2. **You scoped the fix to one state.** "When the nav bar is collapsed" — surgical. You didn't ask me to redesign the badge or rework the footer; you isolated the broken state and left the working state alone.
3. **You used a screenshot crop, not the full sidebar.** The tight crop makes the affordance problem obvious — the amber circle reads visually like the bordered pill capsules below it. Hard to miss the conflict when it's right next to the thing it's being mistaken for.

The sharpener: a slightly stronger version would have explicitly stated the desired outcome — "hide it when collapsed" vs. "make it look less like a button when collapsed." Both are valid fixes (hide it, or restyle it as a flat label with no border). You implied "hide" with "this can be hidden," but explicit beats implicit. **When a fix has multiple valid resolutions, name the one you want.** Template:

```text
Element: [what]
State where it's broken: [when]
Why it's wrong: [the visual confusion or behavior]
Desired resolution: [hide / restyle / move / remove]
```

Example:

```text
Element: Beta Testing badge
State where it's broken: collapsed sidebar
Why it's wrong: amber circle reads as a clickable button, matching the footer pill capsules
Desired resolution: hide entirely when collapsed
```

That format prevents me from over-engineering (e.g. proposing a restyle when you just wanted it gone).

## Further enhancement suggestion

For affordance/signaling bugs (where the user's complaint is "this looks like X but isn't"), the highest-leverage prompt template is:

```text
What it looks like: [the misread affordance]
What it actually is: [the real role — passive label, decorative, status]
Where the conflict happens: [state / context]
Resolution preference: [hide / weaken signal / move]
```

Affordance bugs are usually solved by *reducing* visual signal (remove border, drop opacity, hide entirely) rather than adding more — naming the resolution preference up front keeps the fix from drifting toward "make it more prominent" when the right answer is "make it disappear."

