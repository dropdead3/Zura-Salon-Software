

# Audit Trail + Coaching History Drawer

## 1. Add `platform_audit_log` entry in `send-coaching-email` edge function

After a successful send (line ~182), insert an audit log entry using the service role client:

```typescript
await supabase.from("platform_audit_log").insert({
  organization_id: org_id,
  user_id: user.id,
  action: "coaching_email_sent",
  entity_type: "organization",
  entity_id: org_id,
  details: { recipient: org.billing_email, reason, reweigh_pct: avgReweighPct, waste_pct: avgWastePct },
});
```

Also add `coaching_email_sent` to the `AUDIT_ACTION_CONFIG` in `usePlatformAuditLog.ts`.

## 2. Coaching History Drawer

**New component**: `src/components/platform/backroom/CoachingHistoryDrawer.tsx`

- A `Sheet` (side drawer) that opens when clicking a new "History" icon button on each coaching signal row.
- Queries `platform_audit_log` filtered by `action = 'coaching_email_sent'` and `organization_id = signal.orgId`, ordered by `created_at desc`.
- Displays a timeline of outreach entries showing: timestamp, sender name (joined from `employee_profiles`), and reason from `details.reason`.

**UI update in `BackroomAnalyticsTab.tsx`**:
- Add a `History` icon button next to the existing "Coach" button in the Actions column.
- State: `historyOrgId` to control which org's drawer is open.

## Files

| File | Change |
|------|--------|
| `supabase/functions/send-coaching-email/index.ts` | Insert `platform_audit_log` row after successful send |
| `src/hooks/usePlatformAuditLog.ts` | Add `coaching_email_sent` to `AUDIT_ACTION_CONFIG` |
| `src/components/platform/backroom/CoachingHistoryDrawer.tsx` | **New** — drawer querying audit log for coaching history |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | Add History button + drawer integration |

