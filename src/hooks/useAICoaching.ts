/**
 * useAICoaching — Fetches personalized AI coaching scripts
 * for a stylist based on their KPI gaps and trajectory.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { KpiProjection } from './useTrendProjection';

export interface CoachingAction {
  title: string;
  script: string;
  priority: 'high' | 'medium' | 'low';
  kpi: string;
}

export interface CoachingResult {
  summary: string;
  actions: CoachingAction[];
  strengths: string[];
}

export function useAICoaching() {
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateCoaching = useCallback(async (
    stylistName: string,
    currentLevel: string,
    nextLevel: string | null,
    projections: KpiProjection[],
  ) => {
    setIsLoading(true);
    try {
      const kpiSnapshot = projections.map(p => ({
        metric: p.label,
        current: p.current,
        target: p.target,
        gap: p.gap,
        unit: p.unit,
        trajectory: p.trajectory,
        daysToTarget: p.daysToTarget,
      }));

      const { data, error } = await supabase.functions.invoke('ai-coaching-script', {
        body: {
          stylistName,
          currentLevel,
          nextLevel,
          kpiSnapshot,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCoaching(data as CoachingResult);
    } catch (err: any) {
      console.error('AI coaching error:', err);
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('AI is busy — please try again in a moment.');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        toast.error('AI credits exhausted. Contact your administrator.');
      } else {
        toast.error('Could not generate coaching plan. Try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCoaching = useCallback(() => {
    setCoaching(null);
  }, []);

  return { coaching, isLoading, generateCoaching, clearCoaching };
}
