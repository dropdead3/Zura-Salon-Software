

## Remove Profile Notes from Services Tab Banner

### Change — `src/components/dock/appointment/DockClientAlertsBanner.tsx`

Remove the entire Profile Notes section (lines 156–198) and clean up related code:

- Remove `FileText`, `ChevronDown`, `ChevronUp` from imports (no longer needed)
- Remove `notesExpanded` state
- Remove `profileNotes` variable and its usage in the `hasAny` check
- Remove `notesIsLong` variable
- Remove `'profile'` from the `BannerKey` type
- Delete the Profile Notes `motion.div` block entirely

The banner will now only show Allergy alerts and Booking Notes. Profile Notes remain accessible on the Notes tab and Client tab.

