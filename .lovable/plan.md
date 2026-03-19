

# Add "Uh-oh" Header to Setup Wizard Banner

## What to Change

**Edit: `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`** (lines ~106-167)

Restructure the setup banner card to include a prominent card header with the attention-grabbing message before the step tracker:

1. Add a `CardHeader` above `CardContent` with:
   - **Title**: `"Uh-oh, you haven't finished setting up your backroom!"` — styled as `text-amber-400 font-display tracking-wide text-sm` to match the amber theme
   - The Zura Z icon moves up into the header row alongside the title
   - The "Resume Setup" button also moves into the header row (right-aligned)

2. The step tracker (progress circles + labels) and the `X OF 7 areas configured` counter remain in the `CardContent` below the header

3. Slightly increase the card's border emphasis (`border-amber-500/50`) and background (`bg-amber-500/8`) so the card pops more on the dark theme

This keeps the existing collapsible behavior and step tracker intact while adding the prominent header callout that makes incomplete setup impossible to miss.

**1 file edited, 0 new files, 0 migrations.**

