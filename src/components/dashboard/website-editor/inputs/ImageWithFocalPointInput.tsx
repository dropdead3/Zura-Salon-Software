/**
 * ImageWithFocalPointInput — consolidated upload + focal-point editor.
 *
 * Empty state: dashed dropzone (drag/drop, click to upload, paste URL).
 * Filled state: the uploaded image becomes the focal-point picker — click/drag
 * to anchor the most important region. Replace/Remove sit on hover overlay so
 * we don't render two stacked thumbnails (upload preview + focal picker).
 *
 * Stored values:
 *   value (url), focalX (0..100), focalY (0..100)
 *
 * Use this anywhere a media field also wants per-surface focal control. The
 * standalone `FocalPointPicker` is still available when the image source is
 * managed elsewhere (e.g. theme-level hero media).
 */
import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Crosshair } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage, autoCrunchImage, formatFileSize } from '@/lib/image-utils';
import {
  IMAGE_RECOMMENDED_HINT,
  IMAGE_SIZE_HARD_MB,
  validateImageFile,
} from '@/lib/upload-validation';
import { toast } from 'sonner';
import { DefaultBadge } from '@/components/ui/default-badge';
import { cn } from '@/lib/utils';

interface ImageWithFocalPointInputProps {
  value: string;
  onChange: (url: string) => void;
  focalX: number;
  focalY: number;
  onFocalChange: (x: number, y: number) => void;
  onFocalReset: () => void;
  bucket?: string;
  pathPrefix?: string;
  placeholder?: string;
  /** Helper text shown below the picker when an image is set. */
  helper?: string;
}

export function ImageWithFocalPointInput({
  value,
  onChange,
  focalX,
  focalY,
  onFocalChange,
  onFocalReset,
  bucket = 'website-sections',
  pathPrefix = 'uploads',
  placeholder = 'https://...',
  helper = 'Click or drag on the image to anchor the most important area — it stays in view across modal, side-rail, and corner-card layouts.',
}: ImageWithFocalPointInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('Uploading...');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const draggingFocal = useRef(false);

  const isDefault = focalX === 50 && focalY === 50;

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatusLabel('Preparing image...');
    const crunched = await autoCrunchImage(file);
    const workingFile = crunched.file;
    const crunchNote = crunched.didCrunch
      ? ` · compressed ${formatFileSize(crunched.originalSizeBytes)} → ${formatFileSize(crunched.finalSizeBytes)}`
      : '';
    const guard = validateImageFile(workingFile);
    if (guard.ok === false) {
      toast.error(guard.message);
      setIsUploading(false);
      return;
    }
    setStatusLabel('Uploading...');
    let stage: 'auth' | 'decode' | 'upload' = 'auth';
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        toast.error('Your session expired — please refresh the page and sign in again');
        setIsUploading(false);
        return;
      }
      stage = 'decode';
      const { blob } = await optimizeImage(workingFile, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 0.85,
        format: 'webp',
      });
      stage = 'upload';
      const fileName = `${pathPrefix}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'image/webp', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success(`Image uploaded${crunchNote}`);
    } catch (err) {
      const e = err as { message?: string; statusCode?: string | number };
      console.error(`[ImageWithFocalPointInput] ${stage} failure:`, {
        stage, bucket, fileType: file.type, fileSize: file.size, error: e?.message ?? err,
      });
      if (stage === 'decode') {
        toast.error("Couldn't read this image — it may be corrupted or in a format the browser can't open");
      } else {
        const code = String(e?.statusCode ?? '');
        if (code === '413' || /size|large|exceeds/i.test(e?.message ?? '')) {
          toast.error(`File is too large — keep images under ${IMAGE_SIZE_HARD_MB}MB`);
        } else if (code === '401' || code === '403') {
          toast.error('Not signed in or missing permission to upload here');
        } else {
          toast.error(`Upload failed${e?.message ? ` — ${e.message}` : ' — check connection and try again'}`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [bucket, pathPrefix, onChange]);

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

  const updateFocalFromEvent = (clientX: number, clientY: number) => {
    const el = pickerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 100;
    const ny = ((clientY - rect.top) / rect.height) * 100;
    onFocalChange(
      Math.round(Math.max(0, Math.min(100, nx))),
      Math.round(Math.max(0, Math.min(100, ny))),
    );
  };

  return (
    <div className="space-y-2">
      {value ? (
        <>
          {/* Header: focal-point label + default badge / reset */}
          <div className="flex items-center justify-between">
            <Label size="xs" className="inline-flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5" />
              Focal Point
              {isDefault && <DefaultBadge />}
            </Label>
            {!isDefault && (
              <button
                type="button"
                onClick={onFocalReset}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to center
              </button>
            )}
          </div>

          {/* Combined preview: image acts as the focal-point picker. Hover
              overlay surfaces Replace/Remove. Reticle marks current anchor. */}
          <div
            ref={pickerRef}
            onPointerDown={(e) => {
              draggingFocal.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              updateFocalFromEvent(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!draggingFocal.current) return;
              updateFocalFromEvent(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              draggingFocal.current = false;
              (e.target as Element).releasePointerCapture?.(e.pointerId);
            }}
            onPointerCancel={() => { draggingFocal.current = false; }}
            className="relative w-full overflow-hidden rounded-lg border border-border bg-muted cursor-crosshair select-none touch-none group"
            style={{ aspectRatio: '16 / 9' }}
          >
            <img
              src={value}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              style={{ objectPosition: `${focalX}% ${focalY}%` }}
            />
            {/* Reticle */}
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] pointer-events-none"
              style={{ left: `${focalX}%`, top: `${focalY}%` }}
            >
              <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </div>
            {/* Replace / Remove — hover overlay sits in the corner so it
                doesn't compete with the focal reticle in the center. */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                size={tokens.button.inline}
                variant="secondary"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Replace
              </Button>
              <Button
                type="button"
                size={tokens.button.inline}
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {helper} ({focalX}%, {focalY}%)
          </p>
        </>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-muted-foreground/40',
          )}
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

      {/* Paste-URL fallback — always available. */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">or paste URL</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs"
        />
      </div>

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
