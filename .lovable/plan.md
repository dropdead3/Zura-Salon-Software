

# Improve Checklist Step Clarity with Actionable Descriptions & Navigation

## Problem
The activation checklist steps (especially "First Transaction") lack clear guidance on **where to go** and **what to do**. The user sees "Process your first payment to confirm everything works" but has no link or instruction pointing them to the Scheduler.

## Changes

### 1. Add actionable descriptions with navigation hints
Update each incomplete step's description to include a clear instruction of where to go. For the current (next) step, add a clickable link/button that navigates directly to the relevant page.

Updated step descriptions:
- **Create Account** → "Set up your Zura Pay account to start processing payments" *(has inline action button already)*
- **Complete Verification** → "Submit business details and verify your identity in the activation panel above"
- **Connect Location** → "Link a salon location using the Location Mapping section in the Fleet tab"
- **Create Terminal Location** → "Go to the Fleet tab and create a terminal location for your salon"
- **Pair Reader** → "Register a reader in the Fleet tab — you'll need hardware from the Hardware tab first"
- **First Transaction** → "Go to the Scheduler, select an appointment, and check out using Zura Pay on a paired reader"

### 2. Add a "Go to Scheduler" link on the First Transaction step
When "First Transaction" is the current step, render a small link/button below the description that navigates to `/dashboard/schedule`. Use the same amber accent styling.

### 3. Add contextual navigation links for other steps
For steps like "Connect Location", "Create Terminal Location", and "Pair Reader" — when they are the current step, add a small text link that switches to the relevant subtab (Fleet) or scrolls to the relevant section. This uses `useSearchParams` to set the subtab.

## Files
- **Edit**: `src/components/dashboard/settings/terminal/ZuraPayActivationChecklist.tsx` — update descriptions, add navigation links for current step

