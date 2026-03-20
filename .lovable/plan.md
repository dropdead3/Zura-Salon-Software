

## Fix: Remove Non-Existent Column from Demo Booking Insert

### Problem

The demo-mode booking insert (line 298-314 in `DockNewBookingSheet.tsx`) includes `phorest_branch_id` in the insert payload, but that column does not exist on the `phorest_appointments` table. This causes the schema cache error on confirm.

### Change

**`src/components/dock/schedule/DockNewBookingSheet.tsx`** — line 300

Remove the `phorest_branch_id: selectedLocation || 'demo-branch',` line from the demo insert object. All other fields in the insert are valid columns on the table.

