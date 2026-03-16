

# Enhance Feature Reveal Section (Section 4)

## Current State
The "What You Get" section has a 2-column layout: left side has 5 clickable feature cards, right side shows a visualization panel. The image shows this section on a dark theme. Issues:

1. **Feature cards lack visual weight** — flat borders with minimal differentiation between active/inactive states
2. **Visualization panel feels static** — no header treatment, content floats in a plain card
3. **Feature titles use `text-sm`** — too small for a sales page feature showcase; should be more prominent
4. **Active state is subtle** — only `bg-primary/5` and a faint border change; hard to scan
5. **No uppercase on feature titles** — inconsistent with Termina convention used elsewhere on the page
6. **Mobile pill selector lacks active ring** — hard to tell which is selected at a glance
7. **Visualization panel has no header bar** — the icon + label inside each panel content area could be elevated to a persistent card header
8. **`rounded-xl` on feature buttons** — should be `rounded-lg` (L1 inner elements)
9. **CTA button at bottom of section** feels disconnected — no visual bridge from features to action

## Plan

### Feature Selector Cards (Desktop)
- **Title**: Bump from `text-sm` to `text-base` and add `uppercase` to match Termina convention
- **Active state**: Strengthen to `bg-primary/10 border-primary/30` (from `/5` and `/20`) for clearer selection
- **Radius**: Fix `rounded-xl` → `rounded-lg` (L1 compliance)
- **Description**: Keep `text-sm font-light` but tighten `mt-0.5` → remove (parent gap handles it)

### Mobile Pill Selector
- **Active pill**: Add `ring-1 ring-primary/30` for stronger active indicator
- **Sizing**: Bump padding from `px-3 py-2` to `px-4 py-2` for better touch targets

### Visualization Panel
- **Card header**: Add a persistent header bar with the active feature's icon + label, separated by a `border-b`, so the panel has structural identity regardless of content
- **Inner content blocks**: Ensure consistent `rounded-lg` (L1) on all inner `bg-muted/40` containers
- **Min height**: Keep `min-h-[320px]` for stability

### Section Header
- Add a subtle eyebrow label above "What You Get" using `tokens.heading.subsection` pattern for hierarchy

### CTA Bridge
- Remove the disconnected `ActivateButton` at the bottom; it's already in the hero and pricing sections

### Files
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — all changes within Section 4 (lines ~538–767)

