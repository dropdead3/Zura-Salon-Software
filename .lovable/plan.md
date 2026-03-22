

## Add Multi-Service Scheduled Demo Appointment

**Problem:** There's no demo appointment in the scheduled section with multiple services (including a non-chemical one) to showcase the color/chem toggle behavior.

### Change — `src/hooks/dock/dockDemoData.ts`

**Modify one existing scheduled appointment** (e.g. `demo-appt-3`, Emily Rodriguez) to have 4 services with 1 non-chemical:

Change line 121:
```
service_name: 'Full Highlight + Cut',
```
to:
```
service_name: 'Full Highlight + Root Smudge + Glaze Add On + Signature Haircut',
```

This gives Emily Rodriguez 4 services: 3 color/chem services (Full Highlight, Root Smudge, Glaze Add On) and 1 non-chemical service (Signature Haircut). This naturally demonstrates how the toggle filters work — the haircut is the odd one out.

Single line change in one file.

