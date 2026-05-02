/**
 * Image optimization utilities for gallery uploads
 */

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  cropToSquare?: boolean;
}

const DEFAULT_OPTIONS: Required<OptimizeOptions> = {
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 0.85,
  format: 'webp',
  cropToSquare: false,
};

/**
 * Optimizes an image by resizing and compressing it
 * Uses canvas for client-side processing
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Source crop parameters (full image by default)
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      
      // If cropToSquare, calculate centered square crop from source
      if (opts.cropToSquare) {
        const side = Math.min(img.width, img.height);
        sx = Math.round((img.width - side) / 2);
        sy = Math.round((img.height - side) / 2);
        sw = side;
        sh = side;
      }
      
      // Calculate output dimensions maintaining aspect ratio of cropped region
      let width = sw;
      let height = sh;
      
      if (width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width;
        width = opts.maxWidth;
      }
      
      if (height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height;
        height = opts.maxHeight;
      }
      
      // Round dimensions
      width = Math.round(width);
      height = Math.round(height);
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image (with source crop if applicable)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      
      // Convert to blob
      const mimeType = `image/${opts.format}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        mimeType,
        opts.quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Gets the dimensions of an image file
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// autoCrunchImage — invisible pre-upload compression
// ---------------------------------------------------------------------------
//
// Operators routinely drag in raw 12–30MB phone/DSLR shots. Rather than
// rejecting at the validator and forcing them to leave the app to compress
// elsewhere, we transparently downscale + re-encode to WebP before validation
// runs. Two-pass strategy: first an aggressive resize, then a quality drop
// if the file is still hefty. Falls back to the original file if anything
// throws — auto-crunch must NEVER be the reason an upload fails.

const CRUNCH_TRIGGER_BYTES = 8 * 1024 * 1024; // 8MB
const CRUNCH_TRIGGER_DIMENSION = 5000;
// Hero/slide art is rendered full-bleed at retina densities (a 1440px CSS
// hero on a 2x display = 2880 device px). Cap the long edge at 3200 so we
// retain real pixels instead of upscaling a downsampled WebP — earlier
// 2400px cap was the root cause of "pixelated slider images" reports.
const CRUNCH_PASS1_MAX_EDGE = 3200;
const CRUNCH_PASS1_QUALITY = 0.9;
const CRUNCH_PASS2_QUALITY = 0.82;
const CRUNCH_PASS2_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3MB

// Formats that the browser <canvas> + createImageBitmap path cannot decode.
// We skip auto-crunch for these so the validator's actionable error fires.
const UNCRUNCHABLE_RE = /^image\/(heic|heif|avif)/i;
const UNCRUNCHABLE_EXT_RE = /\.(heic|heif|avif)$/i;

export interface AutoCrunchResult {
  file: File;
  originalSizeBytes: number;
  finalSizeBytes: number;
  didCrunch: boolean;
  /**
   * A JPEG `data:` URL encoded directly from the **pre-crunch raw bitmap**
   * at ANALYSIS_MAX_EDGE px on the long edge. Surfaced so AI consumers
   * (focal-point detection, alt-text) can analyze the source pixels instead
   * of the downsampled WebP we ship to Storage. Absent when:
   *   - the source was already smaller than the crunched output (no benefit)
   *   - encoding failed
   *   - autoCrunch was skipped entirely
   * Callers should fall back to the public URL when this is undefined.
   */
  analysisDataUrl?: string;
  skippedReason?: 'unsupported-format' | 'not-image' | 'within-budget' | 'error';
}

// Subject-detection sweet spot for vision LLMs — large enough for accurate
// face/feature anchoring, small enough to inline as base64 without blowing
// the edge function's request body.
const ANALYSIS_MAX_EDGE = 1600;
const ANALYSIS_QUALITY = 0.85;

async function encodeBitmapToAnalysisDataUrl(bitmap: ImageBitmap): Promise<string | null> {
  try {
    const ratio = Math.min(1, ANALYSIS_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    // toDataURL is synchronous and avoids an extra blob→FileReader hop.
    return canvas.toDataURL('image/jpeg', ANALYSIS_QUALITY);
  } catch {
    return null;
  }
}

async function encodeBitmapToWebp(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', quality),
  );
}

/**
 * Pre-upload compression pass. See module-level comment for strategy.
 * Always resolves — never throws. The caller can rely on the returned file
 * being safe to validate + upload.
 */
export async function autoCrunchImage(file: File): Promise<AutoCrunchResult> {
  const original = file.size;
  const baseResult = (extra: Partial<AutoCrunchResult>): AutoCrunchResult => ({
    file,
    originalSizeBytes: original,
    finalSizeBytes: original,
    didCrunch: false,
    ...extra,
  });

  if (!file.type.startsWith('image/')) {
    return baseResult({ skippedReason: 'not-image' });
  }
  if (UNCRUNCHABLE_RE.test(file.type) || UNCRUNCHABLE_EXT_RE.test(file.name)) {
    return baseResult({ skippedReason: 'unsupported-format' });
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return baseResult({ skippedReason: 'error' });
  }

  // Capture an analysis-grade JPEG from the RAW bitmap *before* we crunch.
  // For ≥3200px DSLR/phone shots this is materially sharper for face/subject
  // detection than the post-crunch WebP we ship to Storage, since it skips
  // the second downscale pass entirely. Only worth emitting when the source
  // has more pixels than the analysis target — otherwise we're just round-
  // tripping through a JPEG re-encode for nothing.
  let analysisDataUrl: string | undefined;
  if (Math.max(bitmap.width, bitmap.height) > ANALYSIS_MAX_EDGE) {
    const dataUrl = await encodeBitmapToAnalysisDataUrl(bitmap);
    if (dataUrl) analysisDataUrl = dataUrl;
  }

  const needsCrunch =
    file.size > CRUNCH_TRIGGER_BYTES ||
    bitmap.width > CRUNCH_TRIGGER_DIMENSION ||
    bitmap.height > CRUNCH_TRIGGER_DIMENSION;

  if (!needsCrunch) {
    bitmap.close();
    return baseResult({ skippedReason: 'within-budget', analysisDataUrl });
  }

  try {
    let blob = await encodeBitmapToWebp(bitmap, CRUNCH_PASS1_MAX_EDGE, CRUNCH_PASS1_QUALITY);
    if (blob && blob.size > CRUNCH_PASS2_THRESHOLD_BYTES) {
      const second = await encodeBitmapToWebp(bitmap, CRUNCH_PASS1_MAX_EDGE, CRUNCH_PASS2_QUALITY);
      if (second && second.size < blob.size) blob = second;
    }
    bitmap.close();

    if (!blob || blob.size === 0) {
      return baseResult({ skippedReason: 'error', analysisDataUrl });
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const crunched = new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
    return {
      file: crunched,
      originalSizeBytes: original,
      finalSizeBytes: crunched.size,
      didCrunch: true,
      analysisDataUrl,
    };
  } catch {
    bitmap.close();
    return baseResult({ skippedReason: 'error', analysisDataUrl });
  }
}

// ---------------------------------------------------------------------------
// Supabase Storage on-the-fly transforms
// ---------------------------------------------------------------------------
//
// Storage exposes per-request image transforms via `?width=` (and `height`,
// `quality`, `resize`). We use that to build responsive `srcSet` strings for
// hero/full-bleed art without re-uploading multiple variants. The original
// upload remains the highest-quality master.
//
// Skipped for non-Supabase URLs: external CDNs, blob:/data: previews, and
// operator-pasted absolute URLs that don't live in our project. Returning
// `null` lets callers fall through to a plain `src` and avoids breaking
// previews or third-party embeds.

const SUPABASE_STORAGE_PATH_RE = /\/storage\/v1\/object\/(public|sign)\//i;

/** True when `url` is a Supabase Storage public/signed object URL. */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  return SUPABASE_STORAGE_PATH_RE.test(url);
}

/**
 * Convert a Supabase Storage object URL into a transform-rendered URL by
 * swapping `/object/` for `/render/image/` and appending the requested width.
 * Preserves any existing query params (e.g. our cache-busting `?t=…`).
 *
 * Returns the input untouched when the URL is not a Storage URL — callers
 * can pass any URL and decide based on the result whether to use srcSet.
 */
export function withSupabaseImageWidth(url: string, width: number): string {
  if (!isSupabaseStorageUrl(url)) return url;
  const rendered = url.replace(
    /\/storage\/v1\/object\/(public|sign)\//i,
    '/storage/v1/render/image/$1/',
  );
  const sep = rendered.includes('?') ? '&' : '?';
  // `resize=contain` keeps aspect ratio; we only ever cap on the long edge.
  return `${rendered}${sep}width=${width}&resize=contain`;
}

/**
 * Build a `srcSet` string for a Supabase Storage image at multiple widths.
 * Returns `null` when the URL isn't a Storage URL (caller should omit the
 * srcSet attribute entirely and rely on the plain `src`).
 *
 * Widths are capped at the source's natural width when known — there's no
 * point asking Storage for a 3200px variant of a 1600px upload, the CDN
 * would just upscale and we'd waste a request.
 */
export function buildSupabaseSrcSet(
  url: string,
  widths: number[],
  naturalWidth?: number | null,
): string | null {
  if (!isSupabaseStorageUrl(url)) return null;
  const cap = typeof naturalWidth === 'number' && naturalWidth > 0 ? naturalWidth : Infinity;
  const useful = widths
    .filter((w) => w > 0 && w <= cap)
    .sort((a, b) => a - b);
  // Always include the cap itself so the largest screens get a 1:1 source.
  if (cap !== Infinity && !useful.includes(cap)) useful.push(cap);
  if (useful.length === 0) return null;
  return useful.map((w) => `${withSupabaseImageWidth(url, w)} ${w}w`).join(', ');
}

/**
 * Default width ladder for full-bleed hero/slider art.
 *
 * Covers retina up through 5K (5120px) — a 27" 5K iMac is 5120 device px wide,
 * a 32" 4K display at DPR 2 is 7680, but we cap at 5120 as the practical
 * ceiling for hero photography. The ladder is filtered against the source's
 * natural width at runtime so we never request a variant larger than the
 * uploaded master (Storage would just upscale and waste a request).
 */
export const HERO_SRCSET_WIDTHS = [640, 960, 1440, 1920, 2560, 3200, 3840, 5120];

// ---------------------------------------------------------------------------
// Image dimension probe (post-upload metadata capture)
// ---------------------------------------------------------------------------

/**
 * Probe a Blob/File for its decoded pixel dimensions. Used post-upload so the
 * editor can show "3200 × 2133 · 480 KB" feedback on the slide preview tile.
 * Resolves to `null` on any failure — never throws, never blocks the upload.
 */
export async function probeBlobDimensions(
  blob: Blob,
): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob);
      const result = { width: bmp.width, height: bmp.height };
      bmp.close();
      return result;
    }
  } catch {
    // Fall through to <img> path below.
  }
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
