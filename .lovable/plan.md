# Appointment Drawer — Services Section Fixes (Waves 1–3)

## Diagnosis

1. **Missing add-on price** ("Haircut (Add On)" rendering blank): `phorest_services.name` rows contain trailing whitespace (e.g. `"Haircut (Add On)  "`). `useServiceLookup` keys the Map by the raw DB name, but `sortServices` looks up by `name.trim()` — every padded row misses.
2. **Stray "00" under subtotal**: the `formatCurrency(subtotal)` `<span>` inside `<BlurredAmount>` has no `whitespace-nowrap`, so in the narrow drawer the trailing `.00` wraps to a new line.
3. **Source-of-truth integrity**: trailing whitespace on service names is a recurring data hazard (will bite other surfaces — booking, reports, color-bar). Worth scrubbing once at the DB.

## Wave 1 — Lookup normalization (`src/hooks/useServiceLookup.ts`)

Trim names when building the Map so consumers always hit a normalized key:

```ts
const cleanName = (s.name ?? '').trim();
if (!cleanName) continue;
const existing = map.get(cleanName);
if (!existing || s.duration_minutes > existing.duration_minutes) {
  map.set(cleanName, {
    name: cleanName,
    category: s.category,
    duration_minutes: s.duration_minutes,
    price: s.price,
    container_types: (s.container_types as ContainerType[] | null) || ['bowl'],
  });
}
```

This restores price/duration resolution for "Haircut (Add On)" and any other padded row immediately, independent of the DB cleanup in Wave 3.

## Wave 2 — Currency wrap defense (`src/components/dashboard/schedule/AppointmentDetailSheet.tsx`, lines 1798–1842)

Add `whitespace-nowrap tabular-nums` to the four currency spans in the totals block (Subtotal, Discount, Tip, Total) so decimals never wrap and digits column-align:

```tsx
<span className="whitespace-nowrap tabular-nums">
  <BlurredAmount>{formatCurrency(subtotal)}</BlurredAmount>
</span>
```

Same treatment for the Discount, Tip, and Total spans (lines 1809, 1815, 1836–1838). Per-service price spans at line 1781 also get `whitespace-nowrap tabular-nums` for consistency.

## Wave 3 — Data scrub migration

One-shot migration to clean source data so other surfaces (booking, reports, exports) stop carrying the same hazard:

```sql
UPDATE public.phorest_services
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);
```

No schema change, no RLS change, idempotent.

## Out of scope (future)

- Adding a DB-level `CHECK (name = btrim(name))` constraint or `BEFORE INSERT/UPDATE` trigger to prevent regression. Worth doing, but separate wave so we can confirm the scrub doesn't surface unexpected duplicates first.
- Auditing other consumers of `phorest_services.name` for the same trim-mismatch bug (e.g. `service-resolver.ts` already trims — safe; booking flow worth a follow-up scan).

## Verification

1. Reopen the appointment drawer on the same booking — "Haircut (Add On)" shows its price; subtotal renders on a single line.
2. Spot-check a multi-service appointment with discount + tip — all four currency rows align in a single column.
3. Run `SELECT count(*) FROM phorest_services WHERE name <> btrim(name);` post-migration → expect `0`.
