

# Replace Backroom Icon with Droplets

Swap the `Scale` icon for `Droplets` in the two places it appears as the Backroom product icon in `BackroomPaywall.tsx`:

| Location | Line | Change |
|----------|------|--------|
| Hero icon | ~410 | `Scale` → `Droplets` |
| Scale configurator card icon | ~810 | `Scale` → `Droplets` |
| Import | ~6 | Add `Droplets`, keep `Scale` only if still used elsewhere (it is — for `ScaleConnectionStatus` references, but checking — actually `Scale` is used in the scale configurator section labels too, so we keep it in import but replace the two product-identity usages) |

One file changed: `BackroomPaywall.tsx`. Add `Droplets` to the lucide import, replace the two hero/product icon instances.

