

# Move Save Banner to Sticky Bottom Action Bar

## Change

In `src/components/platform/settings/PlatformAppearanceTab.tsx`, move the save banner from `sticky top-4` to `fixed bottom-8` centered, so it appears as a bottom floating action bar — always visible when there are unsaved changes.

### Current (lines 217-245)
```
sticky top-4 ... rounded-full
```

### New
```
fixed bottom-8 left-1/2 -translate-x-1/2 z-50 ... rounded-full
```

Change classes on the wrapper div from `sticky top-4 z-20` to `fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-auto max-w-xl`. This makes the save bar float at the bottom center of the viewport — impossible to miss.

Single file, single class change (~line 218).

