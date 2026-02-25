

## Remove Route Paths from Landing Page Settings

You're right -- those technical route paths (`/dashboard`, `/dashboard/schedule`) shown next to each option are unnecessary for the user-facing UI. They're developer-oriented and clutter the clean selection experience.

### What Changes

**File: `src/components/dashboard/settings/LandingPageSettings.tsx`**

Remove the `<span>` element (lines 83-85) that renders `{option.path}` in monospace font on the right side of each radio option. The label ("Command Center", "Schedule") is already descriptive enough.

