/**
 * Zura Search Learning Hook
 * Session-based event tracking, selection/abandonment logging,
 * and learning boost computation for the ranking pipeline.
 */

import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { RankedResultType } from '@/lib/searchRanker';
import {
  logSearchEvent,
  computeLearningBoosts,
  getDecayedFrequencyMap as getDecayedFreqMap,
  trackFrequencyTimestamp,
  runGarbageCollection,
  normalizeQuery,
  charOverlap,
} from '@/lib/searchLearning';
import type { LearningBoost } from '@/lib/searchLearning';

function generateSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useSearchLearning(
  open: boolean,
  effectiveRoles: string[] = [],
  currentPath: string = '',
) {
  const sessionIdRef = useRef<string>(generateSessionId());
  const lastQueryRef = useRef<string>('');
  const lastEventIdRef = useRef<string | null>(null);
  const gcRanRef = useRef(false);

  // Generate new session ID when surface opens
  useEffect(() => {
    if (open) {
      sessionIdRef.current = generateSessionId();
      lastQueryRef.current = '';
      lastEventIdRef.current = null;
    }
  }, [open]);

  // Run GC once per mount
  useEffect(() => {
    if (!gcRanRef.current) {
      gcRanRef.current = true;
      runGarbageCollection();
    }
  }, []);

  const logSelection = useCallback(
    (
      query: string,
      path: string,
      rank: number,
      type: RankedResultType,
      resultCount: number,
      topScore: number,
    ) => {
      const prevQuery = lastQueryRef.current;
      const norm = normalizeQuery(query);
      const prevNorm = normalizeQuery(prevQuery);

      // Detect reformulation: different query in same session
      const isReformulation =
        prevNorm &&
        prevNorm !== norm &&
        charOverlap(prevNorm, norm) >= 0.6;

      logSearchEvent({
        timestamp: Date.now(),
        query,
        resultCount,
        selectedPath: path,
        selectedRank: rank,
        selectedType: type,
        topScore,
        roleContext: effectiveRoles,
        currentPath,
        reformulationOf: isReformulation ? lastEventIdRef.current : null,
        sessionId: sessionIdRef.current,
      });

      // Also track frequency timestamp for decayed frequency
      trackFrequencyTimestamp(path);

      lastQueryRef.current = query;
    },
    [effectiveRoles, currentPath],
  );

  const logAbandonment = useCallback(
    (query: string, resultCount: number, topScore: number | null) => {
      if (!query.trim()) return;

      const id = logSearchEvent({
        timestamp: Date.now(),
        query,
        resultCount,
        selectedPath: null,
        selectedRank: null,
        selectedType: null,
        topScore,
        roleContext: effectiveRoles,
        currentPath,
        reformulationOf: null,
        sessionId: sessionIdRef.current,
      });

      lastEventIdRef.current = id;
      lastQueryRef.current = query;
    },
    [effectiveRoles, currentPath],
  );

  const getLearningBoosts = useCallback(
    (query: string, candidatePath: string): LearningBoost => {
      return computeLearningBoosts(query, candidatePath);
    },
    [],
  );

  const getDecayedFrequencyMap = useCallback((): Record<string, number> => {
    return getDecayedFreqMap();
  }, []);

  return {
    sessionId: sessionIdRef.current,
    logSelection,
    logAbandonment,
    getLearningBoosts,
    getDecayedFrequencyMap,
  };
}
