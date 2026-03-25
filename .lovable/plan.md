

## Add Visual Aid Preference to Dock Settings

### Concept
Add a "Dispensing Visual" preference in Dock Settings that lets the user choose between two visual aids for the ingredient dispensing flow: **Teardrop** (current default) or **Progress Bar** (a thick vertical bar).

### Changes

**1. New file: `src/components/dock/mixing/ProgressBarFill.tsx`**
- Vertical progress bar component matching `TeardropFill` API: `fillPercent`, `fillColor`, `size`
- Thick rounded vertical bar (~60px wide, height based on `size`) with fill rising from bottom
- Same overfill glow, specular highlight, and transition styling as the teardrop
- Shell uses same platform tokens for consistency

**2. Modified: `src/components/dock/settings/DockSettingsTab.tsx`**
- Add new settings card: "Dispensing Visual" with two selectable options (Teardrop / Progress Bar)
- Store choice in `localStorage` key `dock-dispensing-visual` (`'teardrop' | 'bar'`)
- Show small preview thumbnails of each option as radio-style selectors
- Place it between "Team Compliance" and "Station Location" sections

**3. New hook: `src/hooks/dock/useDockDispensingVisual.ts`**
- Reads from `localStorage` key `dock-dispensing-visual`
- Returns `'teardrop' | 'bar'` (default: `'teardrop'`)
- Provides setter to update preference

**4. Modified: `src/components/dock/mixing/DockIngredientDispensing.tsx`**
- Import `useDockDispensingVisual` and `ProgressBarFill`
- Conditionally render `TeardropFill` or `ProgressBarFill` based on preference
- Both components receive identical `fillPercent`, `fillColor`, and `size` props

### Files
- `src/components/dock/mixing/ProgressBarFill.tsx` — new
- `src/hooks/dock/useDockDispensingVisual.ts` — new
- `src/components/dock/settings/DockSettingsTab.tsx` — add visual selector
- `src/components/dock/mixing/DockIngredientDispensing.tsx` — conditional render

