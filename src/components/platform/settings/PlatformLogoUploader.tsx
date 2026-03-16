import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlatformButton } from '../ui/PlatformButton';

interface PlatformLogoUploaderProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: 'wide' | 'square';
}

export function PlatformLogoUploader({
  label,
  description,
  value,
  onChange,
  aspectRatio = 'wide',
}: PlatformLogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PNG, SVG, JPEG, or WebP image.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 2MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `platform-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
      onChange(publicUrl);
      toast({ title: 'Logo uploaded', description: 'Your logo has been uploaded successfully.' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Failed to upload logo.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleRemove = () => { onChange(null); };
  const handleClick = () => { fileInputRef.current?.click(); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{label}</h4>
          <p className="text-xs text-[hsl(var(--platform-muted))]">{description}</p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" onChange={handleInputChange} className="hidden" />

      {value ? (
        <div
          className={cn(
            'relative rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 flex items-center justify-center',
            aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square w-24'
          )}
        >
          <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          <button
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2 p-4',
            aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square w-24',
            isDragging
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-[hsl(var(--platform-border))] hover:border-[hsl(var(--platform-border)/0.8)] bg-[hsl(var(--platform-bg-card)/0.3)] hover:bg-[hsl(var(--platform-bg-card)/0.5)]'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-[hsl(var(--platform-primary))] animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-[hsl(var(--platform-foreground-subtle))]" />
              <span className="text-xs text-[hsl(var(--platform-foreground-subtle))] text-center">
                Drop or click to upload
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}