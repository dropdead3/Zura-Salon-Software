import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { optimizeImage, formatFileSize } from '@/lib/image-utils';

interface UploadingFile {
  id: string;
  file: File;
  status: 'pending' | 'optimizing' | 'uploading' | 'complete' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

interface BulkImageUploadProps {
  onComplete: (urls: { src: string; alt: string }[]) => void;
  onCancel: () => void;
  bucket?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function BulkImageUpload({
  onComplete,
  onCancel,
  bucket = 'business-logos',
  folder = 'gallery/images',
  maxWidth = 1200,
  maxHeight = 1600,
  quality = 0.85,
}: BulkImageUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const imageFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }
    
    const newFiles: UploadingFile[] = imageFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
      progress: 0,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const uploadFile = async (uploadFile: UploadingFile): Promise<string | null> => {
    try {
      // Update status to optimizing
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'optimizing', progress: 10 } : f
      ));

      // Optimize the image
      const { blob } = await optimizeImage(uploadFile.file, {
        maxWidth,
        maxHeight,
        quality,
        format: 'webp',
      });

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 50 } : f
      ));

      // Upload to storage
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Update status to complete
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100, url: urlData.publicUrl } : f
      ));

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'error', error: 'Upload failed' } : f
      ));
      return null;
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    // Upload files in parallel (max 3 at a time)
    const results: { src: string; alt: string }[] = [];
    const batchSize = 3;
    
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(uploadFile));
      
      batchResults.forEach((url, index) => {
        if (url) {
          const fileName = batch[index].file.name.replace(/\.[^/.]+$/, '');
          // Convert filename to readable alt text
          const alt = fileName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          results.push({ src: url, alt });
        }
      });
    }

    setIsUploading(false);

    if (results.length > 0) {
      toast.success(`${results.length} image${results.length > 1 ? 's' : ''} uploaded successfully`);
      onComplete(results);
    } else {
      toast.error('No images were uploaded successfully');
    }
  };

  const completedCount = files.filter(f => f.status === 'complete').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const overallProgress = files.length > 0 
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-muted">
            <Images className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">Drop multiple images here</p>
            <p className="text-sm text-muted-foreground">or click to browse • Supports JPG, PNG, WebP</p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {files.map((file) => (
            <div 
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={URL.createObjectURL(file.file)} 
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
                
                {file.status !== 'pending' && file.status !== 'complete' && file.status !== 'error' && (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
              </div>
              
              {/* Status icon */}
              <div className="flex-shrink-0">
                {file.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {(file.status === 'optimizing' || file.status === 'uploading') && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {file.status === 'complete' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary & Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {isUploading ? (
              <span>Uploading... {overallProgress}%</span>
            ) : (
              <span>
                {files.length} image{files.length !== 1 ? 's' : ''} selected
                {completedCount > 0 && ` • ${completedCount} complete`}
                {errorCount > 0 && ` • ${errorCount} failed`}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadAll} 
              disabled={isUploading || pendingCount === 0}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingCount} Image{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
