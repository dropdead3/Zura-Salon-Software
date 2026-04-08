/**
 * useAICoaching — Fetches personalized AI coaching scripts
 * for a stylist based on their KPI gaps and trajectory.
 *
 * Includes localStorage caching with 24h TTL and cooldown protection.
 * Cache key uses userId (stable) instead of email.
 */

import { useState, useCallback, useRef } from 'react';
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
  /** Context label: which goal timeline was used (if any) */
  generatedContext?: string;
}

const CACHE_PREFIX = 'zura_coaching_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const COOLDOWN_MS = 60 * 1000; // 1 minute between requests

interface CachedCoaching {
  result: CoachingResult;
  timestamp: number;
}

function getCacheKey(userId: string, currentLevel: string, goalDays: number | null): string {
  const goalSuffix = goalDays ? `_goal${goalDays}` : '';
  return `${CACHE_PREFIX}${userId}_${currentLevel}${goalSuffix}`;
}

function getCachedResult(key: string): CoachingResult | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const cached: CachedCoaching = JSON.parse(stored);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.result;
  } catch {
    return null;
  }
}

export function useAICoaching() {
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastRequestTimeRef = useRef(0);

  const generateCoaching = useCallback(async (
    userId: string,
    stylistName: string,
    currentLevel: string,
    nextLevel: string | null,
    projections: KpiProjection[],
    goalDaysRemaining?: number | null,
    forceRefresh?: boolean,
  ) => {
    // Cooldown check (persists across renders via ref)
    const now = Date.now();
    if (now - lastRequestTimeRef.current < COOLDOWN_MS) {
      toast.info('Please wait a moment before requesting another coaching plan.');
      return;
    }

    const goalDays = goalDaysRemaining ?? null;

    // Check cache first (unless force refresh)
    const cacheKey = getCacheKey(userId, currentLevel, goalDays);
    if (!forceRefresh) {
      const cached = getCachedResult(cacheKey);
      if (cached) {
        setCoaching(cached);
        return;
      }
    }

    setIsLoading(true);
    lastRequestTimeRef.current = now;
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
          goalDaysRemaining: goalDays,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const contextLabel = goalDays
        ? `Generated for ${goalDays}-day goal`
        : 'Generated without goal mode';
      const result: CoachingResult = { ...data, generatedContext: contextLabel };
      setCoaching(result);

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          result,
          timestamp: Date.now(),
        } as CachedCoaching));
      } catch {}
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
