/**
 * MediaUploadInput — image OR video upload with drag/drop.
 *
 * Handles both static images (jpg/png/webp/gif) and short MP4/WebM videos.
 * For videos, we capture the first frame to a poster image so the hero shows
 * something instantly while the video loads.
 *
 * Pre-flight validation lives in `@/lib/upload-validation` so this component
 * and `ImageUploadInput` enforce the exact same rules. Stage-aware error
 * surfacing tells operators where the failure happened (decode vs upload)
 * instead of a single opaque "Failed to upload" toast.
 *
 * Uses the public `website-sections` bucket. The bucket itself caps uploads
 * at 50MB and restricts MIME types as a defense-in-depth backstop.
 */

import { useState, useCallback, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Film, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage, autoCrunchImage, formatFileSize, probeBlobDimensions } from '@/lib/image-utils';
import {
  IMAGE_RECOMMENDED_HINT,
  IMAGE_SIZE_HARD_MB,
  VIDEO_RECOMMENDED_HINT,
  VIDEO_SIZE_HARD_MB,
  getVideoSizeWarning,
  validateImageFile,
  validateVideoFile,
} from '@/lib/upload-validation';
import { toast } from 'sonner';

type MediaKind = 'image' | 'video' | '';

/**
 * Captured at upload time so the editor can persistently surface
 * "3200×2133 · WebP · 480 KB" on the slide preview AND so the public site can
 * cap its responsive srcSet at the master width. All fields are best-effort
 * and may be absent (legacy uploads, pasted URLs, dimension probe failure).
 */
export interface MediaUploadMeta {
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  format?: string | null;
  /**
   * Which `qualityProfile` was active when this asset was uploaded. Lets the
   * editor surface a "Re-upload at higher quality" nudge for assets that
   * landed before the hero profile existed (legacy = absent/null).
   */
  optimizedWithProfile?: 'standard' | 'hero' | null;
}

export interface MediaUploadChangePayload {
  url: string;
  posterUrl: string;
  kind: MediaKind;
  /** Present after a fresh upload; absent for pasted URLs / cleared values. */
  meta?: MediaUploadMeta;
  /**
   * High-fidelity JPEG `data:` URL captured from the **pre-crunch raw bitmap**
   * (≤1600px long edge). Surfaced so AI consumers (focal-point detection,
   * alt-text) can analyze the source pixels instead of the downsampled WebP
   * we ship to Storage. Absent for non-image uploads, sources already
   * smaller than the analysis target, or pasted URLs.
   */
  analysisDataUrl?: string;
}

interface MediaUploadInputProps {
  value: string;
  /** Optional: poster URL captured for videos. */
  posterValue?: string;
  /** Reflects the actual mime-family of the uploaded asset. */
  kind: MediaKind;
  onChange: (next: MediaUploadChangePayload) => void;
  label?: string;
  bucket?: string;
  pathPrefix?: string;
  placeholder?: string;
  /** When true, accept only images (videos rejected). */
  imageOnly?: boolean;
  /**
   * 'standard' (default) — runs autoCrunch + a 1920×1200 @ q0.85 WebP re-encode.
   *   Good for thumbnails, gallery tiles, testimonial avatars.
   * 'hero' — full-bleed retina art. Skips the lossy second re-encode and
   *   uploads the autoCrunch output directly (≤3200px @ q0.9 WebP),
   *   preserving detail on faces/hair/edges where downsampling artifacts are
   *   visible. The URL passed to `onChange` is the autoCrunch output (or the
   *   original file when it was already small enough to skip crunching),
   *   never a downsampled re-encode. Downstream AI consumers (focal-point
   *   detector, alt-text generator) rely on this contract.
   */
  qualityProfile?: 'standard' | 'hero';
  /**
   * Persisted upload metadata for the current `value`. When provided, the
   * preview tile renders a "3200 × 2133 · WebP · 480 KB" caption with a
   * resolution health dot (green ≥2400, amber ≥1200, red <1200).
   */
  meta?: MediaUploadMeta | null;
}

async function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.preload = 'metadata';
      v.src = url;
      v.addEventListener('loadeddata', () => {
        // Seek slightly past 0 so we get a real frame, not a black slate.
        v.currentTime = Math.min(0.1, (v.duration || 1) * 0.05);
      });
      v.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth || 1280;
        canvas.height = v.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.82);
      });
      v.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function MediaUploadInput({
  value,
  posterValue = '',
  kind,
  onChange,
  label = 'Media',
  bucket = 'website-sections',
  pathPrefix = 'uploads',
  placeholder = 'https://...',
  imageOnly = false,
  qualityProfile = 'standard',
  meta = null,
}: MediaUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('Uploading...');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImageInitial = file.type.startsWith('image/');

    if (!isImageInitial && !isVideo) {
      toast.error('Pick an image (JPG/PNG/WebP/GIF) or video (MP4/WebM)');
      return;
    }
    if (isVideo && imageOnly) {
      toast.error('Only images are allowed in this slot');
      return;
    }

    setIsUploading(true);
    setStatusLabel(isVideo ? 'Uploading...' : 'Preparing image...');

    // Stage 0 — auto-crunch (images only). Runs BEFORE validation so raw
    // phone shots (12–30MB+) don't trip the size cap. Auto-crunch never
    // throws; on failure we fall through with the original file and let
    // the validator surface a real error.
    let workingFile = file;
    let crunchNote = '';
    if (isImageInitial) {
      const crunched = await autoCrunchImage(file);
      workingFile = crunched.file;
      if (crunched.didCrunch) {
        crunchNote = ` · compressed ${formatFileSize(crunched.originalSizeBytes)} → ${formatFileSize(crunched.finalSizeBytes)}`;
      }
    }

    const isImage = workingFile.type.startsWith('image/');

    // Stage 1 — pre-flight validation. Identical rules to ImageUploadInput.
    const guard = isVideo ? validateVideoFile(workingFile) : validateImageFile(workingFile);
    if (guard.ok === false) {
      toast.error(guard.message);
      setIsUploading(false);
      return;
    }

    // Soft-warn for "large but legal" videos so operators know page loads
    // will suffer. (Images: auto-crunch already handled it.)
    if (isVideo) {
      const warning = getVideoSizeWarning(workingFile);
      if (warning) toast.warning(warning);
    }

    setStatusLabel('Uploading...');
    let stage: 'auth' | 'decode' | 'upload' = 'auth';
    try {
      // Pre-flight auth check. Storage RLS requires `auth.role() =
      // 'authenticated'`, so a missing session yields an opaque 401/403 from
      // the storage API. Surface it cleanly here instead.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        console.error('[MediaUploadInput] no active session — storage upload would 401');
        toast.error('Your session expired — please refresh the page and sign in again');
        setIsUploading(false);
        return;
      }
      stage = 'decode';
      if (isImage) {
        // Hero/slide profile uploads the autoCrunch output (3200px @ q0.9 WebP)
        // directly. The standard re-encode at 1920×1200 @ q0.85 is what made
        // full-bleed sliders look pixelated on retina — a 1920px source has
        // to upscale to ~2880 device px on a 2x display. Skipping it for hero
        // preserves real pixels with minimal file-size cost.
        let uploadBlob: Blob = workingFile;
        let uploadContentType = workingFile.type || 'image/webp';
        let uploadExt = 'webp';

        if (qualityProfile === 'standard') {
          const { blob } = await optimizeImage(workingFile, {
            maxWidth: 1920,
            maxHeight: 1200,
            quality: 0.85,
            format: 'webp',
          });
          uploadBlob = blob;
          uploadContentType = 'image/webp';
          uploadExt = 'webp';
        } else {
          // Hero: keep the autoCrunch result. If autoCrunch didn't run
          // (file was already small + within budget), upload the original
          // bytes — a 1.5MB JPEG beats a re-encoded 800KB WebP for fidelity.
          uploadExt = workingFile.name.split('.').pop()?.toLowerCase() || 'webp';
          if (!/^(webp|jpe?g|png|gif)$/i.test(uploadExt)) uploadExt = 'webp';
        }

        stage = 'upload';
        const fileName = `${pathPrefix}/${Date.now()}.${uploadExt}`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, uploadBlob, { contentType: uploadContentType, upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        // Cache-bust the public URL so the iframe (and any <img>/preloader)
        // can't serve a stale cached object under the same path on re-upload.
        const bustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        // Probe the actual uploaded blob for dimensions so the editor can show
        // a "3200×2133 · WebP · 480 KB" caption + cap the public srcSet.
        const dims = await probeBlobDimensions(uploadBlob);
        onChange({
          url: bustedUrl,
          posterUrl: '',
          kind: 'image',
          meta: {
            width: dims?.width ?? null,
            height: dims?.height ?? null,
            sizeBytes: uploadBlob.size,
            format: uploadContentType,
            optimizedWithProfile: qualityProfile,
          },
        });
        toast.success(`Image uploaded${crunchNote}`);
      } else {
        // Video: upload original + capture+upload poster frame.
        stage = 'upload';
        const ext = file.name.split('.').pop() || 'mp4';
        const ts = Date.now();
        const videoName = `${pathPrefix}/${ts}.${ext}`;
        const { error: vErr } = await supabase.storage
          .from(bucket)
          .upload(videoName, file, { contentType: file.type, upsert: true });
        if (vErr) throw vErr;
        const { data: vUrl } = supabase.storage.from(bucket).getPublicUrl(videoName);

        let posterUrl = '';
        let posterDims: { width: number; height: number } | null = null;
        let posterSize: number | null = null;
        const posterBlob = await captureVideoPoster(file);
        if (posterBlob) {
          const posterName = `${pathPrefix}/${ts}-poster.jpg`;
          const { error: pErr } = await supabase.storage
            .from(bucket)
            .upload(posterName, posterBlob, { contentType: 'image/jpeg', upsert: true });
          if (!pErr) {
            const { data: pUrl } = supabase.storage.from(bucket).getPublicUrl(posterName);
            posterUrl = `${pUrl.publicUrl}?t=${ts}`;
            // Probe poster dimensions so video slides also get a resolution
            // health dot — poster crispness drives perceived quality before
            // the video buffers, especially on slow connections.
            posterDims = await probeBlobDimensions(posterBlob);
            posterSize = posterBlob.size;
          }
        }
        onChange({
          url: `${vUrl.publicUrl}?t=${ts}`,
          posterUrl,
          kind: 'video',
          meta: posterDims
            ? {
                width: posterDims.width,
                height: posterDims.height,
                sizeBytes: posterSize,
                format: 'image/jpeg',
                optimizedWithProfile: qualityProfile,
              }
            : undefined,
        });
        toast.success('Video uploaded');
      }
    } catch (err) {
      const e = err as { message?: string; statusCode?: string | number };
      console.error(`[MediaUploadInput] ${stage} failure:`, {
        stage,
        bucket,
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name,
        error: e?.message ?? err,
        statusCode: e?.statusCode,
      });

      if (stage === 'decode') {
        toast.error("Couldn't read this image — it may be corrupted or in a format the browser can't open");
      } else {
        const code = String(e?.statusCode ?? '');
        const cap = isVideo ? VIDEO_SIZE_HARD_MB : IMAGE_SIZE_HARD_MB;
        if (code === '413' || /size|large|exceeds/i.test(e?.message ?? '')) {
          toast.error(`File is too large — keep ${isVideo ? 'videos' : 'images'} under ${cap}MB`);
        } else if (code === '401' || code === '403') {
          toast.error('Not signed in or missing permission to upload here');
        } else {
          toast.error(`Upload failed${e?.message ? ` — ${e.message}` : ' — check connection and try again'}`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [bucket, pathPrefix, onChange, imageOnly, qualityProfile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }, [uploadFile]);

  const handleRemove = () => {
    onChange({ url: '', posterUrl: '', kind: '' });
  };

  const accept = imageOnly
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
          {kind === 'video' ? (
            <video
              src={value}
              poster={posterValue || undefined}
              className="w-full h-32 object-cover"
              muted
              playsInline
              loop
              autoPlay
            />
          ) : (
            <img src={value} alt="Uploaded" className="w-full h-32 object-cover" />
          )}
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] font-medium">
            {kind === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            {kind === 'video' ? 'Video' : 'Image'}
          </div>
          {meta?.width ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] font-sans tabular-nums cursor-help">
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        meta.width >= 2400
                          ? 'bg-emerald-500'
                          : meta.width >= 1200
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                    />
                    <span>
                      {meta.width.toLocaleString()}
                      {meta.height ? ` × ${meta.height.toLocaleString()}` : ''}
                      {meta.format ? ` · ${meta.format.replace(/^image\//i, '').toUpperCase()}` : ''}
                      {typeof meta.sizeBytes === 'number' ? ` · ${formatFileSize(meta.sizeBytes)}` : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                  {kind === 'video' ? 'Video poster resolution. ' : ''}
                  {meta.width >= 2400
                    ? 'Sharp on retina hero displays (recommended ≥2400px).'
                    : meta.width >= 1200
                      ? 'Acceptable, but may soften on retina hero displays. Recommended ≥2400px.'
                      : 'Too small for full-bleed hero — will appear pixelated. Recommended ≥2400px.'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          {/*
            Hero re-upload nudge: this surface declared `qualityProfile="hero"`
            but the asset was uploaded under a different (or unknown / legacy)
            profile. Operators should re-upload to get the 3200px master
            instead of the 1920px lossy variant. Renders only when meta exists
            (skip blank legacy slots so we don't shame empty fields).
          */}
          {qualityProfile === 'hero' &&
          meta &&
          meta.optimizedWithProfile !== 'hero' ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/90 text-amber-950 backdrop-blur text-[10px] font-sans font-medium hover:bg-amber-500 transition-colors"
                  >
                    <Upload className="h-3 w-3" />
                    Re-upload at higher quality
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  This asset was uploaded before the hero quality profile
                  existed. Re-uploading captures the original at full
                  resolution (≤3200px, near-lossless WebP) instead of the
                  smaller standard variant.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size={tokens.button.inline} variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Replace
            </Button>
            <Button size={tokens.button.inline} variant="destructive" onClick={handleRemove}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-muted-foreground/40'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {imageOnly ? 'Drop image or click to upload' : 'Drop image or video, or click to upload'}
              </span>
              <span className="text-[10px] text-muted-foreground/70">{IMAGE_RECOMMENDED_HINT}</span>
              {!imageOnly && (
                <span className="text-[10px] text-muted-foreground/70">{VIDEO_RECOMMENDED_HINT}</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">or paste URL</span>
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            const isVideoUrl = /\.(mp4|webm|mov)(\?|$)/i.test(v);
            onChange({ url: v, posterUrl: posterValue, kind: v ? (isVideoUrl ? 'video' : 'image') : '' });
          }}
          placeholder={placeholder}
          className="h-7 text-xs"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
