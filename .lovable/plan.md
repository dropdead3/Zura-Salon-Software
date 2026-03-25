

## Fix: Demo Mix Session `service_label` Mismatch

### Problem
Sarah Mitchell's demo appointment has services `Full Balayage, Vivid Toner`, but her demo mix session (`demo-session-1`) has `service_label: 'Balayage'`. Since `'Balayage' !== 'Full Balayage'`, the grouping logic creates a third section instead of filing the bowl under "Full Balayage".

### Fix — `src/hooks/dock/dockDemoData.ts`

Line 282: Change `service_label: 'Balayage'` → `service_label: 'Full Balayage'`

Also audit the other demo sessions:
- `demo-session-2` (appt-4): `service_label: 'Corrective Color'` → verify matches `'Corrective Color - By The Hour'` — needs update to `'Corrective Color - By The Hour'`
- `demo-session-3` (appt-6): `service_label: 'Full Vivid'` — matches, no change needed

### One file changed
`src/hooks/dock/dockDemoData.ts`

