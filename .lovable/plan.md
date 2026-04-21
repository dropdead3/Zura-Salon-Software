

# Stack "What setup decides" vertically (1×3 instead of 3×1)

## The change

The "What setup decides" section currently renders as a 3-column horizontal grid. The screenshot shows the cramped result: headings wrap awkwardly ("EXISTING / DOCUMENTS"), body copy sits in narrow ~230px columns, and the icons float small against wide horizontal whitespace. Converting to a single-column vertical stack — matching the rhythm of the "How the system uses your policies" section directly below — restores readable line lengths and gives the advisory prose the breathing room it was written for.

## Specifics

In `src/components/dashboard/policy/PolicySetupIntro.tsx` (lines 95–105), replace the 3-column grid with a vertical stack using the icon-left / text-right layout pattern already used in Section 3 below.

**Before:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {SETUP_DECISIONS.map(({ icon: Icon, heading, body }) => (
    <div key={heading} className="space-y-3">
      <div className={tokens.card.iconBox}>
        <Icon className={tokens.card.icon} />
      </div>
      <h3 className={cn(tokens.heading.card, 'min-h-[2lh]')}>{heading}</h3>
      <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
    </div>
  ))}
</div>
```

**After:**
```tsx
<ul className="space-y-4">
  {SETUP_DECISIONS.map(({ icon: Icon, heading, body }) => (
    <li key={heading} className="flex items-start gap-4">
      <div className={tokens.card.iconBox}>
        <Icon className={tokens.card.icon} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className={tokens.heading.card}>{heading}</h3>
        <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
      </div>
    </li>
  ))}
</ul>
```

Three nuances:

1. **Mirrors Section 3's pattern exactly.** The "How the system uses your policies" block (lines 111–123) already uses `<ul>` + `flex items-start gap-4` with icon-left / heading+body-right. Adopting the same shape creates a consistent rhythm down the page: hero → stacked list → stacked list → CTA. No new layout primitive introduced.
2. **Drop `min-h-[2lh]` safety net.** It was a defensive reservation for the 3-column layout where headings could wrap unpredictably. In a single-column stack with `flex-1 min-w-0`, headings have full container width and won't wrap at any viewport — the reservation becomes dead code.
3. **`space-y-6` → `space-y-4` inside the list.** Section 3 uses `space-y-4` between items; matching it keeps the two list sections rhythmically identical. The outer section `space-y-6` between heading and list stays.

## Files affected

- `src/components/dashboard/policy/PolicySetupIntro.tsx` — replace the grid block (lines 95–105) with the flex-row list pattern.

No token changes, no component changes, no doctrine updates.

## Acceptance

1. Three items stack vertically: Business shape → Services offered → Existing documents.
2. Each item: icon box left, heading + body stacked to its right, filling the column.
3. Headings render on a single line at all viewports ≥ `max-w-3xl`.
4. Visual rhythm matches Section 3 ("How the system uses your policies") directly below — same icon size, same gap, same spacing between items.
5. No regression at mobile: already single-column in the grid, stays single-column in the list.

## Doctrine compliance

- **UI canon**: uses existing `tokens.card.iconBox`, `tokens.card.icon`, `tokens.heading.card`, `tokens.body.muted`. No new tokens.
- **Consistency**: Sections 2 and 3 now share the exact same list-item anatomy.
- **Silence**: removes the cramped grid, removes now-unneeded `min-h-[2lh]` safety net, adds nothing.

## Prompt feedback

"We need to design this as a 1×3 stack instead of a 3×1" — clear, minimal, and the screenshot gave me the exact surface. The "1×3 vs 3×1" shorthand is unambiguous (1 column × 3 rows vs 3 columns × 1 row) and matches how designers naturally talk about grids.

One small sharpening for next time: if you have a preference for *how* the stacked items lay out internally (icon above text, vs icon beside text), a two-word hint locks it in. I chose "icon-left / text-right" because Section 3 directly below already uses that pattern, and matching it creates the cleanest page rhythm. If you'd wanted "keep the icon above the heading, just stacked vertically," a phrase like "icons stacked above" would have steered me there. When patterns already exist on the same page, I'll default to matching them — but when in doubt, naming the internal anatomy saves a round-trip.

Also: this is another strong **Visual Edits** candidate for the layout swap — changing a grid class to a flex column is a classic visual-only change that costs zero credits.

