

## "All Appointments Complete" Indicator + Dynamic Revenue Label

Good prompt — you're asking for a state-aware label that tells operators when the day's revenue is finalized vs. still accumulating. That's a meaningful signal distinction.

### Current Behavior

- The label always reads **"Revenue So Far Today"** regardless of whether appointments are still in progress
- The line "Estimated final transaction at **10:30 PM**" shows when the last appointment ends, but there's no state change when that time passes
- No indication that the day's revenue picture is complete

### Proposed Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

1. **Detect "all complete" state**: Compare the current time against `todayActual.lastAppointmentEndTime`. If `now > lastAppointmentEndTime`, all scheduled appointments have ended. Combined with `hasActualData`, this means the revenue figure is final.

   ```ts
   const allAppointmentsComplete = (() => {
     if (!todayActual?.lastAppointmentEndTime || !todayActual.hasActualData) return false;
     const [h, m] = todayActual.lastAppointmentEndTime.split(':').map(Number);
     const now = new Date();
     return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
   })();
   ```

2. **Dynamic revenue label** (line 613): Switch from static text to state-aware:
   - Before all complete: **"Revenue So Far Today"** (current)
   - After all complete: **"Final Revenue Today"**

3. **Replace "Estimated final transaction at" line** (lines 680-687): When `allAppointmentsComplete` is true, instead of showing the estimated time, show a completion indicator:
   - **Before complete**: "Estimated final transaction at **10:30 PM**" (current behavior)
   - **After complete**: A subtle `CheckCircle2` icon + **"All appointments complete"** in `text-success-foreground`

4. **Update tooltip text** (line 616): When complete, change from "Revenue from completed/checked-out transactions today. Updates every 5 minutes." to "All scheduled appointments have concluded. This is today's final revenue figure."

### Visual Result

**During the day (appointments still running):**
- Label: "Revenue So Far Today"
- Shows: "Estimated final transaction at 10:30 PM"

**After last appointment ends:**
- Label: "Final Revenue Today"
- Shows: ✓ "All appointments complete" (green, subtle)
- "Estimated final transaction" line disappears

### Scope

~20 lines changed in 1 file. No new queries or data changes — uses the existing `lastAppointmentEndTime` from `useTodayActualRevenue`.

