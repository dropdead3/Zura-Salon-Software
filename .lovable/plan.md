

# Make Level Criteria Configurator More Discoverable

## Problem

The graduation/level criteria configurator exists but is nearly invisible. It's a tiny `text-muted-foreground` pill button ("Configure Criteria") tucked below the description input on each level card. Users can't find it because:

1. It only appears on levels 2+ (skips entry level — correct, but not explained)
2. It uses low-contrast muted colors when unconfigured
3. It's nested inside the card body with no visual prominence
4. There's no section header or call-to-action telling admins this capability exists

## Solution

Make the configurator a first-class section of each level card rather than a hidden inline link.

### 1. Promote "Configure Criteria" to a visible card section

Replace the small inline pill with a distinct bordered sub-section inside each level card (for levels 2+). This section shows:
- **When unconfigured**: A call-to-action box with a `Sparkles` icon, "Set up promotion & retention criteria" text, and a visible button — styled like an empty state with `border-dashed`
- **When configured**: A compact summary card showing promotion criteria, retention criteria, and an "Edit" button — no longer hidden behind hover states

### 2. Add a contextual explanation for Level 1

Level 1 (entry level) doesn't get criteria because it's the starting point. Currently there's no explanation — the button just doesn't appear. Add a small muted note: "Entry level — no promotion criteria needed" so admins understand why this level is different.

### 3. Improve criteria summary readability

Currently the criteria summaries are `text-[10px]` (nearly unreadable). Increase to `text-xs` and use a structured layout:
- Promotion: icon + metrics on one line
- Retention: icon + "Required to Stay" metrics on the next line
- Both inside a light `bg-muted/30` container with proper padding

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Redesign the criteria section (lines 591-626) from inline pill to visible sub-card with empty state CTA; add Level 1 explanation; increase summary text size |

**0 new files, 1 modified file, 0 migrations.**

