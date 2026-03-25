

## Three Enhancements to Service Tracking Section

### 1. Expandable Rows for Asst. Prep / Mix Assist Toggles
Add a chevron to each tracked service row. Clicking it expands an inline panel below that row showing:
- **Assistant Prep Allowed** toggle (`assistant_prep_allowed`)
- **Smart Mix Assist** toggle (`smart_mix_assist_enabled`)
- **Formula Memory** toggle (`formula_memory_enabled`)
- **Variance Threshold** slider/input (`variance_threshold_pct`)

Uses Radix Collapsible inside a second `<TableRow>` that renders conditionally based on an `expandedIds` state set. The expand chevron rotates on open.

### 2. Search Input for Large Service Lists
Add a text input above the filter tabs with a search icon. Filters `filteredServices` by `service.name` case-insensitively. Only renders when `allServices.length >= 15` to avoid clutter for small orgs. Debounced with a simple `useState`.

### 3. Quick Setup Wizard
Add a "Quick Setup" button next to the progress bar that opens a stepped dialog walking through the 4 milestones sequentially:
1. **Classify** — shows uncategorized services with a quick chemical/standard toggle
2. **Track** — shows untracked chemical services with bulk-enable
3. **Map Components** — shows tracked services missing components, with inline "Add Component" per service
4. **Set Allowances** — shows tracked services missing allowance, with a link/button to navigate to the allowance config

Each step shows its milestone progress, a "Skip" button, and a "Next" button that advances when the step is complete. The wizard uses the same mutations already in the file.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — add expandable rows, search input, wizard trigger button
- New: `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` — the stepped wizard dialog component

### Technical Details
- Expand state: `const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())`
- Search state: `const [searchQuery, setSearchQuery] = useState('')` applied as `.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))` after the tab filter
- Wizard state: `const [wizardOpen, setWizardOpen] = useState(false)` with `currentStep` index
- Existing mutations (`toggleTracking`, `updateService`, `upsertComponent`) reused in wizard
- Add `ChevronDown`, `Search` to Lucide imports; add `Input` from UI components

