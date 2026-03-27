/**
 * useStylistMixingDashboard — Aggregates mixing data for the current stylist.
 * Fetches today's sessions, product usage trends, top formulas, and overage history.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useStaffBackroomPerformance } from './useStaffBackroomPerformance';
import { format, subDays, startOfDay } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TodayMixSession {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  client_id: string | null;
  appointment_id: string | null;
  is_manual_override: boolean;
  confidence_score: number | null;
  notes: string | null;
  bowl_count: number;
}

export interface ProductUsageTrend {
  product_name: string;
  brand: string | null;
  total_dispensed: number;
  session_count: number;
}

export interface TopFormula {
  formula_key: string;
  components: string[];
  use_count: number;
  last_used: string;
  client_count: number;
}

export interface StylistOverageRecord {
  id: string;
  service_name: string | null;
  included_allowance_qty: number;
  actual_usage_qty: number;
  overage_qty: number;
  charge_amount: number;
  status: string;
  created_at: string;
}

// ─── Hook: Today's sessions ─────────────────────────────────────────────────

export function useTodaySessions(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['stylist-today-sessions', orgId, userId, today],
    queryFn: async (): Promise<TodayMixSession[]> => {
      // Fetch sessions
      const { data: sessions, error } = await supabase
        .from('mix_sessions')
        .select('id, status, started_at, completed_at, client_id, appointment_id, is_manual_override, confidence_score, notes')
        .eq('organization_id', orgId!)
        .eq('mixed_by_staff_id', userId!)
        .gte('started_at', `${today}T00:00:00`)
        .order('started_at', { ascending: false });

      if (error) throw error;
      if (!sessions?.length) return [];

      // Fetch bowl counts per session
      const sessionIds = sessions.map((s: any) => s.id);
      const { data: bowls } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);

      const bowlCountMap = new Map<string, number>();
      (bowls ?? []).forEach((b: any) => {
        bowlCountMap.set(b.mix_session_id, (bowlCountMap.get(b.mix_session_id) ?? 0) + 1);
      });

      return sessions.map((s: any) => ({
        ...s,
        bowl_count: bowlCountMap.get(s.id) ?? 0,
      })) as TodayMixSession[];
    },
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
  });
}

// ─── Hook: Product usage trends (last 30 days) ──────────────────────────────

export function useProductUsageTrends(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['stylist-product-trends', orgId, userId, thirtyDaysAgo],
    queryFn: async (): Promise<ProductUsageTrend[]> => {
      // 1. Get session IDs for this stylist in last 30 days
      const { data: sessions, error: sErr } = await supabase
        .from('mix_sessions')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('mixed_by_staff_id', userId!)
        .gte('started_at', `${thirtyDaysAgo}T00:00:00`)
        .eq('status', 'completed');

      if (sErr) throw sErr;
      if (!sessions?.length) return [];

      const sessionIds = sessions.map((s: any) => s.id);

      // 2. Get bowls
      const { data: bowls, error: bErr } = await supabase
        .from('mix_bowls')
        .select('id, mix_session_id')
        .in('mix_session_id', sessionIds);

      if (bErr) throw bErr;
      if (!bowls?.length) return [];

      const bowlIds = bowls.map((b: any) => b.id);
      const bowlToSession = new Map(bowls.map((b: any) => [b.id, b.mix_session_id]));

      // 3. Get lines
      const { data: lines, error: lErr } = await supabase
        .from('mix_bowl_lines')
        .select('product_name_snapshot, brand_snapshot, dispensed_quantity, bowl_id')
        .in('bowl_id', bowlIds);

      if (lErr) throw lErr;

      // 4. Aggregate by product
      const productMap = new Map<string, { total: number; sessions: Set<string>; brand: string | null }>();
      (lines ?? []).forEach((l: any) => {
        const key = l.product_name_snapshot;
        const existing = productMap.get(key);
        const sessionId = bowlToSession.get(l.bowl_id);
        if (existing) {
          existing.total += l.dispensed_quantity;
          if (sessionId) existing.sessions.add(sessionId);
        } else {
          const sessions = new Set<string>();
          if (sessionId) sessions.add(sessionId);
          productMap.set(key, { total: l.dispensed_quantity, sessions, brand: l.brand_snapshot });
        }
      });

      return Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          brand: data.brand,
          total_dispensed: Math.round(data.total * 100) / 100,
          session_count: data.sessions.size,
        }))
        .sort((a, b) => b.total_dispensed - a.total_dispensed)
        .slice(0, 8);
    },
    enabled: !!orgId && !!userId,
    staleTime: 5 * 60_000,
  });
}

// ─── Hook: Top formulas ─────────────────────────────────────────────────────

export function useTopFormulas(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-top-formulas', orgId, userId],
    queryFn: async (): Promise<TopFormula[]> => {
      const { data, error } = await supabase
        .from('client_formula_history')
        .select('formula_data, client_id, created_at')
        .eq('organization_id', orgId!)
        .eq('staff_id', userId!)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data?.length) return [];

      // Group by formula fingerprint (sorted product names)
      const formulaMap = new Map<string, {
        components: string[];
        count: number;
        lastUsed: string;
        clients: Set<string>;
      }>();

      (data as any[]).forEach((row) => {
        const lines = Array.isArray(row.formula_data) ? row.formula_data : [];
        const components = lines
          .map((l: any) => l.product_name_snapshot || l.productName || 'Unknown')
          .sort();
        const key = components.join(' + ');

        const existing = formulaMap.get(key);
        if (existing) {
          existing.count++;
          if (row.created_at > existing.lastUsed) existing.lastUsed = row.created_at;
          if (row.client_id) existing.clients.add(row.client_id);
        } else {
          const clients = new Set<string>();
          if (row.client_id) clients.add(row.client_id);
          formulaMap.set(key, { components, count: 1, lastUsed: row.created_at, clients });
        }
      });

      return Array.from(formulaMap.entries())
        .map(([key, data]) => ({
          formula_key: key,
          components: data.components,
          use_count: data.count,
          last_used: data.lastUsed,
          client_count: data.clients.size,
        }))
        .sort((a, b) => b.use_count - a.use_count)
        .slice(0, 5);
    },
    enabled: !!orgId && !!userId,
    staleTime: 5 * 60_000,
  });
}

// ─── Hook: Overage history ──────────────────────────────────────────────────

export function useStylistOverageHistory(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-overage-history', orgId, userId],
    queryFn: async (): Promise<StylistOverageRecord[]> => {
      // 1. Get this stylist's recent session IDs
      const { data: sessions, error: sErr } = await supabase
        .from('mix_sessions')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('mixed_by_staff_id', userId!)
        .order('started_at', { ascending: false })
        .limit(100);

      if (sErr) throw sErr;
      if (!sessions?.length) return [];

      const sessionIds = sessions.map((s: any) => s.id);

      // 2. Get overage charges for these sessions
      const { data: charges, error: cErr } = await supabase
        .from('checkout_usage_charges')
        .select('id, service_name, included_allowance_qty, actual_usage_qty, overage_qty, charge_amount, status, created_at')
        .in('mix_session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (cErr) throw cErr;
      return (charges ?? []) as StylistOverageRecord[];
    },
    enabled: !!orgId && !!userId,
    staleTime: 5 * 60_000,
  });
}

// ─── Composite hook ─────────────────────────────────────────────────────────

export function useStylistMixingDashboard(userId: string | undefined) {
  const now = new Date();
  const periodStart = format(subDays(now, 30), 'yyyy-MM-dd');
  const periodEnd = format(now, 'yyyy-MM-dd');

  const todaySessions = useTodaySessions(userId);
  const performance = useStaffBackroomPerformance(periodStart, periodEnd, undefined, userId);
  const productTrends = useProductUsageTrends(userId);
  const topFormulas = useTopFormulas(userId);
  const overageHistory = useStylistOverageHistory(userId);

  return {
    todaySessions,
    performance,
    productTrends,
    topFormulas,
    overageHistory,
    isLoading:
      todaySessions.isLoading ||
      performance.isLoading ||
      productTrends.isLoading ||
      topFormulas.isLoading ||
      overageHistory.isLoading,
  };
}
