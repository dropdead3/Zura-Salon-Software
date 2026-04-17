import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import {
  INSPIRATION_ALLOWED_MIME,
  INSPIRATION_MAX_BYTES,
  INSPIRATION_MAX_FILES,
} from '@/lib/leadCapture';

interface InspirationPhotoUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
}

/**
 * Public-facing inspiration photo uploader for inquiry forms.
 * Calm, advisory tone — frames photos as a help to the stylist, not a requirement.
 */
export function InspirationPhotoUploader({ files, onChange }: InspirationPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const incoming = Array.from(e.target.files || []);
    if (incoming.length === 0) return;

    const merged = [...files];
    for (const f of incoming) {
      if (merged.length >= INSPIRATION_MAX_FILES) {
        setError(`You can attach up to ${INSPIRATION_MAX_FILES} photos.`);
        break;
      }
      if (!INSPIRATION_ALLOWED_MIME.includes(f.type)) {
        setError('Only image files (JPG, PNG, WEBP, HEIC) are accepted.');
        continue;
      }
      if (f.size > INSPIRATION_MAX_BYTES) {
        setError(`Each photo must be under ${Math.round(INSPIRATION_MAX_BYTES / 1024 / 1024)} MB.`);
        continue;
      }
      merged.push(f);
    }

    onChange(merged);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2">
        Inspiration Photos
      </label>
      <p className="text-xs text-muted-foreground font-sans font-light leading-relaxed mb-3">
        Optional — share up to {INSPIRATION_MAX_FILES} reference photos to help your stylist prepare.
      </p>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={`${file.name}-${idx}`}
                className="relative aspect-square overflow-hidden border border-border bg-muted group"
              >
                <img
                  src={url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute top-1 right-1 p-1 bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={12} className="text-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {files.length < INSPIRATION_MAX_FILES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border text-foreground font-sans font-light hover:border-foreground transition-colors"
        >
          <ImagePlus size={16} />
          {files.length === 0 ? 'Add inspiration photos' : `Add more (${files.length}/${INSPIRATION_MAX_FILES})`}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={INSPIRATION_ALLOWED_MIME.join(',')}
        multiple
        onChange={handleSelect}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-destructive font-sans mt-2">{error}</p>
      )}
    </div>
  );
}
