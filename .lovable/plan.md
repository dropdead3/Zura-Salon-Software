

# Stylist Levels Editor — Remove Color Progression & Improve Layout

## What Changes

### 1. Remove Color Progression section
Delete the "Color Progression" card from the right sidebar (lines 716–765). It shows current vs. future color badge previews that have no clear connection to any admin workflow. The `Palette` icon import can also be removed.

### 2. Reorganize right sidebar for clarity
Current sidebar order: Progression Roadmap → ~~Color Progression~~ → Stylists Overview → Tooltip Preview → Card Preview → Services Dropdown.

**New order with grouping:**

- **Team Distribution** (Stylists Overview — moved to top, most actionable)
- **Progression Roadmap** (criteria summary — only shown when criteria exist)
- **Website Previews** section header
  - Card Preview (how stylists appear on the website)
  - Services Dropdown (level selector on services page)
  - Tooltip Preview (info tooltip content)

This puts operational data first and groups the 3 website previews under a clear heading so admins understand these are client-facing representations.

### 3. Improve level card clarity
- Make commission rates always visible (not just as tiny `10px` text) — show them as labeled pill badges: `Svc 38%` `Retail 10%` with muted styling
- Add a subtle connector line between level cards to reinforce the progression hierarchy
- Show "Entry Level" as a small badge on level 1 instead of italic text below the description

### 4. Simplify the level badge
Replace the color-coded `getLevelColor` badges on each level row with a plain muted number badge. The color progression was the only place those colors were explained — without it, randomly colored badges create confusion. Use a consistent `bg-muted text-muted-foreground` style for all level number badges.

---

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Remove Color Progression section, remove `Palette` import, reorder sidebar sections, replace `getLevelColor` badges with neutral badges, improve commission rate visibility, add website previews group header |

**0 new files, 1 modified file, 0 migrations.**

