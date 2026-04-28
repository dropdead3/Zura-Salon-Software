# Fix Pluralization on Locations Status Card

## Issue
"2 opens soon" is grammatically wrong. Should read "2 open soon" (plural verb). Same flaw on the closing-soon counter ("2 closing soon" reads as adjectival but the parallel construction with the opens counter exposed it — and "1 closing soon" is also stilted compared to "1 closes soon").

## Fix
Use proper subject-verb agreement on both counters in both surfaces:

| Count | Opens copy | Closes copy |
|------:|------------|-------------|
| 1     | `1 opens soon`  | `1 closes soon` |
| 2+    | `2 open soon`   | `2 close soon`  |

## Files
- `src/components/dashboard/analytics/LocationsStatusCard.tsx` — full card headline counters (lines ~318–328).
- `src/components/dashboard/PinnedAnalyticsCard.tsx` — simple-tile `metricLabel` extras (lines ~532–534).

## Out of scope
No change to per-location pill copy ("Opens soon · 9am" / "Closing soon · 7pm") — those refer to a single location and read correctly.
