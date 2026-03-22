

## Clamp Demo Appointment Times to Operating Hours

**Problem:** Demo appointments are generated relative to `now` using `subMinutes`/`addMinutes`. Early in the day, completed appointments that subtract large offsets (e.g., `subMinutes(now, 300)`) land before business hours — producing nonsensical times like 5:45 AM for a salon.

**Approach:** Define operating hours constants (e.g., 9:00 AM – 8:00 PM) and clamp all generated times to stay within that window. Completed appointments that would fall before opening get shifted to start at opening time. Scheduled appointments that would extend past closing get capped.

**File:** `src/hooks/dock/dockDemoData.ts`

### Changes

1. **Add operating hour constants and a clamp helper** at the top of the file:
   - `OPEN_HOUR = 9`, `CLOSE_HOUR = 20` (9 AM – 8 PM)
   - `clampToHours(date: Date): Date` — clamps a Date to today's operating window

2. **Wrap all `subMinutes`/`addMinutes` calls through the clamp function** for every demo appointment's `start_time` and `end_time`. This affects all 11 appointments. The relative offsets stay the same conceptually but get bounded:

   | Appointment | Current offset | Risk | Fix |
   |---|---|---|---|
   | Amanda Park (completed) | now-180 → now-60 | Before 9 AM if viewed before noon | Clamp start to 9:00 AM min |
   | Maria Gonzalez (completed) | now-300 → now-180 | Almost always before 9 AM | Clamp start to 9:00 AM min |
   | Natalie Brooks (completed) | now-240 → now-180 | Before 9 AM if viewed before 1 PM | Clamp start to 9:00 AM min |
   | Future appointments | now+270, now+330 | Could exceed 8 PM if viewed late | Clamp end to 8:00 PM max |

3. **Ensure duration integrity** — if clamping start pushes it forward, also adjust end to preserve original duration (min 30 min). If clamping end pulls it back, adjust start backward similarly.

Single file change. No logic changes elsewhere — just realistic time windows for the demo data.

