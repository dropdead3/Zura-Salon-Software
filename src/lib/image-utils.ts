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
