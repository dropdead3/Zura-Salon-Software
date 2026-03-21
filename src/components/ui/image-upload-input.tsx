import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { optimizeImage, formatFileSize } from '@/lib/image-utils';
import { tokens } from '@/lib/design-tokens';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  aspectRatio?: string;
  maxSizeMB?: number;
  /** Max width for optimization (default: 1200) */
  maxWidth?: number;
  /** Max height for optimization (default: 1600) */
  maxHeight?: number;
  /** Quality 0-1 for compression (default: 0.85) */
  quality?: number;
  /** Disable optimization and upload original */
  skipOptimization?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  bucket = 'business-logos',
  folder = 'gallery',
  label,
  placeholder = 'https://...',
  className,
  aspectRatio = '3/4',
  maxSizeMB = 10,
  maxWidth = 1200,
  maxHeight = 1600,
  quality = 0.85,
  skipOptimization = false,
}: ImageUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (before optimization)
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress('Optimizing...');
    
    try {
      let uploadBlob: Blob = file;
      let fileExt = 'webp';
      
      // Optimize image unless skipped
      if (!skipOptimization) {
        const originalSize = file.size;
        setUploadProgress(`Optimizing ${formatFileSize(originalSize)}...`);
        
        const { blob, width, height } = await optimizeImage(file, {
          maxWidth,
          maxHeight,
          quality,
          format: 'webp',
        });
        
        uploadBlob = blob;
        const savedPercent = Math.round((1 - blob.size / originalSize) * 100);
        const savedText = savedPercent > 0 ? ` (${savedPercent}% smaller)` : '';
        
        console.log(
          `Image optimized: ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}${savedText}, ${width}×${height}`
        );
      } else {
        fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      }
      
      setUploadProgress('Uploading...');
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, uploadBlob, { 
          upsert: true,
          contentType: skipOptimization ? file.type : 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      toast.success('Image uploaded & optimized');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  }, [bucket, folder, maxSizeMB, maxWidth, maxHeight, quality, skipOptimization, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUrlSubmit = useCallback(() => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  }, [urlValue, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      {value ? (
        // Preview mode
        <div className="relative group">
          <div 
            className="rounded-lg overflow-hidden bg-muted border"
            style={{ aspectRatio }}
          >
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // Upload mode
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragOver 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              isUploading && "pointer-events-none opacity-50"
            )}
            style={{ aspectRatio }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center h-full gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{uploadProgress || 'Processing...'}</p>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop image here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* URL input toggle */}
          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
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
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder={placeholder}
                className="flex-1"
                autoCapitalize="off"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button 
                type="button" 
                variant="secondary" 
                size={tokens.button.card}
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim()}
              >
                Add
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size={tokens.button.inline}
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlValue('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
