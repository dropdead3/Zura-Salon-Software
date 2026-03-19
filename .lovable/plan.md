

# Fix Logo Not Showing on PDF Downloads

## Root Cause

The `fetchLogoAsDataUrl` function fetches the logo and converts it to a data URL, but there are two problems:

1. **SVG format not supported by jsPDF**: `getImageFormatFromDataUrl` only recognizes PNG and JPEG. If the org logo is an SVG (common for uploaded logos), the format falls back to `'PNG'` but jsPDF cannot render SVG data as a PNG — it silently fails in the `try/catch` block.

2. **No SVG-to-raster conversion**: The function returns the raw SVG data URL, which jsPDF's `addImage` cannot process.

## Fix — `reportPdfLayout.ts`

### Update `fetchLogoAsDataUrl` to convert SVGs to PNG

After fetching the blob, check if the content type is `image/svg+xml`. If so, render the SVG onto an `<canvas>` element and export as a PNG data URL. This ensures jsPDF always receives a raster image it can embed.

```ts
export async function fetchLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawDataUrl = await blobToDataUrl(blob);
    if (!rawDataUrl) return null;

    // If SVG, rasterize to PNG via canvas
    if (blob.type === 'image/svg+xml' || rawDataUrl.startsWith('data:image/svg')) {
      return await rasterizeSvgToPng(rawDataUrl, 400, 140);
    }
    return rawDataUrl;
  } catch {
    return null;
  }
}
```

### Add `rasterizeSvgToPng` helper

Loads the SVG data URL into an `Image`, draws it onto a canvas at a reasonable resolution (e.g., 400x140 max, aspect-ratio preserved), and returns a PNG data URL.

```ts
function rasterizeSvgToPng(svgDataUrl: string, maxW: number, maxH: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}
```

### Extract blob-to-data-url into a small helper

Move the existing `FileReader` logic into a `blobToDataUrl` function for clarity.

### Update `getImageFormatFromDataUrl`

Add SVG detection that returns `'PNG'` since by the time we reach `addImage`, SVGs have already been rasterized. This is a safety fallback.

## Summary

Single file change to `src/lib/reportPdfLayout.ts` — no changes needed to any report generators since they all call `fetchLogoAsDataUrl` which will now properly handle SVG logos.

