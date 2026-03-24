

## Fix Location Selector Text Clipping

**Problem:** The location name in the top-bar selector is truncated to "N..." because the native `<select>` element has `max-w-[120px]`. The container is too tight to show the full location name.

### Change — `src/components/dock/DockDeviceSwitcher.tsx`

1. **Widen select max-width:** Line 94 — change `max-w-[120px]` → `max-w-[160px]` on the location `<select>` to allow longer location names to display
2. **Match on staff filter:** Line 115 — same change `max-w-[120px]` → `max-w-[160px]` for consistency

One file, two class tweaks.

