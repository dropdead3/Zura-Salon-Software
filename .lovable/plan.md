

# Improve Level Roadmap Timeline Visual

## Problem
The current timeline nodes use `border-dashed` for unconfigured levels, creating a cheap "dotted-dashed" look. The overall circles feel flat and utilitarian.

## Proposed Design
Replace the dashed-border approach with a cleaner, more polished visual using **solid rings with subtle inner shadow and a soft glow progression**:

### Timeline Node Redesign
- **Remove** all `border-dashed` usage
- **Larger nodes**: Increase from `w-10 h-10` to `w-14 h-14` for better presence
- **Solid double-ring effect**: Use `ring-2 ring-offset-2` with the level color for configured levels, and `ring-neutral-200` for unconfigured
- **Inner gradient**: Apply inline `background` style using hardcoded hex values from the stone→amber→gold progression (since this is a force-light page, Tailwind dark-mode classes don't apply cleanly). This gives a richer, more dimensional feel than flat bg classes
- **Subtle shadow**: Add `shadow-md` on configured levels for a slight lift effect
- **Number styling**: Slightly larger, `font-display` stays

### Status Indicator
- **Configured**: Small green dot badge (absolute positioned, bottom-right of circle) instead of text below — cleaner
- **Unconfigured**: Small amber dot badge with `AlertTriangle` micro-icon
- Keep the text label ("Ready" / "Incomplete") below the level name

### Connector Arrows
- Replace `ArrowRight` icon with a simple styled `div` connector line (thin horizontal bar with a small chevron), using neutral-300 color — more elegant than an icon

## File Changed

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | **Edit** — restyle timeline section (lines ~96–129) |

No new files, no database changes.

