

## Change Assistant Label to "Assisted by" with Contextual Formatting

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Change:** Replace `w/ {names.join(', ')}` with contextual "Assisted by" text:

- 1 assistant: `Assisted by Alexis R.`
- 2 assistants: `Assisted by Alexis R. & Jamie L.`
- 3+ assistants: `Assisted by Alexis R., Jamie L. & 1 more`

Apply to both the spacer div (line ~131) and the visible overlay (lines ~155-161).

