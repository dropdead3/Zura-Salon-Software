import { useState, useRef } from 'react';
import { Upload, X, Film, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface KioskMediaUploaderProps {
  imageUrl: string | null;
  videoUrl: string | null;
  overlayOpacity: number;
  onImageChange: (url: string | null) => void;
  onVideoChange: (url: string | null) => void;
  organizationId?: string;
}

type MediaType = 'image' | 'video' | null;

function getMediaType(url: string | null): MediaType {
  if (!url) return null;
  const ext = url.split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image';
  return 'image'; // default
}

export function KioskMediaUploader({
  imageUrl,
  videoUrl,
  overlayOpacity,
  onImageChange,
  onVideoChange,
  organizationId,
}: KioskMediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentUrl = videoUrl || imageUrl;
  const currentMediaType = videoUrl ? 'video' : (imageUrl ? 'image' : null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    if (!allValidTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PNG, JPG, WebP, GIF, MP4, or WebM.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const isVideo = validVideoTypes.includes(file.type);
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Please upload ${isVideo ? 'a video under 50MB' : 'an image under 10MB'}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `kiosk-bg-${organizationId || 'default'}-${Date.now()}.${fileExt}`;

      // Upload to kiosk-assets bucket
      const { error: uploadError } = await supabase.storage
        .from('kiosk-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kiosk-assets')
        .getPublicUrl(fileName);

      // Update the correct field based on file type
      if (isVideo) {
        onVideoChange(publicUrl);
        onImageChange(null); // Clear image when video is set
      } else {
        onImageChange(publicUrl);
        onVideoChange(null); // Clear video when image is set
      }

      toast({
        title: 'Media uploaded',
        description: `Your ${isVideo ? 'video' : 'image'} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload media.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onImageChange(null);
    onVideoChange(null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Background Media</Label>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        onChange={handleInputChange}
        className="hidden"
      />

      {currentUrl ? (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border aspect-video">
            {currentMediaType === 'video' ? (
              <video
                src={currentUrl}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${currentUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            {/* Overlay preview */}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-sm font-medium bg-black/30 px-3 py-1 rounded-full">
                {currentMediaType === 'video' ? 'Video with overlay' : 'Image with overlay'}
              </span>
            </div>
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Media type indicator */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {currentMediaType === 'video' ? (
                <>
                  <Film className="w-3 h-3" />
                  <span>Video (loops)</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3" />
                  <span>Image</span>
                </>
              )}
            </div>
          </div>

          {/* Replace button */}
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors py-2"
          >
            {isUploading ? 'Uploading...' : 'Replace media'}
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 p-6 aspect-video',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Drop image or video here, or click to upload
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PNG, JPG, WebP, MP4, WebM
                </p>
              </div>
              <div className="text-xs text-muted-foreground/60 text-center space-y-0.5 pt-2 border-t border-muted-foreground/10 w-full">
                <p className="font-medium">Recommended sizes for tablets:</p>
                <p>Portrait: 1536 × 2048 px</p>
                <p>Landscape: 2048 × 1536 px</p>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {currentMediaType === 'video' 
          ? 'Video will loop automatically. Use object-cover for full-screen display.'
          : 'For best results, use high-resolution images that fill the tablet screen.'}
      </p>
    </div>
  );
}
