/**
 * useBrandWebsiteScrape — Calls the scrape-brand-products edge function
 * to discover products from a brand's website.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScrapedProduct {
  name: string;
  category: string;
  product_line: string;
  sizes: string[];
  confidence: 'high' | 'medium' | 'low';
  selected?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  products: ScrapedProduct[];
  pagesScraped: number;
  totalUrlsFound?: number;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

export function useBrandWebsiteScrape() {
  return useMutation({
    mutationFn: async (params: {
      websiteUrl: string;
      brandName: string;
      maxPages?: number;
    }): Promise<ScrapeResult> => {
      const { data, error } = await supabase.functions.invoke('scrape-brand-products', {
        body: {
          websiteUrl: params.websiteUrl,
          brandName: params.brandName,
          maxPages: params.maxPages || 8,
        },
      });

      if (error) {
        return { success: false, products: [], pagesScraped: 0, confidence: 'low', error: error.message };
      }

      return data as unknown as ScrapeResult;
    },
  });
}
