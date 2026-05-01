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
  skippedReason?: 'unsupported-format' | 'not-image' | 'within-budget' | 'error';
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

  const needsCrunch =
    file.size > CRUNCH_TRIGGER_BYTES ||
    bitmap.width > CRUNCH_TRIGGER_DIMENSION ||
    bitmap.height > CRUNCH_TRIGGER_DIMENSION;

  if (!needsCrunch) {
    bitmap.close();
    return baseResult({ skippedReason: 'within-budget' });
  }

  try {
    let blob = await encodeBitmapToWebp(bitmap, CRUNCH_PASS1_MAX_EDGE, CRUNCH_PASS1_QUALITY);
    if (blob && blob.size > CRUNCH_PASS2_THRESHOLD_BYTES) {
      const second = await encodeBitmapToWebp(bitmap, CRUNCH_PASS1_MAX_EDGE, CRUNCH_PASS2_QUALITY);
      if (second && second.size < blob.size) blob = second;
    }
    bitmap.close();

    if (!blob || blob.size === 0) {
      return baseResult({ skippedReason: 'error' });
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
    };
  } catch {
    bitmap.close();
    return baseResult({ skippedReason: 'error' });
  }
}
