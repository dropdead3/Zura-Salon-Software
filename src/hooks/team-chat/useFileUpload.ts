import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

export function useFileUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, messageId }: { file: File; messageId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('File type not supported');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${messageId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 day signed URL
      const publicUrl = signedData?.signedUrl || '';

      // Save attachment record
      const { data, error } = await supabase
        .from('chat_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as UploadedFile;
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload file');
    },
  });

  const uploadFiles = async (files: File[], messageId: string): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = [];
    for (const file of files) {
      try {
        const result = await uploadMutation.mutateAsync({ file, messageId });
        results.push(result);
      } catch (e) {
        // Continue with other files
      }
    }
    return results;
  };

  return {
    uploadFiles,
    isUploading: uploadMutation.isPending,
    uploadProgress,
  };
}
