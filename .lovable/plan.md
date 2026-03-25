

## Rename "Service Editor" Button + Add Arrow Icon

### Change
In `ServiceTrackingSection.tsx`, rename the button text from "Service Editor" to "Services Configurator" and append an `ArrowRight` icon after the text.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
  - Add `ArrowRight` to Lucide imports
  - Line ~360: Change `Service Editor` → `Services Configurator` and add `<ArrowRight className="w-4 h-4" />` inside the button
  - Line ~413: Update the empty state copy reference from "Service Editor" to "Services Configurator"

