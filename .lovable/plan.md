

## Goal
Ship the three enhancements as a coordinated wave that closes the visibility loop on the rebook gate: durable receipt across sheet remounts, calendar-level pattern visibility, and inline coaching when individual skip behavior drifts.

## Wave structure (ship together, three layers)

### Layer 1 — Audit-log rehydration (durable receipt)
**Problem:** Receipt is local state only. Close sheet → reopen → receipt vanishes even though the skip is permanently logged.

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

Add a one-shot query on sheet mount that hydrates `declinedReason` from the audit log:

```ts
const { data: priorDecline } = useQuery({
  queryKey: ['rebook-decline-receipt', appointment?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('appointment_audit_log')
      .select('metadata, created_at')
      .eq('appointment_id', appointment!.id)
      .eq('event_type', AUDIT_EVENTS.REBOOK_DECLINED)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },
  enabled: !!appointment?.id && open,
  staleTime: 60_000,
});
```

On success, hydrate local state once if `declinedReason === null`:
```ts
useEffect(() => {
  if (priorDecline?.metadata && !declinedReason) {
    setDeclinedReason({
      code: priorDecline.metadata.reason_code,
      notes: priorDecline.metadata.reason_notes,
    });
  }
}, [priorDecline, declinedReason]);
```

Receipt now persists across remounts. The mutation flow continues to set local state immediately (no flash of warning block while query loads).

### Layer 2 — Closed-card "skipped" dot (calendar pattern visibility)
**Problem:** Managers can't spot rebook-skip clustering without opening reports.

**Pattern reuse:** Extends the existing `ClosedBadge` doctrine — small, semantic, glanceable.

**New component:** `src/components/dashboard/schedule/RebookSkippedDot.tsx`

A 6px muted dot with tooltip showing the reason label. Appears next to the existing closed/completed badge on appointment cards.

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="w-1.5 h-1.5 rounded-full bg-warning/60" />
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">
      <p className="font-medium">Rebook skipped</p>
      <p className="text-muted-foreground">{shortLabel}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**New hook:** `src/hooks/useAppointmentDeclinedReasons.ts`

Bulk-fetches latest decline reason per appointment for visible appointments (single query keyed on appointment_id list):
```ts
useAppointmentDeclinedReasons(appointmentIds: string[])
  → Map<appointmentId, { code, label }>
```
Queries `rebook_decline_reasons` (canonical table — primary source, not the audit-log mirror) filtered by `appointment_id IN (...)` and dedupes by latest per appointment.

**Integration points** (find via search, expect 1–2 call