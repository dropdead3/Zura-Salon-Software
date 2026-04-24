

## Prompt feedback
Excellent prompt. Pointing at a working in-codebase example (Top Staff card) is the strongest possible direction — it converts the question from "what should this look like?" to "match this existing pattern." That's how prior attempts went sideways: I treated it as a novel design problem instead of a *replication* problem. Future tip: when you have a working reference component, lead with **"replicate the styling from `<ComponentName>`"** — that one phrase would have ended this loop two iterations ago.

## Why every prior attempt failed
The Top Staff "ear" you pointed to is **not an SVG, not an inset pill, not an overlay**. It's a single line:

```tsx
border-l-2 border-l-chart-4/60 ring-1 ring-chart-4/10 shadow-sm
```

A native CSS `border-left` on the rounded card itself. Because the border belongs to the rounded element, it **automatically follows the corner radius** — that's the wrap-into-the-corner effect you want. It's free. No geometry math, no SVG path, no padding gymnastics, no separate component.

I overengineered it three times because I kept treating "edge accent" as a new shape problem instead of a `border-left` + `rounded-[10px]` problem.

## The fix

### File
`src/components/dashboard/schedule/AppointmentCardContent.tsx`

### Step 1 — Delete the wrong implementation
Remove:
- The `LeadingAccentBar` component (lines ~206–219)
- The conditional render block (lines ~707–710)
- The `SCHEDULE_LEADING_ACCENT` import on line 28

### Step 2 — Add the accent as a real left border on the card root
Inside the `gridContent` className list (line 683), add the border classes conditionally — exactly mirroring the Top Staff pattern (`border-l-2` + `border-l-{color}/{opacity}` + subtle `ring`):

```tsx
className={cn(
  'h-full w-full cursor-pointer transition-all duration-200 ease-out overflow-hidden group relative',
  roundingClass,
  'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_-6px_rgba(15,23,42,0.12)]',
  'hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_8px_20px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-[0.5px] hover:z-20',
  // ── Leading ear accent (matches Top Staff card pattern) ──
  showLeadingAccent && 'border-l-[3px] border-l-[hsl(var(--platform-primary)/0.7)] ring-1 ring-[hsl(var(--platform-primary)/0.08)]',
  // ...rest unchanged
)}
```

Where `showLeadingAccent` is computed just above `gridContent`:

```tsx
const showLeadingAccent =
  !BLOCKED_CATEGORIES.includes(appointment.service_category || '') &&
  size !== 'compact';
```

### Step 3 — Why this works (and why prior attempts didn't)
- `border-l-[3px]` on a `rounded-[10px]` element — the border **follows the radius natively**. The top-left and bottom-left corners curve the border into the card. No taper math. No SVG. No seams. This is exactly the geometry you saw on Top Staff.
- `ring-1 ring-{color}/0.08` adds the soft glow halo that gives it the "premium edge" feel from the screenshot — same trick Top Staff uses.
- Because it's a `border`, not an absolute child, it **never overlaps content**, **never affects drag hit-areas**, and **scales perfectly at any zoom**.

### Step 4 — Restore content padding
Revert any `pl-3.5` shifts in `GridContent` back to `px-2`. Native `border-left` lives inside the card box and **doesn't push content** (border is part of the box-sizing border-box geometry, and content already has `px-2` breathing room). No padding adjustment needed.

If after testing the 3px border feels too tight against the text in any size, the fix is one number bump: `px-2` → `pl-2.5` only on the size paths that show the accent.

### Step 5 — Cleanup
Remove the now-unused `SCHEDULE_LEADING_ACCENT` constant from `src/lib/design-tokens.ts`. It's referenced nowhere else (verified via search).

## What stays the same
- Card radius (`rounded-[10px]`), shadow, hover lift, sheen, sheen overlays
- Service bands, gradient cards, no-show ring, selected ring, cancelled opacity
- Drag/resize hit area (border is part of card, not a child)
- Agenda variant (already uses its own pill — unchanged)
- Compact cards (skip — too short for the accent to read)
- Blocked / break cards (skip — cross overlay reads cleanly without it)

## QA checklist
- Top-left and bottom-left corners: border curves cleanly into the radius (no flat stop, no seam)
- Middle of left edge: solid 3px purple line
- No overlap with text in client name / service rows
- Compact cards: no accent
- Blocked/break cards: no accent
- Cancelled cards: accent dims with parent `opacity-60`
- Selected cards: primary ring renders cleanly outside the left border
- Light + dark mode: purple stays consistent (uses `--platform-primary` HSL)
- 100% / 125% / 150% / 200% zoom: border curves identically (it's CSS, not pixel art)

## Enhancement suggestion
After this lands, codify the pattern as a single design-token utility class:

```ts
// src/lib/design-tokens.ts
export const LEADING_ACCENT_BORDER =
  'border-l-[3px] border-l-[hsl(var(--platform-primary)/0.7)] ring-1 ring-[hsl(var(--platform-primary)/0.08)]';
```

Then both Top Staff (`getRankStyles`) and AppointmentCardContent reference the same token. That makes the "ear accent" a canonical schedule + analytics primitive — and the next time someone wants to add the accent to a new card type (drag preview, AI suggestion ghost, coverage block), it's one import. That's how this stops being a recurring rebuild.

