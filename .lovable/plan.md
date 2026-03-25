

## Fix Apps Section Ordering for Existing Users

### Problem
The merge logic on line 326 of `useSidebarLayout.ts` appends new sections (like `apps`) at the end of stored section orders. Users with previously saved layouts see Apps after System/Platform instead of between Manage and System.

### Fix
**File:** `src/hooks/useSidebarLayout.ts` (line ~324-327)

Change the merge logic so that new sections not present in the stored order are inserted at their correct position from `DEFAULT_SECTION_ORDER` rather than appended at the end:

```ts
// Instead of: [...stored.sectionOrder, ...DEFAULT_SECTION_ORDER]
// Insert missing sections at their default position
const sectionOrder = stored?.sectionOrder?.length
  ? (() => {
      const merged = [...stored.sectionOrder];
      DEFAULT_SECTION_ORDER.forEach((id, defaultIdx) => {
        if (!merged.includes(id)) {
          // Find the right insertion point based on default order neighbors
          const prevInDefault = DEFAULT_SECTION_ORDER[defaultIdx - 1];
          const insertAfter = prevInDefault ? merged.indexOf(prevInDefault) : -1;
          merged.splice(insertAfter + 1, 0, id);
        }
      });
      return merged;
    })()
  : DEFAULT_SECTION_ORDER;
```

This ensures `apps` is inserted after `manage` (its predecessor in the default order) even for users with existing stored layouts.

