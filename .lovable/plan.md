

## Redesign Classify Step: Local State + Save Button

### Problem
Currently, clicking "Standard" or "Chemical" immediately fires a mutation and the service disappears from the list. The user wants to review all choices before committing, and both buttons should start unselected.

### Solution
Use local state to track selections, show all services persistently, and add a "Save & Next" action.

### Changes — `ServiceTrackingQuickSetup.tsx`

**1. Add local state for classifications**

```tsx
const [classifications, setClassifications] = useState<Record<string, boolean>>({});
```

Reset it when the dialog opens or step changes.

**2. Redesign the classify row UI**

Each service shows two outline buttons ("Standard" / "Chemical") that both start unselected. Clicking one highlights it (e.g. fills with primary for Chemical, secondary for Standard) while the other stays outline. This uses the local `classifications` state — no mutation fires on click.

```tsx
// Both buttons start as outline (unselected look)
// Selected Standard → secondary variant
// Selected Chemical → default variant  
// Unselected → outline variant
```

Services with a "Suggested" badge still show the hint but don't pre-select anything.

**3. Show ALL services (not just uncategorized)**

The list shows all services in the org, not just `uncategorized`. Services already classified from a previous session show their saved state as the initial local value (pre-populated from `service.is_chemical_service`). Users can change them.

**4. Replace "Next Step" with "Save & Next"**

The footer button becomes "Save & Next Step". On click:
- Batch-update all services that have a local classification differing from their DB value using a single mutation loop.
- On success, advance to next step.

If nothing changed, just advance.

**5. Progress bar update**

The progress still reflects DB state (how many have `is_chemical_service !== null`), so it updates after save.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (classify step UI + local state + batch save)

