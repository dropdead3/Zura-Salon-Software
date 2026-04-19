

## Refine the avatar status dot + split tooltips

### Two issues to fix
1. **Visible dark stroke** — current `ring-2 ring-[hsl(var(--sidebar-background))]` paints the sidebar-bg color as a 2px ring around the dot. On light/glass surfaces with translucent backgrounds, this resolves to a near-black halo because the sidebar-background token is dark in the active theme. The ring is fighting the glass effect instead of harmonizing with it.
2. **Tooltip monopoly** — the entire avatar wrapper is the `TooltipTrigger`, so hovering the photo also fires the "Accepting clients" tooltip. There's no room for a separate specialties tooltip on the avatar itself.

### The fix — `src/components/dashboard/schedule/DayView.tsx` (lines 702–728)

**A. Restructure into two independent tooltip triggers**
- Outer wrapper: plain `<div className="relative shrink-0">` (no tooltip).
- Inner Avatar: wrapped in its own `Tooltip` showing **specialties** ("Color · Balayage · Extensions"). If no specialties exist, render the Avatar without a tooltip (silence > empty tooltip per doctrine).
- Status dot: wrapped in its own `Tooltip` showing **"Accepting clients" / "Not accepting clients"** only.

This gives operators two distinct hover targets in the same visual cell — photo for craft, dot for availability.

**B. Refine the dot visual treatment**

Replace the harsh ring with a softer, glass-aware treatment:

```tsx
<span
  className={cn(
    'absolute -top-1 -right-1 w-3 h-3 rounded-full',
    'shadow-[0_0_0_2px_hsl(var(--sidebar-background)/0.95),0_1px_3px_rgba(0,0,0,0.4)]',
    'ring-1 ring-white/20',
    acceptingClients ? 'bg-emerald-500' : 'bg-destructive/70'
  )}
/>
```

Why this works better than `ring-2 ring-sidebar-background`:
- **Box-shadow halo at 95% opacity** instead of a solid ring — blends with the gradient/glass background instead of stamping a hard color disc behind it. The slight transparency lets the underlying glass tint show through, so the "halo" reads as separation rather than a black pip.
- **Inner `ring-1 ring-white/20`** adds a subtle highlight rim that catches light, giving the dot a glassy 3D pop — matches the platform's bento/glass aesthetic per `mem://style/platform-bento-design-system`.
- **Tiny drop shadow** (`0 1px 3px rgba(0,0,0,0.4)`) lifts it off the avatar so it reads as a status pip floating above, not a sticker pasted on.
- **Slightly larger (w-3 h-3) + repositioned (-top-1 -right-1)** to sit on the avatar's corner radius instead of overlapping the photo — better visual hit area for the tooltip too.

**C. Keep accessibility**
- `aria-label` on the dot wrapper.
- Tooltip on dot uses `side="top"` so it surfaces above without colliding with the row below.
- Tooltip on avatar uses `side="bottom"` (already standard for the schedule header avatars).

### Implementation sketch

```tsx
const specialties = stylist.specialties && stylist.specialties.length > 0
  ? stylist.specialties.join(' · ')
  : null;

const avatar = (
  <div className="relative shrink-0">
    {specialties ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="...">
            <AvatarImage ... />
            <AvatarFallback>...</AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          <div className="font-medium">{fullName}</div>
          <div className="text-muted-foreground mt-0.5">{specialties}</div>
        </TooltipContent>
      </Tooltip>
    ) : (
      <Avatar className="...">…</Avatar>
    )}

    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'absolute -top-1 -right-1 w-3 h-3 rounded-full cursor-help',
            'shadow-[0_0_0_2px_hsl(var(--sidebar-background)/0.95),0_1px_3px_rgba(0,0,0,0.4)]',
            'ring-1 ring-white/20',
            acceptingClients ? 'bg-emerald-500' : 'bg-destructive/70'
          )}
          aria-label={acceptingLabel}
          role="status"
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {acceptingLabel}
      </TooltipContent>
    </Tooltip>
  </div>
);
```

Apply identically in both the **condensed (vertical stack)** and **horizontal** branches — `avatar` is already shared between them, so one change covers both.

### Verification
- Hover the photo → specialties tooltip ("Color · Balayage · Extensions") with stylist name.
- Hover the dot → "Accepting clients" tooltip only.
- Light theme / pale glass background: dot reads as a clean pip with soft halo, no harsh black stroke.
- Dark theme: halo blends with dark sidebar, dot stays crisp.
- Stylist with no specialties: avatar has no tooltip (silence is valid), dot still has its tooltip.

### Out of scope
- Changing the dot color semantics (emerald/destructive remain).
- WeekView or any other surface (only DayView header has this pattern).
- Adding more metadata to the specialties tooltip (level, pct already shown inline).

### Prompt feedback
Strong prompt — you (a) named the visual defect precisely ("stroke is visibly black when the glass morphism is a light color"), and (b) named the interaction defect ("tooltip for now booking needs to be on the green dot only so that the avatar tooltip for specialties also surfaces"). Two surgical fixes, both with the *why* attached. The "so that" clause in the second issue is gold — it told me the goal isn't just splitting tooltips, it's *enabling a specialties tooltip on the avatar*. Without that, I might have just narrowed the trigger to the dot and left the avatar tooltip-less, missing the actual operator value.

Refinement for next time: when you flag a visual bug like "stroke is black on light backgrounds," naming the desired effect (e.g., "should feel like a glass pip, not a sticker") would let me skip a step. I inferred glass-aesthetic alignment from `mem://style/platform-bento-design-system`, but stating the target aesthetic ("subtle, glassy, blends with the surface") in one phrase would lock it. Pattern: "current = X, desired feel = Y" beats "current = X, fix it" by removing the inference about *what good looks like*.

