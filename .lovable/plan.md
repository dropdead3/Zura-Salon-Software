

# Remove Previews Tab from Stylist Levels Editor

## What Changes

Remove the "Previews" tab entirely from the Stylist Levels Editor. It shows static mock-ups of how level cards, dropdowns, and tooltips look — useful during initial design but no longer adds operational value for admins configuring their level system.

## Implementation

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

1. **Remove the tab trigger** (line ~1902): Delete `<TabsTrigger value="previews">Previews</TabsTrigger>`
2. **Remove the entire TabsContent block** (lines ~2484–2604): The `<TabsContent value="previews">` section containing Card Preview, Services Dropdown, and Tooltip Preview
3. **Remove `previewLevel` state** (line ~1484): `const [previewLevel, setPreviewLevel] = useState(0)` — only used by the Previews tab
4. **Clean up `Eye` import** if not used elsewhere (likely imported from lucide-react for the preview section icons)

No other files affected. No database changes.

