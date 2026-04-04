

# Fix Contaminated Platform Brand Assets

## Problem
All bundled `brand-*.svg` files in `src/assets/` contain **Drop Dead Salon (DD75)** organization logos instead of Zura platform logos. This causes the platform landing page (and any other surface using these fallbacks) to display the DD75 tenant logo instead of the Zura platform identity.

Affected files:
| File | Contains | Should Contain |
|------|----------|----------------|
| `brand-wordmark.svg` | DD75 mark (dark) | Zura wordmark (dark) |
| `brand-wordmark-white.svg` | DD75 mark (white) | Zura wordmark (white) |
| `brand-logo-primary.svg` | "DROP DEAD" text (dark) | Zura primary logo (dark) |
| `brand-logo-primary-white.svg` | Likely DD branding | Zura primary logo (white) |
| `brand-logo-secondary.svg` | "DROP DEAD" text (dark) | Zura secondary logo (dark) |
| `brand-logo-secondary-white.svg` | Likely DD branding | Zura secondary logo (white) |
| `brand-icon.svg` | Unknown — needs check | Zura Z icon (dark) |
| `brand-icon-white.svg` | Unknown — needs check | Zura Z icon (white) |

The only correct Zura asset is `zura-logo-white.svg` (Z icon + "ZURA" wordmark, white).

## Solution

### Step 1: Regenerate Zura brand assets from the known-good source
The `zura-logo-white.svg` contains the correct Zura logo (Z-grid icon + "ZURA" wordmark text). We can derive all needed variants from this:

- **`brand-wordmark.svg`** — Extract the "ZURA" text portion from `zura-logo-white.svg`, set fill to `#000000`
- **`brand-wordmark-white.svg`** — Same text portion, fill `#ffffff` (or reuse the existing `zura-logo-white.svg` content)
- **`brand-icon.svg`** — Use the Z-grid icon from `ZuraZIcon.tsx` SVG, fill `#000000`
- **`brand-icon-white.svg`** — Same Z-grid icon, fill `#ffffff`
- **`brand-logo-primary.svg`** — Full Zura logo (Z-grid + "ZURA" wordmark), fill `#000000`
- **`brand-logo-primary-white.svg`** — Full Zura logo, fill `#ffffff`
- **`brand-logo-secondary.svg`** — Same as primary (or Z-grid icon only), fill `#000000`
- **`brand-logo-secondary-white.svg`** — Same, fill `#ffffff`

### Step 2: Replace the contaminated files
Overwrite all 8 `brand-*.svg` files with the correct Zura-branded SVGs.

### No code changes needed
The `platform-assets.ts` imports and `PlatformLogo` resolver logic are all correct — they just reference the wrong SVG content. Replacing the files fixes everything.

## Technical Notes
- The `zura-logo-white.svg` viewBox is `0 0 483.72 133.16` — the Z-grid occupies roughly `0 0 134.15 133.16` and the wordmark text occupies the remaining width
- The `ZuraZIcon.tsx` component has the canonical Z-grid icon as individual rounded rects
- No database or code changes required — this is purely an asset replacement

