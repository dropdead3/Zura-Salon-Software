

## Add Payment Status to Demo Completed Appointments

**Problem:** The three completed demo appointments (Amanda Park, Maria Gonzalez, Natalie Brooks) lack `payment_status` values, so no payment badges appear on their cards.

### Change — `src/hooks/dock/dockDemoData.ts`

Add `payment_status` to each completed demo appointment with varied values to showcase all badge states:

- **demo-appt-4** (Amanda Park): `payment_status: 'paid'` — green "Paid" badge
- **demo-appt-6** (Maria Gonzalez): `payment_status: 'unpaid'` — red "Unpaid" badge  
- **demo-appt-11** (Natalie Brooks): `payment_status: 'comp'` — muted "Comp" badge

Three lines added across one file. Each line goes after `has_mix_session` in the respective appointment object.

