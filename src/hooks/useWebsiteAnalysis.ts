import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PageConfig } from './useWebsitePages';

export interface AutoFix {
  type: 'enable_section' | 'enable_page' | 'generate_seo' | 'navigate_only';
  sectionType?: string;
  pageId?: string;
  field?: string;
}

export interface Finding {
  id: string;
  category: 'seo' | 'conversion' | 'content' | 'structure';
  severity: 'pass' | 'info' | 'warn' | 'error';
  message: string;
  points: number;
  maxPoints: number;
  actionTarget?: string;
  autoFix?: AutoFix;
}

export interface CategoryScore {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  findings: Finding[];
}

export interface AnalysisResult {
  score: number;
  totalPoints: number;
  maxPoints: number;
  categories: CategoryScore[];
  aiSuggestions: string[];
  analyzedAt: string;
}

export function useWebsiteAnalysis() {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    pages: PageConfig[],
    navItems: { label: string; url: string }[],
    siteSettings: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'ai-website-analysis',
        {
          body: { pages, navItems, siteSettings },
        }
      );

      if (fnError) throw new Error(fnError.message);
      setData(result as AnalysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, analyze, clearAnalysis };
}
