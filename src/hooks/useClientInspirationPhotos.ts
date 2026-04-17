import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InspirationPhoto {
  id: string;
  inquiry_id: string;
  client_id: string | null;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  signed_url: string | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h per spec

/**
 * Fetches inspiration photos that the client uploaded with their booking inquiry.
 * Returns rows joined to fresh signed URLs from the private inquiry-inspiration bucket.
 *
 * `clientId` is the phorest_client_id (text) — matches what salon_inquiries.phorest_client_id stores
 * after the auto-match resolver runs.
 */
export function useClientInspirationPhotos(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-inspiration-photos', clientId],
    queryFn: async (): Promise<InspirationPhoto[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('inquiry_inspiration_photos')
        .select('id, inquiry_id, client_id, file_path, file_name, uploaded_at')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Sign URLs in batch for the private bucket
      const signed = await Promise.all(
        data.map(async (row) => {
          const { data: signedData } = await supabase.storage
            .from('inquiry-inspiration')
            .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);
          return {
            ...row,
            signed_url: signedData?.signedUrl ?? null,
          };
        }),
      );

      return signed;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
