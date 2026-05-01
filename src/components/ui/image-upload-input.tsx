/**
 * Back-compat re-export. The canonical ImageUploadInput now lives at
 * `@/components/dashboard/website-editor/inputs/ImageUploadInput` after
 * the November 2026 consolidation that merged the two divergent
 * components into a single auto-crunch + pre-flight + stage-aware
 * pipeline. All new callsites should import from the canonical path.
 *
 * The unified component preserves both old APIs:
 *   - `folder` (deprecated alias for `pathPrefix`)
 *   - `aspectRatio` (optional; falls back to fixed h-32 when omitted)
 *   - `maxSizeMB` / `maxWidth` / `maxHeight` / `quality` /
 *     `skipOptimization` knobs from the ui/ component
 *   - `pathPrefix` from the dashboard component
 *
 * This shim exists so legacy `@/components/ui/image-upload-input`
 * imports keep working through the migration; remove the shim once no
 * imports reference it.
 */
export { ImageUploadInput } from '@/components/dashboard/website-editor/inputs/ImageUploadInput';
