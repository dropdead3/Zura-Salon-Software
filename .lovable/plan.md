

# Move Analytics Tab to First Position in Backroom Admin

Reorder the tabs in `src/pages/dashboard/platform/BackroomAdmin.tsx` so "Analytics" is the first tab, and set the default state to `'analytics'` instead of `'queue'`.

### Changes

**`src/pages/dashboard/platform/BackroomAdmin.tsx`**:
1. Change `useState('queue')` → `useState('analytics')`
2. Move the Analytics `TabsTrigger` to the first position in the `TabsList`
3. Move the Analytics `TabsContent` to the first position in the content area

Single file, ~6 line moves.

