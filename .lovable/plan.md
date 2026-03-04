

## Remove Changelog Manager Feature

Good call deferring this to platform-level — it keeps the organization admin surface cleaner and avoids premature complexity. The user-facing changelog page and widget will remain intact since those serve team communication.

### What Gets Removed

1. **`src/pages/dashboard/admin/ChangelogManager.tsx`** — Delete the entire admin page file

2. **`src/App.tsx`** — Remove the import and route for `ChangelogManager`:
   - Remove `import ChangelogManager from "./pages/dashboard/admin/ChangelogManager"`
   - Remove the `<Route path="/dashboard/admin/changelog" ...>` line

3. **`src/pages/dashboard/admin/TeamHub.tsx`** — Remove the Changelog Manager `ManagementCard` from the Team Operations & Communications section (lines ~411-416)

4. **`src/pages/dashboard/admin/ManagementHub.tsx`** — Remove the Changelog Manager `ManagementCard` (lines ~382-387)

### What Stays (Unchanged)

- **`src/pages/dashboard/Changelog.tsx`** — User-facing changelog & roadmap viewer
- **`src/components/dashboard/ChangelogWidget.tsx`** — Dashboard "What's New" widget
- **`src/hooks/useChangelog.ts`** — All hooks (used by the user-facing page and widget)
- **`src/hooks/useFeatureRequests.ts`** — Used by user-facing changelog for feature request submissions
- **`src/hooks/usePublishChangelog.ts`** — Used by website editor publish flow
- **Edge functions** (`publish-scheduled-changelog`, `send-changelog-digest`) — Backend infrastructure, stays for future platform use

### Why This Scope

The admin hooks (`useAdminChangelog`, `useCreateChangelog`, etc.) remain in `useChangelog.ts` since they're self-contained exports that cause no harm and will be needed when the platform-level feature is built. Dead code elimination in the bundler will tree-shake them out.

