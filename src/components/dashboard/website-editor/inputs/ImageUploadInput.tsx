import { useState, useCallback, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage } from '@/lib/image-utils';
import { toast } from 'sonner';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
  pathPrefix?: string;
  placeholder?: string;
}

export function ImageUploadInput({
  value,
  onChange,
  label = 'Image',
  bucket = 'website-sections',
  pathPrefix = 'uploads',
  placeholder = 'https://...',
}: ImageUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const { blob } = await optimizeImage(file, { maxWidth: 1600, maxHeight: 1200, quality: 0.85, format: 'webp' });
      const fileName = `${pathPrefix}/${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [bucket, pathPrefix, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }, [uploadFile]);

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
          <img src={value} alt="Uploaded" className="w-full h-32 object-cover" />
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
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
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
              <span className="text-xs text-muted-foreground">Drop image or click to upload</span>
            </div>
          )}
        </div>
      )}

      {/* Fallback URL input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">or paste URL</span>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
