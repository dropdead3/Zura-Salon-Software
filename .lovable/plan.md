

## Prompt review

Sharp visual catch — the dashed muted button reads as "disabled" rather than "actionable secondary." Sharper next time: tell me whether you want it to (a) match the primary "Continue" violet (loud), (b) become a solid secondary tile (medium), or (c) keep the dashed-outline pattern but bump contrast (subtle). I'll plan for (c) since it preserves the visual hierarchy below the primary "Continue" CTA — a louder treatment would compete with it.

## Diagnosis

`src/components/dashboard/schedule/QuickBookingPopover.tsx` L1899–1907:

```tsx
<Button
  variant="ghost"
  className="w-full h-9 text-xs text-muted-foreground border border-dashed border-border hover:bg-muted/50 hover:text-foreground"
  ...
>
  + Add service from another category
</Button>
```

Three subtlety problems compounding:
1. `text-xs` (12px) — smaller than other interior text
2. `text-muted-foreground` + `border-border` — both fade into the popover surface in dark mode
3. `h-9` — short button next to the prominent `Continue` primary

## Plan — Wave 22.19: Promote "+ Add service from another category" affordance

### Fix

`src/components/dashboard/schedule/QuickBookingPopover.tsx` L1899–1907:

- Bump text size: `text-xs` → `text-sm`
- Strengthen text color: `text-muted-foreground` → `text-foreground/80` (legible in both modes, still secondary to Continue)
- Strengthen border: `border-border` → `border-primary/30` (ghost-violet hint, ties to brand without competing)
- Bump button height: `h-9` → `h-10` (matches Continue's vertical rhythm one step down)
- Add icon: import `Plus` from lucide-react and use `<Plus className="h-4 w-4 mr-1.5" />` — replaces the literal `+ ` glyph for crisper rendering and clearer affordance
- Strengthen hover: `hover:bg-muted/50 hover:text-foreground` → `hover:bg-primary/10 hover:text-foreground hover:border-primary/50` — confirms it's a real action when hovered
- Keep `variant="ghost"`, `border border-dashed`, `w-full`, and `rounded-md` (default) so it still reads as "secondary add-more" not "primary CTA"

Resulting markup:
```tsx
<Button
  variant="ghost"
  className="w-full h-10 text-sm text-foreground/80 border border-dashed border-primary/30 hover:bg-primary/10 hover:text-foreground hover:border-primary/50 transition-colors"
  onClick={() => setSelectedCategory(null)}
>
  <Plus className="h-4 w-4 mr-1.5" />
  Add service from another category
</Button>
```

Plus add `Plus` to the existing `lucide-react` import at the top of the file (already imports `X`, `Sparkles`, `Coffee` etc., so just append).

### Acceptance checks

1. Button is clearly visible against the popover background in dark mode (Zura theme)
2. Button visibly reads as "secondary action" — does not compete with the primary violet "Continue" CTA
3. Hover state tints violet to confirm interactivity
4. Text is comfortably legible at standard reading distance (no squinting)
5. Button height aligns better with surrounding 40px rhythm
6. Plus icon renders crisply (no font-glyph artifacts)
7. Light-mode rendering also improves (not just dark)

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — single button update at L1899–1907 + add `Plus` to lucide-react import

### Open question

None.

### Deferred

- **P3** Standardize a shared `<DashedAddMoreButton>` component if this pattern appears elsewhere (e.g., add-on selectors, multi-stylist booking). Trigger: when the same dashed-add affordance shows up in 3+ surfaces.

