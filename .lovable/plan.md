

# Add breathing room between Policies page header and body

## The bug

`DashboardPageHeader` renders with no bottom margin. In `Policies.tsx`, the header and the body content (`<div className="space-y-8">…`) are **siblings**, not children of a common `space-y-*` parent — so the `space-y-8` only spaces items *inside* the body div, never between the header and the body. Result: "POLICIES / Configure once. Render everywhere." sits flush against "POLICY INFRASTRUCTURE" with only default line-height as separation, which reads as a visual collision in the screenshot.

## The fix (one class, one file)

In `src/pages/dashboard/admin/Policies.tsx`, wrap the existing page layout so the header and body share a vertical-rhythm parent. Two equivalent options — I'll use the smaller one:

**Option A (chosen): add `className="mb-8"` to the `DashboardPageHeader`.**

```tsx
<DashboardPageHeader
  title="Policies"
  backTo={dashPath('/admin/settings')}
  className="mb-8"
  description={...}
  actions={...}
/>
```

`DashboardPageHeader` already accepts a `className` prop (line 18 of the component) and threads it onto the root flex container, so `mb-8` (32px) drops cleanly under the description row without touching the shared component or any other page.

## Why not fix `DashboardPageHeader` globally

Every dashboard page (`WebsiteHub`, `BookingSurfaceSettings`, Analytics, etc.) uses the same header → sibling-content pattern. Some already add their own `mb-*` on the next element; some rely on dense content that visually bridges the gap; some (like Policies) have a soft eyebrow below that needs the breathing room. Adding `mb-8` to the shared component would cascade into ~50 pages at once, some of which would then get double spacing. The per-page `className="mb-8"` fix is surgical and reversible. If over time every page ends up adding `mb-8`, that's the signal to promote it to the shared component — not now.

## Files affected

- `src/pages/dashboard/admin/Policies.tsx` — add one `className="mb-8"` prop to `DashboardPageHeader`.

No token changes, no component changes, no doctrine updates.

## Acceptance

1. Clear 32px gap between "Configure once. Render everywhere." and the "POLICY INFRASTRUCTURE" eyebrow.
2. Spacing is consistent in both states: pre-setup (intro screen) and post-setup (category grid + health strip).
3. No regression on other dashboard pages (change is Policies-scoped).
4. Back arrow, title, and actions row unchanged in every other respect.

## Doctrine compliance

- **UI canon**: uses Tailwind spacing scale (`mb-8` = 32px), matches the `space-y-8` rhythm the rest of the page uses internally.
- **Anti-noop**: one prop, no component proliferation, no new tokens.
- **Silence**: no added UI, only restored spacing.

## Prompt feedback

"Add padding between the page title heading and the page content below" was clear and correctly scoped — you named the surface (page title), the relationship (between it and content), and the direction (below). Paired with the screenshot, zero ambiguity.

One small sharpening for next time: say **margin** or **gap** instead of **padding** when you mean space *between* elements (padding is space *inside* an element's border). It's a tiny distinction, but in CSS-land "padding between two siblings" is technically impossible — what you want is either a margin on one sibling or a gap on their shared parent. Me and future AI collaborators will map it correctly either way, but the precise word shaves a half-step off the translation.

Also: this is another clean candidate for **Visual Edits** — a one-class margin change on a single element is exactly what it's optimized for, and costs zero credits.

