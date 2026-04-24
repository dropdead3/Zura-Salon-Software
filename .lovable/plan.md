

## Why the accent isn't visible

The CSS variable `--platform-primary` is **only defined inside `.platform-theme` / `.platform-light` / `.platform-dark` scopes** (verified in `src/index.css` lines 2148–2247). Those classes are restricted to the platform admin layer (`/dashboard/platform/*`) by the **Platform Theme Isolation** canon.

You're on `/org/drop-dead-salons/dashboard/schedule` — an **organization** route. There, `--platform-primary` resolves to nothing, so:

```css
border-left-color: hsl(var(--platform-primary)/0.7)  →  transparent
```

The class is being applied. The color just doesn't exist in this scope. That's why nothing renders.

This was a doctrine violation on my part: I reached for a "purple" token without checking it was scope-legal. Top Staff (the reference) uses `chart-4` — a semantic chart token defined in the org theme — exactly because chart tokens are theme-portable.

## The fix

### File 1 — `src/lib/design-tokens.ts`

Replace the broken token (line 304–305):

```ts
// ❌ Current — uses platform-scoped variable that doesn't resolve on org routes
export const LEADING_ACCENT_BORDER =
  'border-l-[3px] border-l-[hsl(var(--platform-primary)/0.7)] ring-1 ring-[hsl(var(--platform-primary)/0.08)]';

// ✅ Replacement — uses primary (org-scoped, exists everywhere)
export const LEADING_ACCENT_BORDER =
  'border-l-[3px] border-l-primary/70 ring-1 ring-primary/10';
```

`primary` is the org dashboard's brand purple — defined in every theme (Zura, Cream, Rose, Sage, Ocean, Ember, Noir) per the dashboard theme orchestration canon. It will:
- Resolve on every dashboard route
- Adapt automatically when the user switches themes
- Stay purple in the default Zura theme
- Match the existing primary ring used on selected appointment cards (already on line 684)

### File 2 — no changes
`AppointmentCardContent.tsx` already imports and applies `LEADING_ACCENT_BORDER` correctly on line 681. Once the token resolves to a real color, the border will appear.

## Why this won't recur

Adding the canon entry below to memory locks the rule in:

> Tokens prefixed `--platform-*` are scoped to `.platform-theme` / `.platform-light` / `.platform-dark` and **MUST NOT** be referenced from organization dashboard components. Use `primary`, `chart-N`, or other org-scoped semantic tokens instead.

I'll save this as a Core memory rule so future accent / color decisions check scope before token selection.

## QA checklist
- Schedule cards on `/org/.../dashboard/schedule` show a 3px purple left border that curves into the card's `rounded-[10px]` corners
- Border appears on Day, Week views
- Skipped on compact cards, blocked/break cards, agenda variant
- Cancelled cards: border dims with parent `opacity-60`
- Selected cards: `ring-primary` selection halo renders cleanly outside the left border
- Theme switch (Zura → Cream → Rose etc.): border color follows the active theme's `--primary`, not stuck on purple
- Light + dark mode: border stays visible at appropriate contrast

## Enhancement suggestion

Add a one-line **canon test** that grep-fails CI if any file outside `src/pages/dashboard/platform/**` or `src/components/platform/**` references `--platform-` or `platform-primary`. That converts this class of bug from "ship → user reports → debug" to "blocked at commit." It's the same canon-pattern enforcement gate already used for typography weight bans.

