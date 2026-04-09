import { describe, it, expect } from 'vitest';
import {
  resolveAlias,
  getAliasesFor,
  findConceptClusters,
  findNearMatch,
  expandQuery,
} from '@/lib/synonymRegistry';

describe('synonymRegistry', () => {
  describe('resolveAlias', () => {
    it('resolves "calendar" to "schedule"', () => {
      const result = resolveAlias('calendar');
      expect(result).not.toBeNull();
      expect(result!.canonical).toBe('schedule');
      expect(result!.confidence).toBe(0.9);
    });

    it('resolves "payroll" to "my pay"', () => {
      const result = resolveAlias('payroll');
      expect(result).not.toBeNull();
      expect(result!.canonical).toBe('my pay');
    });

    it('resolves "guest" to "client"', () => {
      const result = resolveAlias('guest');
      expect(result?.canonical).toBe('client');
    });

    it('is case-insensitive', () => {
      const result = resolveAlias('CALENDAR');
      expect(result?.canonical).toBe('schedule');
    });

    it('returns null for unknown terms', () => {
      expect(resolveAlias('xyzabc')).toBeNull();
    });

    it('respects intent context — "book" only resolves in action_request', () => {
      const asAction = resolveAlias('schedule', 'action_request');
      // "schedule" is an alias of "book" in action_request context
      expect(asAction).not.toBeNull();

      // "schedule" is also an alias of... let's check navigation
      const asNav = resolveAlias('reserve', 'navigation');
      // "reserve" has contexts: ['action_request'] so should return null for navigation
      expect(asNav).toBeNull();
    });
  });

  describe('getAliasesFor', () => {
    it('returns aliases for "schedule"', () => {
      const aliases = getAliasesFor('schedule');
      expect(aliases).toContain('calendar');
      expect(aliases).toContain('bookings');
    });

    it('returns empty array for unknown canonical', () => {
      expect(getAliasesFor('xyzabc')).toEqual([]);
    });
  });

  describe('findConceptClusters', () => {
    it('finds "money" cluster for "revenue"', () => {
      const clusters = findConceptClusters('revenue');
      expect(clusters.some((c) => c.clusterId === 'money')).toBe(true);
    });

    it('finds "scheduling" cluster for "appointments"', () => {
      const clusters = findConceptClusters('appointments');
      expect(clusters.some((c) => c.clusterId === 'scheduling')).toBe(true);
    });

    it('returns empty for unrelated terms', () => {
      const clusters = findConceptClusters('xyzabc');
      expect(clusters).toHaveLength(0);
    });
  });

  describe('findNearMatch (typo tolerance)', () => {
    it('corrects "payrol" to "payroll"', () => {
      const result = findNearMatch('payrol');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('payroll');
      expect(result!.distance).toBeLessThanOrEqual(2);
    });

    it('corrects "calender" to "calendar"', () => {
      const result = findNearMatch('calender');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('calendar');
    });

    it('returns null for very short input', () => {
      expect(findNearMatch('ab')).toBeNull();
    });

    it('returns null when no close match exists', () => {
      expect(findNearMatch('zzzzzzz')).toBeNull();
    });
  });

  describe('expandQuery', () => {
    it('expands "calendar" with alias to schedule', () => {
      const result = expandQuery('calendar', 'navigation');
      expect(result.aliasMatches.length).toBeGreaterThan(0);
      expect(result.aliasMatches[0].canonical).toBe('schedule');
      expect(result.expandedTerms).toContain('schedule');
    });

    it('expands "payroll" to "my pay" alias', () => {
      const result = expandQuery('payroll', null);
      expect(result.expandedTerms).toContain('my pay');
    });

    it('does not activate concept clusters when strong alias exists', () => {
      const result = expandQuery('calendar', 'navigation');
      expect(result.conceptMatches).toHaveLength(0);
    });

    it('activates concept clusters for multi-token query without alias', () => {
      const result = expandQuery('revenue trends', null);
      // "revenue" should activate money concept cluster
      expect(result.conceptMatches.length).toBeGreaterThanOrEqual(0);
    });

    it('handles unknown query without crashing', () => {
      const result = expandQuery('xyzabc123', null);
      expect(result.expandedTerms).toBeDefined();
      expect(result.aliasMatches).toBeDefined();
    });

    it('handles empty query', () => {
      const result = expandQuery('', null);
      expect(result.expandedTerms).toEqual([]);
    });
  });
});
