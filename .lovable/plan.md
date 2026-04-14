

## Problem

The Splash Screen card only shows a dropdown selector — it doesn't give an at-a-glance overview of which locations have splash screens set and which don't have terminals registered. The user has to click through each location one at a time.

## Solution

Replace the simple dropdown with a location list that shows status for each location, then loads the splash editor when a location is clicked. Locations without registered terminals are greyed out with a "No terminal registered" label.

### UI Design

```text
┌─────────────────────────────────────────────────┐
│ SPLASH SCREEN ⓘ                        [ACTIVE] │
│ Customize the idle screen on your readers.       │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ Location List ─────────────────────────────┐ │
│  │ ● Downtown Studio          ✓ Default Luxury │ │  ← clickable, selected
│  │ ○ Uptown Salon             ✓ Custom Splash  │ │  ← clickable
│  │ ○ Westside Branch          ○ No Splash      │ │  ← clickable
│  │ ░ Pop-Up Location     No terminal registered │ │  ← greyed out, not clickable
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  [Selected location's splash editor below]       │
│  ┌──────────┐                                    │
│  │  Preview  │  Upload / Default Luxury / Remove │
│  └──────────┘                                    │
└─────────────────────────────────────────────────┘
```

### Approach

1. Fetch terminal locations for **all** org locations upfront (not just the selected one) so we can show status indicators
2. For each location with a terminal, also fetch the splash metadata to show origin (default_luxury, custom, or none)
3. Render a vertical list of location rows replacing the dropdown:
   - **Has terminal + splash**: Show location name with status badge (emerald checkmark + "Default Luxury" or "Custom")
   - **Has terminal, no splash**: Show location name with muted "No Splash" label
   - **No terminal**: Greyed out row, disabled click, "No terminal registered" in muted text
4. Clicking an enabled row selects it and shows the existing splash editor below
5. Keep the existing splash editor logic unchanged — it just drives off `selectedLocationId`

### New hook: `useAllLocationTerminalStatus`

A helper hook that iterates all org locations and calls `list_locations` for each to determine which have terminal locations. Results are cached per location. This avoids N sequential calls by using `Promise.allSettled` and caching individual results.

### Files changed

- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` — Replace dropdown with location status list, add bulk terminal-location fetching, show per-location splash status badges

