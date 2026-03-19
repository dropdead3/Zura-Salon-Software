

# Replace Sparkle Icon with Zura Z SVG

## What
Replace the Sparkles icon in the setup banner with the uploaded Zura Z SVG, colored in amber/orange to match the existing ghost styling.

## Steps

1. **Copy the SVG to project assets**
   - Copy `user-uploads://Z_ICON_WHITE.svg` to `src/assets/z-icon.svg`

2. **Create a reusable ZuraZIcon component** (or inline it)
   - Import the SVG as a React asset
   - Render it as an `<img>` with a CSS filter or use an inline SVG approach with amber coloring
   - Since the SVG uses `fill:#fff` and `fill:#d4d2c7`, the simplest approach: use a CSS filter to shift white to amber, OR modify the SVG fills to `currentColor` so it inherits `text-amber-500`

3. **Update `BackroomDashboardOverview.tsx`** (line 104-106)
   - Replace `<Sparkles className="w-4 h-4 text-amber-500" />` with the Zura Z icon sized to `w-4 h-4` in amber

## Technical Detail

The SVG has hardcoded white/cream fills. Best approach: edit the SVG to use `currentColor` for all rect fills, then use it as a React component so `className="text-amber-500"` works naturally. Alternatively, since the project already has a `ZuraAvatar` component, check if there's already a Z icon component to reuse.

