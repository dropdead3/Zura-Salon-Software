

## Remove Redundant Inline Live Preview from Announcement Bar Editor

You're exactly right. The inline "Live Preview" card (lines 102-140) duplicates what's already visible in the resizable Live Preview panel on the right. It wastes vertical space in the editor and forces users to scroll past it to reach the actual settings. Removing it streamlines the editor.

### Change

**File: `src/components/dashboard/website-editor/AnnouncementBarContent.tsx`**

- **Remove lines 102-140**: Delete the entire "Live Preview" `<Card>` block containing the mock announcement bar render. The real live preview iframe already shows the announcement bar in context on the actual website, which is more accurate and useful than a static replica.

### Files Changed
- `src/components/dashboard/website-editor/AnnouncementBarContent.tsx` — remove inline live preview card

