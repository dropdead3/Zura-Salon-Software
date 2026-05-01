/**
 * Shared upload pre-flight validation.
 *
 * Centralizes the rules for what a website-editor uploader will accept so the
 * image-only and image+video components stay in lockstep, and so error copy
 * stays consistent across the editor surface.
 *
 * The bucket itself enforces a 50MB hard cap and a MIME allowlist (see the
 * 2026-05-01 storage migration), but pre-flight here is what gives operators
 * actionable, immediate feedback instead of an opaque 4xx after the bytes
 * have already gone over the wire.
 */

export const IMAGE_SIZE_HARD_MB = 10;
export const IMAGE_SIZE_WARN_MB = 5;
export const VIDEO_SIZE_HARD_MB = 50;
export const VIDEO_SIZE_WARN_MB = 25;

export const IMAGE_RECOMMENDED_HINT =
  `Recommended: 1200×800 or larger · JPG, PNG, WebP, GIF · under ${IMAGE_SIZE_HARD_MB}MB`;

export const VIDEO_RECOMMENDED_HINT =
  `Video: MP4 or WebM · 1080p · under ${VIDEO_SIZE_HARD_MB}MB`;

export const ACCEPTED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ACCEPTED_VIDEO_MIMES = ['video/mp4', 'video/webm'] as const;

const HEIC_MIMES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

type GuardResult = { ok: true } | { ok: false; message: string };

function bytesToMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Returns ok if the file is safe to send to the canvas optimizer + storage.
 * Otherwise returns a message ready to drop straight into a toast.
 */
export function validateImageFile(file: File): GuardResult {
  if (!file || file.size === 0) {
    return { ok: false, message: 'That file appears to be empty — try a different one' };
  }

  // HEIC/HEIF — iPhone default. Browser <img> can't decode it, so optimizeImage
  // would reject with a generic "Failed to load image". Catch it here with
  // an actionable message instead.
  if (HEIC_MIMES.has(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return {
      ok: false,
      message:
        "HEIC isn't supported — convert to JPG or PNG first (iPhone: Settings → Camera → Formats → Most Compatible)",
    };
  }

  if (file.type === 'image/avif' || /\.avif$/i.test(file.name)) {
    return { ok: false, message: 'AVIF isn\'t supported here — convert to JPG, PNG, or WebP first' };
  }

  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'That file isn\'t an image — pick a JPG, PNG, WebP, or GIF' };
  }

  if (!(ACCEPTED_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: `${file.type || 'That image format'} isn't supported — use JPG, PNG, WebP, or GIF`,
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > IMAGE_SIZE_HARD_MB) {
    return {
      ok: false,
      message: `Image is ${bytesToMb(file.size)}MB — keep it under ${IMAGE_SIZE_HARD_MB}MB`,
    };
  }

  return { ok: true };
}

/** Mirror of {@link validateImageFile} for video uploads. */
export function validateVideoFile(file: File): GuardResult {
  if (!file || file.size === 0) {
    return { ok: false, message: 'That file appears to be empty — try a different one' };
  }

  if (!file.type.startsWith('video/')) {
    return { ok: false, message: 'That file isn\'t a video' };
  }

  if (!(ACCEPTED_VIDEO_MIMES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: `${file.type} isn't supported — use MP4 or WebM`,
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > VIDEO_SIZE_HARD_MB) {
    return {
      ok: false,
      message: `Video is ${bytesToMb(file.size)}MB — keep it under ${VIDEO_SIZE_HARD_MB}MB`,
    };
  }

  return { ok: true };
}

/** Soft-warn threshold check — returns a toast-ready message when the file
 * is large enough that page loads will suffer, otherwise null. */
export function getImageSizeWarning(file: File): string | null {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > IMAGE_SIZE_WARN_MB && sizeMB <= IMAGE_SIZE_HARD_MB) {
    return `Large image (${bytesToMb(file.size)}MB) — page loads will be faster if you compress it first`;
  }
  return null;
}

export function getVideoSizeWarning(file: File): string | null {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > VIDEO_SIZE_WARN_MB && sizeMB <= VIDEO_SIZE_HARD_MB) {
    return `Large video (${bytesToMb(file.size)}MB) — consider compressing for faster page loads`;
  }
  return null;
}
