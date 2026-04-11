import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GenerateContentParams {
  templateKey: string;
  objectKey?: string;
  objectLabel?: string;
  locationName?: string;
  context?: string;
  taskId?: string;
}

interface GenerateContentResult {
  generated: boolean;
  content: any;
  preview: string;
}

export function useSEOGenerateContent() {
  return useMutation({
    mutationFn: async (params: GenerateContentParams): Promise<GenerateContentResult> => {
      const { data, error } = await supabase.functions.invoke('seo-generate-content', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as GenerateContentResult;
    },
    onError: (err: Error) => {
      toast({
        title: 'Content generation failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
