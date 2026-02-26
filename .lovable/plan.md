

## Fix Preview Button URL

### Problem

The Preview button in `CanvasHeader` calls `window.open(openSiteUrl, '_blank')` where `openSiteUrl` is a **relative path** like `/org/drop-dead-salons`. Inside the Lovable preview iframe environment, relative `window.open` calls may not resolve to the correct origin, or may open within the iframe context instead of a clean new tab pointing to the full public-facing URL.

Additionally, `openSiteUrl` is derived by stripping `?preview=true` from the preview URL, but this means the opened page will still load in "normal" mode within the same SPA — potentially hitting auth guards or dashboard routing instead of cleanly rendering the public site.

### Fix

Change `openSiteUrl` in `WebsiteSectionsHub.tsx` to build an **absolute URL** using `window.location.origin`, ensuring the Preview button always opens the full public-facing org page in a new browser tab regardless of iframe nesting.

### File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` (line 190)

Current:
```typescript
const openSiteUrl = useMemo(() => previewUrl.replace('?preview=true', ''), [previewUrl]);
```

Replace with:
```typescript
const openSiteUrl = useMemo(() => {
  const path = previewUrl.replace('?preview=true', '');
  return `${window.location.origin}${path}`;
}, [previewUrl]);
```

This ensures `window.open()` receives a fully qualified URL like `https://id-preview--b06a5744-....lovable.app/org/drop-dead-salons` and reliably opens in a new tab outside any iframe context.

### Files

| File | Change |
|---|---|
| `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` | Make `openSiteUrl` absolute using `window.location.origin` |

One line change. No other files affected.

