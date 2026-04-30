# Fix "Failed to update section" toggle error

## Positive feedback on your prompt

Good prompt — you named the exact toast text ("failed to update section"), the trigger (toggling off), and what success looks like ("toggles work and act properly"). Naming the literal error text let me grep straight to the source instead of hunting.

**Even better next time:** open DevTools → Network and tell me whether the PATCH/RPC actually fired (and its status) vs. whether the toast fires before any network hit. That distinguishes "network rejected the write" (RLS, schema) from "client-side guard threw before calling the API" (this case). Two very different fixes.

## Root cause

The toggle handler calls `updateSections.mutateAsync(...)` which routes through `useUpdateWebsiteSections` in `src/hooks/useWebsiteSections.ts`:

```ts
const currentPages = queryClient.getQueryData<WebsitePagesConfig>(
  ['site-settings', 'website_pages']
);
if (!currentPages) throw new Error('Pages config not loaded');
```

But the actual query key used by `useWebsitePages` is:

```ts
['site-settings', orgId, 'website_pages', mode]   // mode = 'draft' | 'live'
```

The lookup never matches, `currentPages` is always `undefined`, the mutation throws **before any network call**, and the sidebar's catch shows the generic `Failed to update section` toast. No DB write, no RLS issue — purely a client-side cache-key mismatch.

This affects both code paths in `WebsiteEditorSidebar.tsx`:
- `handleToggleSection` (line 232) — homepage section toggles
- `saveSections` (line 217) — homepage drag-reorder commits

Per-page section toggles route through `handlePageSectionToggle` in the shell, which uses a different (working) path — that's why only the homepage rail surfaces this.

## Fix

**Single file edit: `src/hooks/useWebsiteSections.ts`**

Replace the broken `queryClient.getQueryData(...)` lookup with the live `useWebsitePages()` hook so the mutation reads from the correct, always-current source of truth:

```ts
export function useUpdateWebsiteSections() {
  const pagesQuery = useWebsitePages();
  const updatePages = useUpdateWebsitePages();

  return useMutation({
    mutationFn: async (value: WebsiteSectionsConfig) => {
      const currentPages = pagesQuery.data;
      if (!currentPages) throw new Error('Pages config not loaded');

      const updated: WebsitePagesConfig = {
        pages: currentPages.pages.map(p =>
          p.id === 'home' ? { ...p, sections: value.homepage } : p
        ),
      };
      await updatePages.mutateAsync(updated);
    },
  });
}
```

Why this works: `useWebsitePages()` is already mounted by every consumer that calls `useUpdateWebsiteSections` (the sidebar reads sections), so its data is hot in the cache and reactively updated.

**Bonus hardening (small, in same file):** improve the sidebar catch in `WebsiteEditorSidebar.tsx` lines 226–229 and 242–245 to surface the actual error message (`toast.error(`Failed to update section: ${err.message ?? 'unknown error'}`)`) so this class of silent guard-throw is visible next time instead of being masked by a friendly generic.

## Verification

After the fix, in the browser:
1. Toggle "Hero Section" off → toast: "Hero Section disabled". Iframe re-renders without the hero. Refresh → still off.
2. Toggle it back on → toast: "Hero Section enabled". Hero returns.
3. Toggle "Brand Statement", "Testimonials", "Partner Brands" → each one persists.
4. Drag-reorder a couple of homepage sections → no "Failed to save" toast; new order persists across reload.
5. Per-page (non-home) toggles continue to work as before (separate code path, not affected).

## Files to edit

- `src/hooks/useWebsiteSections.ts` — fix the cache lookup (~6 line delta).
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` — surface the underlying error message in the two catch blocks (~2 line delta, optional but recommended).

## Enhancement suggestions (after this lands)

- **Optimistic toggle without a network round-trip on each click.** Today every toggle writes the entire `website_pages` JSON. A debounced batch (e.g. 500ms after the last toggle) would feel snappier and reduce write amplification, with the same visual instant feedback you already have via `setLocalSections`.
- **Standardize the error toast pattern.** A small helper like `errorToast(prefix, err)` that always appends `err.message` would have caught this silently-failed guard immediately. Worth adding to `src/lib/utils.ts` and using in every editor catch block.
- **Add a Vitest covering the cache-key contract.** A 10-line test that mounts `useUpdateWebsiteSections` alongside `useWebsitePages` and asserts the toggle round-trips would have caught this drift the moment the key shape changed.
