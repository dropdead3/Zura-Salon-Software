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
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage } from '@/lib/image-utils';
import {
  IMAGE_RECOMMENDED_HINT,
  IMAGE_SIZE_HARD_MB,
  VIDEO_RECOMMENDED_HINT,
  VIDEO_SIZE_HARD_MB,
  getImageSizeWarning,
  getVideoSizeWarning,
  validateImageFile,
  validateVideoFile,
} from '@/lib/upload-validation';
import { toast } from 'sonner';

type MediaKind = 'image' | 'video' | '';

interface MediaUploadInputProps {
  value: string;
  /** Optional: poster URL captured for videos. */
  posterValue?: string;
  /** Reflects the actual mime-family of the uploaded asset. */
  kind: MediaKind;
  onChange: (next: { url: string; posterUrl: string; kind: MediaKind }) => void;
  label?: string;
  bucket?: string;
  pathPrefix?: string;
  placeholder?: string;
  /** When true, accept only images (videos rejected). */
  imageOnly?: boolean;
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
}: MediaUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      toast.error('Pick an image (JPG/PNG/WebP/GIF) or video (MP4/WebM)');
      return;
    }
    if (isVideo && imageOnly) {
      toast.error('Only images are allowed in this slot');
      return;
    }

    // Stage 1 — pre-flight validation. Identical rules to ImageUploadInput.
    const guard = isVideo ? validateVideoFile(file) : validateImageFile(file);
    if (guard.ok === false) {
      toast.error(guard.message);
      return;
    }

    // Soft-warn for "large but legal" files so operators know page loads
    // will suffer.
    const warning = isVideo ? getVideoSizeWarning(file) : getImageSizeWarning(file);
    if (warning) toast.warning(warning);

    setIsUploading(true);
    let stage: 'decode' | 'upload' = 'decode';
    try {
      if (isImage) {
        const { blob } = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1200,
          quality: 0.85,
          format: 'webp',
        });
        stage = 'upload';
        const fileName = `${pathPrefix}/${Date.now()}.webp`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, { contentType: 'image/webp', upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        onChange({ url: urlData.publicUrl, posterUrl: '', kind: 'image' });
        toast.success('Image uploaded');
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
        const posterBlob = await captureVideoPoster(file);
        if (posterBlob) {
          const posterName = `${pathPrefix}/${ts}-poster.jpg`;
          const { error: pErr } = await supabase.storage
            .from(bucket)
            .upload(posterName, posterBlob, { contentType: 'image/jpeg', upsert: true });
          if (!pErr) {
            const { data: pUrl } = supabase.storage.from(bucket).getPublicUrl(posterName);
            posterUrl = pUrl.publicUrl;
          }
        }
        onChange({ url: vUrl.publicUrl, posterUrl, kind: 'video' });
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
  }, [bucket, pathPrefix, onChange, imageOnly]);

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
              <span className="text-xs text-muted-foreground">Uploading...</span>
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
