import { useState, useCallback, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  optimizeImage,
  autoCrunchImage,
  formatFileSize,
} from '@/lib/image-utils';
import {
  IMAGE_RECOMMENDED_HINT,
  IMAGE_SIZE_HARD_MB,
  validateImageFile,
} from '@/lib/upload-validation';
import { toast } from 'sonner';

/**
 * ImageUploadInput — unified upload + URL-paste tile for any single-image
 * field in the dashboard. November 2026 consolidation merged the two
 * divergent ImageUploadInput components (`@/components/ui/image-upload-input`
 * and the website-editor local) into this single canonical surface so
 * the same auto-crunch + pre-flight + stage-aware error pipeline runs
 * for every callsite (gallery tiles, custom sections, section
 * backgrounds, etc.).
 *
 * Always-on safety pipeline:
 *   Stage 0  auto-crunch  (raw phone shots 12-30MB+ never trip the cap)
 *   Stage 1  validateImageFile (HEIC/AVIF/zero-byte/post-crunch ceiling)
 *   Stage 2  auth session check (catches expired-session 401s up front)
 *   Stage 3  optimize -> webp blob
 *   Stage 4  storage upload + getPublicUrl
 *
 * Optional knobs (maxWidth / maxHeight / quality / maxSizeMB /
 * skipOptimization) preserve the richer ui/ component's API for callsites
 * that need finer control. Defaults match the previous website-editor
 * behavior (1600x1200 @ 0.85 webp).
 *
 * UX features:
 *   - aspectRatio:  optional explicit ratio for the tile + preview
 *                   (default: auto -> 8rem fixed height to match prior
 *                   website-editor look)
 *   - showUrlInput: when true the URL input is always visible; otherwise
 *                   it opens behind a "paste image URL" link
 *
 * If you also need a focal-point overlay on the same tile, use
 * <MediaUploadInput focal={{ ... }} /> instead. Direct <FocalPointPicker>
 * usage is forbidden by the FocalPointPicker Isolation lint canon.
 */

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Storage bucket. Default: 'website-sections'. */
  bucket?: string;
  /** Path prefix inside the bucket (canonical). */
  pathPrefix?: string;
  /**
   * Legacy alias for `pathPrefix`. Kept so the ui/ callsites migrate
   * cleanly; new callsites should use `pathPrefix`.
   * @deprecated use `pathPrefix`
   */
  folder?: string;
  placeholder?: string;
  className?: string;
  /**
   * Optional explicit aspect ratio for the tile + preview (e.g. '3/4',
   * '16/9'). When omitted the tile renders at a fixed 8rem height to
   * match the prior website-editor look.
   */
  aspectRatio?: string;
  /** Pre-optimization size cap in MB. Default: IMAGE_SIZE_HARD_MB. */
  maxSizeMB?: number;
  /** Optimizer max width. Default: 1600. */
  maxWidth?: number;
  /** Optimizer max height. Default: 1200. */
  maxHeight?: number;
  /** Optimizer quality (0..1). Default: 0.85. */
  quality?: number;
  /** Skip the optimize step and upload the (already auto-crunched) original. */
  skipOptimization?: boolean;
  /** When true, the URL input is always visible. Default: false (toggle). */
  showUrlInput?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  label = 'Image',
  bucket = 'website-sections',
  pathPrefix,
  folder,
  placeholder = 'https://...',
  className,
  aspectRatio,
  maxSizeMB = IMAGE_SIZE_HARD_MB,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.85,
  skipOptimization = false,
  showUrlInput: showUrlInputProp = false,
}: ImageUploadInputProps) {
  // pathPrefix wins; folder is the deprecated alias kept for back-compat.
  const resolvedPrefix = pathPrefix ?? folder ?? 'uploads';

  const [isUploading, setIsUploading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('Uploading...');
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlPaste, setShowUrlPaste] = useState(showUrlInputProp);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatusLabel('Preparing image...');

    // Stage 0 - auto-crunch. Runs BEFORE validation so raw phone shots
    // (12-30MB+) don't trip the size cap. Auto-crunch never throws.
    const crunched = await autoCrunchImage(file);
    const workingFile = crunched.file;
    const crunchNote = crunched.didCrunch
      ? ` - compressed ${formatFileSize(crunched.originalSizeBytes)} -> ${formatFileSize(crunched.finalSizeBytes)}`
      : '';

    // Stage 1 - pre-flight validation. Catches HEIC, AVIF, zero-byte,
    // and anything still over the canvas-safe ceiling after auto-crunch.
    const guard = validateImageFile(workingFile);
    if (guard.ok === false) {
      toast.error(guard.message);
      setIsUploading(false);
      return;
    }

    // Caller-side hard cap (in addition to validateImageFile's ceiling).
    if (workingFile.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      setIsUploading(false);
      return;
    }

    setStatusLabel('Uploading...');
    let stage: 'auth' | 'decode' | 'upload' = 'auth';
    try {
      // Stage 2 - auth pre-flight. Surfaces expired sessions before the
      // storage call returns a confusing 401.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        console.error('[ImageUploadInput] no active session - storage upload would 401');
        toast.error('Your session expired - please refresh the page and sign in again');
        setIsUploading(false);
        return;
      }

      // Stage 3 - optimize (unless caller opts out).
      let uploadBlob: Blob = workingFile;
      let contentType = workingFile.type || 'image/jpeg';
      let fileExt = workingFile.name.split('.').pop()?.toLowerCase() || 'jpg';

      if (!skipOptimization) {
        stage = 'decode';
        const { blob } = await optimizeImage(workingFile, {
          maxWidth,
          maxHeight,
          quality,
          format: 'webp',
        });
        uploadBlob = blob;
        contentType = 'image/webp';
        fileExt = 'webp';
      }

      // Stage 4 - storage upload.
      stage = 'upload';
      const fileName = `${resolvedPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, uploadBlob, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success(`Image uploaded${crunchNote}`);
    } catch (err) {
      const e = err as { message?: string; statusCode?: string | number };
      console.error(`[ImageUploadInput] ${stage} failure:`, {
        stage,
        bucket,
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name,
        error: e?.message ?? err,
        statusCode: e?.statusCode,
      });

      if (stage === 'decode') {
        toast.error("Couldn't read this image - it may be corrupted or in a format the browser can't open");
      } else {
        const code = String(e?.statusCode ?? '');
        if (code === '413' || /size|large|exceeds/i.test(e?.message ?? '')) {
          toast.error(`File is too large - keep images under ${IMAGE_SIZE_HARD_MB}MB`);
        } else if (code === '401' || code === '403') {
          toast.error('Not signed in or missing permission to upload here');
        } else {
          toast.error(`Upload failed${e?.message ? ` - ${e.message}` : ' - check connection and try again'}`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [bucket, resolvedPrefix, maxSizeMB, maxWidth, maxHeight, quality, skipOptimization, onChange]);

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

  const handleRemove = () => onChange('');

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
      setUrlValue('');
      if (!showUrlInputProp) setShowUrlPaste(false);
    }
  };

  // Tile sizing: explicit aspectRatio wins; otherwise fall back to the
  // prior website-editor h-32 look so existing surfaces don't shift.
  const tileStyle = aspectRatio ? { aspectRatio } : undefined;
  const tileHeightClass = aspectRatio ? '' : 'h-32';

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className="text-xs">{label}</Label>}

      {value ? (
        <div
          className={cn('relative group rounded-lg overflow-hidden border bg-muted/30', tileHeightClass)}
          style={tileStyle}
        >
          <img
            src={value}
            alt="Uploaded"
            className={cn('w-full object-cover', aspectRatio ? 'h-full' : 'h-32')}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size={tokens.button.inline}
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Replace
            </Button>
            <Button size={tokens.button.inline} variant="destructive" onClick={handleRemove}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex items-center justify-center',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/20 hover:border-muted-foreground/40',
            isUploading && 'pointer-events-none opacity-50',
            tileHeightClass,
          )}
          style={tileStyle}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Drop image or click to upload</span>
              <span className="text-[10px] text-muted-foreground/70">{IMAGE_RECOMMENDED_HINT}</span>
            </div>
          )}
        </div>
      )}

      {/* URL paste fallback. Persistent when `showUrlInput` is true,
          otherwise opens behind a small toggle link. */}
      {showUrlInputProp ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">or paste URL</span>
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-7 text-xs"
            autoCapitalize="off"
          />
        </div>
      ) : !showUrlPaste ? (
        <button
          type="button"
          onClick={() => setShowUrlPaste(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ImageIcon className="h-3 w-3" />
          Or paste image URL
        </button>
      ) : (
        <div className="flex gap-2">
          <Input
            type="url"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-8 text-xs"
            autoCapitalize="off"
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button
            type="button"
            variant="secondary"
            size={tokens.button.inline}
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim()}
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => { setShowUrlPaste(false); setUrlValue(''); }}
          >
            Cancel
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
