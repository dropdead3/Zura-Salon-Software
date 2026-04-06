import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface AttachmentFile {
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

interface UploadedAttachment {
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function useChatAttachments(channelId: string | null) {
  const { user } = useAuth();
  const [pendingFiles, setPendingFiles] = useState<AttachmentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Max size is 10MB.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not supported.`;
    }
    return null;
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles: AttachmentFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      
      // Create preview URL for images
      const preview = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : '';

      newFiles.push({
        file,
        preview,
        uploading: false,
        progress: 0,
        error: error || undefined,
      });

      if (error) {
        toast.error(error);
      }
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
  }, [validateFile]);

  const removeFile = useCallback((index: number) => {
    setPendingFiles(prev => {
      const file = prev[index];
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    pendingFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setPendingFiles([]);
  }, [pendingFiles]);

  const uploadFiles = useCallback(async (): Promise<UploadedAttachment[]> => {
    if (!user || !channelId || pendingFiles.length === 0) return [];

    const validFiles = pendingFiles.filter(f => !f.error);
    if (validFiles.length === 0) return [];

    setIsUploading(true);
    const uploaded: UploadedAttachment[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const { file } = validFiles[i];
        
        // Update progress state
        setPendingFiles(prev => prev.map((f, idx) => 
          f.file === file ? { ...f, uploading: true } : f
        ));

        // Generate unique file path
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${channelId}/${user.id}/${timestamp}_${safeName}`;

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          setPendingFiles(prev => prev.map(f => 
            f.file === file ? { ...f, uploading: false, error: error.message } : f
          ));
          continue;
        }

        // Get signed URL (bucket is private)
        const { data: urlData } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 day signed URL

        uploaded.push({
          file_name: file.name,
          file_url: urlData?.signedUrl || '',
          file_type: file.type,
          file_size: file.size,
        });

        // Update progress
        setPendingFiles(prev => prev.map(f => 
          f.file === file ? { ...f, uploading: false, progress: 100 } : f
        ));
      }

      // Clear successfully uploaded files
      if (uploaded.length > 0) {
        clearFiles();
      }

      return uploaded;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [user, channelId, pendingFiles, clearFiles]);

  return {
    pendingFiles,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
  };
}
