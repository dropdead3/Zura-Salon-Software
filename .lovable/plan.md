

## First-Visit Welcome Banner

### Problem
When a salon owner first opens the Backroom, the banner says "Uh-oh, you haven't finished setting up your backroom!" — but they haven't *started* yet. The tone is scolding when it should be welcoming.

### Solution
Detect first visit (0 completed steps) and swap the copy and button label to a warm welcome tone. The banner component already has all the data needed — just branch on `setupHealth.completed === 0`.

### Content

| State | Title | Subtitle | Button |
|-------|-------|----------|--------|
| First visit (0 done) | Welcome to your Backroom! Let's get you set up. | 0 of 6 areas to configure | Start Setup |
| Returning (1+ done) | Uh-oh, you haven't finished setting up your backroom! | X of 6 areas configured | Resume Setup |

### Changes

**File: `src/components/dashboard/backroom-settings/BackroomSetupBanner.tsx`**
- Derive `isFirstVisit = setupHealth.completed === 0`
- Swap `CardTitle` text based on `isFirstVisit`
- Swap subtitle wording: "areas to configure" vs "areas configured"
- Swap button label: "Start Setup" vs "Resume Setup"

One file, ~6 lines changed.

