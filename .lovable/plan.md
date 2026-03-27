

## God Mode Bar — Dynamic Platform Icon

### What
Replace the hardcoded `Shield` icon in the God Mode bar with the platform's branded icon, pulled from platform branding settings (`icon_light_url`). Falls back to the `ZuraZIcon` component when no custom icon is uploaded.

### Why
The God Mode bar is a platform-level surface. It should reflect the platform's visual identity and update automatically when platform logos change — no hardcoded assets.

### Changes

**Single file: `src/components/dashboard/GodModeBar.tsx`**

1. Import `usePlatformBranding` and `ZuraZIcon`
2. Replace the `Shield` icon with:
   - If `branding.icon_light_url` exists: render an `<img>` tag with that URL (light icon works on the dark violet background)
   - Otherwise: render `<ZuraZIcon>` as the default fallback
3. Keep the same sizing (`h-4 w-4`) and `text-violet-300` color treatment (ZuraZIcon inherits `currentColor`)

### Technical Detail

```tsx
const { branding } = usePlatformBranding();
const platformIcon = branding.icon_light_url;

// In JSX:
{platformIcon ? (
  <img src={platformIcon} alt="" className="h-4 w-4 shrink-0" />
) : (
  <ZuraZIcon className="h-4 w-4 text-violet-300" />
)}
```

This ensures the icon is fully dynamic — if a platform admin uploads a new icon via branding settings, the God Mode bar updates automatically without code changes.

