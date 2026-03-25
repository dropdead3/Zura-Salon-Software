

## Move "Color or Chemical Service" Toggle to Top of Toggle Group

### Change
In `ServiceEditorDialog.tsx`, move the entire "Color or Chemical Service" block (lines 278-331 — the toggle, tooltip, and nested container types checkboxes) from its current position (after "Requires New-Client Consultation") to the **first item** inside the toggle group `<div className="space-y-3 pt-2">` at line 226, before "Requires Qualification".

### File
`src/components/dashboard/settings/ServiceEditorDialog.tsx`

### Details
- Cut lines 278-331 (the `border-t` wrapper with the chemical toggle + container types)
- Paste them as the first child of the `space-y-3 pt-2` div (line 226), keeping the `border-t` separator but moving it to the **bottom** of the block instead (so it visually separates chemical from the booking toggles below)
- The resulting order will be:
  1. **Color or Chemical Service** (with nested container types when enabled)
  2. Requires Qualification
  3. Bookable Online
  4. Same-Day Booking
  5. Requires New-Client Consultation
  6. Requires Deposit

