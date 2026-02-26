

## Diagnosis: Why the Previous Fix Didn't Work

The previous implementation correctly restructured the layout into 3 zones — but it used **viewport breakpoints** (`xl:flex` at 1280px). The TopPerformersCard lives inside a sidebar that's only **1/3 of the viewport width** in the `grid xl:grid-cols-3` layout of AggregateSalesCard. On a 1440px screen, the card is roughly 400px wide, yet `xl:` classes fire because the **viewport** is 1440px. Avatars stay visible, everything crams into a 400px column, and no layout shift occurs.

Viewport breakpoints cannot solve this. The card needs **container queries** — responding to its own width, not the window's.

---

## Technical Plan

### Approach: CSS Container Queries via Tailwind

Tailwind v3.3+ supports `@container` via the `@container` variant. We add `@container` to the card wrapper and use `@[width]:` arbitrary container breakpoints on child elements.

### File: `src/components/dashboard/sales/TopPerformersCard.tsx`

**1. Add container query context to the card**

On the outermost `<Card>`, add the class `@container` (Tailwind's container query declaration). This makes all descendants queryable against the card's own width.

**2. Replace viewport breakpoints with container breakpoints**

| Current (viewport) | New (container) | Purpose |
|---|---|---|
| `hidden xl:flex` on Avatar | `hidden @[400px]:flex` | Show avatar only when card is ≥ 400px wide |
| (none) | Additional container breakpoints for spacing | Tighter/wider spacing based on card width |

The 400px threshold ensures avatars only appear when the card has enough horizontal room — whether it's in a sidebar, full-width command center, or any other layout context.

**3. Specific element changes in the performer row**

Avatar line changes from:
```tsx
<Avatar className="h-9 w-9 shrink-0 hidden xl:flex mt-0.5">
```
To:
```tsx
<Avatar className="h-9 w-9 shrink-0 hidden @[400px]:flex mt-0.5">
```

**4. Add `@tailwindcss/container-queries` plugin**

Container queries require the `@tailwindcss/container-queries` plugin for Tailwind. This needs to be added:
- Install `@tailwindcss/container-queries`
- Add to `tailwind.config.ts` plugins array

**Alternative (no plugin needed):** Use inline CSS with raw `@container` queries via a wrapper `<div>` with `style={{ containerType: 'inline-size' }}` and a small CSS class that applies the breakpoint rules. However, the Tailwind plugin approach is cleaner and consistent with the existing Tailwind-first architecture.

### Fallback if plugin is undesirable

If adding a dependency is unwanted, we can use a **ResizeObserver hook** approach:
- Create a `useContainerWidth` hook that tracks the card's width
- Pass width as a prop or use a CSS custom property
- Apply conditional classes based on measured width

This is more JavaScript but zero new dependencies.

---

### Files Changed

| File | Action |
|------|---|
| `src/components/dashboard/sales/TopPerformersCard.tsx` | Add `@container` to Card, replace `xl:flex` with `@[400px]:flex` on Avatar |
| `tailwind.config.ts` | Add `@tailwindcss/container-queries` plugin |
| `package.json` | Install `@tailwindcss/container-queries` |

### What Does NOT Change

- Card header layout, sort dropdown, view all toggle
- The 3-zone stacked structure (already correct)
- Rank badge styling, animation, ScrollArea logic
- Any other component

