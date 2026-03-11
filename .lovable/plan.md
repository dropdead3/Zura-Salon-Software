

## Enhance Product Image Upload: File Size Validation & Crop Preview

### Changes

**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`** — `handleImageUpload` and dialog UI

1. **File size validation** (before any processing):
   - Reject files > 10MB with a toast error immediately
   - Also validate file type (only `image/*`)

2. **Crop preview overlay**:
   - Add state: `cropPreviewUrl` (string | null) to hold a temporary object URL of the selected image
   - Instead of immediately optimizing+uploading on file select, show a preview modal/overlay first
   - The preview shows the image with a centered square crop boundary overlay (semi-transparent dark mask outside the crop area)
   - Two buttons: "Upload" (proceeds with optimize+upload) and "Cancel" (clears preview)
   - On "Upload", run the existing `optimizeImage` flow, then clear the preview
   - Clean up object URL on unmount/cancel

### Implementation Details

**File validation** (top of `handleImageUpload`):
```typescript
if (file.size > 10 * 1024 * 1024) {
  sonnerToast.error('Image must be under 10MB');
  return;
}
if (!file.type.startsWith('image/')) {
  sonnerToast.error('Please select an image file');
  return;
}
```

**Crop preview**: Add a small inline preview section that appears between the upload button and the form, showing the original image with a CSS-based square crop overlay (using `aspect-square` container with overflow-hidden and a centered square mask via box-shadow or pseudo-elements). This keeps it lightweight — no new dependencies.

**State additions**: `cropPreviewFile: File | null`, `cropPreviewUrl: string | null`

Two files changed total. No new dependencies.

