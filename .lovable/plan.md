

# Auto-format All Phone Inputs

## Approach
Two-layer fix: add phone formatting to the base `Input` component so every `type="tel"` input auto-formats, then update the handful of files that use native `<input>` or miss `type="tel"`.

## Changes

### 1. `src/components/ui/input.tsx` — Add auto-formatting for `type="tel"`
Import `formatPhoneNumber` from `@/lib/utils`. In `handleChange`, when `type === 'tel'`, apply `formatPhoneNumber` to the value before calling `onChange`. This makes every `<Input type="tel">` auto-format globally.

### 2. Remove duplicate local `formatPhoneNumber` definitions
These files define their own local copy — remove the local function and rely on the base Input handling:
- `src/pages/dashboard/MyProfile.tsx`
- `src/pages/dashboard/ViewProfile.tsx`
- `src/components/dashboard/schedule/NewClientDialog.tsx`
- `src/components/dashboard/operations/WalkInDialog.tsx`
- `src/components/day-rate/StylistInfoStep.tsx`

In each, remove the `formatPhoneNumber` wrapper from the `onChange` (since Input now handles it), and ensure the input has `type="tel"`.

### 3. Add `type="tel"` to phone inputs missing it
These use `<Input>` but lack `type="tel"`:
- `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx` — supplier_phone, secondary_contact_phone
- `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` — supplier phone, secondary phone
- `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` — supplier_phone, secondary_contact_phone
- `src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx` — supplier_phone, secondary_contact_phone
- `src/components/dashboard/settings/inventory/SupplierDialog.tsx` — supplier_phone

### 4. Native `<input type="tel">` — add formatting via `handleChange`
These use raw `<input>` (not the `<Input>` component), so they won't get the global fix. Add `formatPhoneNumber` to their change handlers:
- `src/components/home/StylistsSection.tsx`
- `src/components/about/JoinTeamSection.tsx`
- `src/components/ConsultationFormDialog.tsx`
- `src/pages/Booking.tsx`

### 5. Remaining inputs that need formatting added
- `src/components/dashboard/ClientDetailSheet.tsx` — editPhone, editLandline (have `type="tel"`, will get auto-format from step 1)
- `src/pages/PublicBooking.tsx` — clientPhone (has `type="tel"`, will get auto-format)
- `src/components/home/ApplicationFormDialog.tsx` — has `type="tel"`, will get auto-format
- `src/components/dashboard/settings/BusinessSettingsDialog.tsx` — has `type="tel"`, will get auto-format
- `src/components/platform/settings/PlatformAccountTab.tsx` — has `type="tel"`, will get auto-format
- `src/components/kiosk/KioskBookingWizard.tsx` — uses a custom numpad UI, not a standard input; skip

### Summary
~15 files touched. The base `Input` component change covers ~10 inputs automatically. The rest need `type="tel"` added or `formatPhoneNumber` in their native `<input>` handler.

