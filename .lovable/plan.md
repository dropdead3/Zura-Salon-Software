

## Remove Announcement Creation from Leaderboard Updates

### Problem
The `update-sales-leaderboard` edge function inserts into the `announcements` table every time a leader changes or positions shift significantly. This creates noisy, auto-generated announcements that clutter the announcements feed (as visible in the screenshot -- two identical "Sales Leaderboard Update" entries). Leaderboard updates are not organizational announcements; they belong on the leaderboard surface itself.

### Solution
Remove the announcement-creation block (lines 91-140) from `supabase/functions/update-sales-leaderboard/index.ts`. Keep the ranking comparison and `site_settings` storage logic so the function still tracks leader changes internally -- just stop writing to `announcements`.

Additionally, clean up the two duplicate announcement rows already in the database.

### Files
1. **`supabase/functions/update-sales-leaderboard/index.ts`** -- Remove: the `announcementContent`/`shouldAnnounce` variables, the leader-change announcement logic, the position-change announcement logic, the admin-user lookup, and the `announcements` insert. Keep the `site_settings` upsert for ranking tracking. Simplify the response to just return rankings + whether a leader changed (for future notification use if needed).

2. **Database cleanup** -- Delete the two existing "Sales Leaderboard Update" announcement rows via migration or direct cleanup.

