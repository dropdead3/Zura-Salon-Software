import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { computeCapitalRecycling, computePipelineSummary, type CapitalRecyclingMetrics, type PipelineSummary } from '@/lib/capital-engine/ownership-engine';

export function useNetworkOwnershipScores() {
  return useQuery({
    queryKey: ['network-ownership-scores'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('network_ownership_scores')
        .select('*, organizations:organization_id(name)')
        .order('zos_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNetworkDeals() {
  return useQuery({
    queryKey: ['network-deals'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('network_deals')
        .select('*, organizations:organization_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNetworkCapitalLedger() {
  return useQuery({
    queryKey: ['network-capital-ledger'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('network_capital_ledger')
        .select('*')
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNetworkSummary() {
  const { data: scores = [], isLoading: scoresLoading } = useNetworkOwnershipScores();
  const { data: deals = [], isLoading: dealsLoading } = useNetworkDeals();
  const { data: ledger = [], isLoading: ledgerLoading } = useNetworkCapitalLedger();

  const capitalMetrics: CapitalRecyclingMetrics = useMemo(() => {
    return computeCapitalRecycling(
      (ledger as any[]).map((e: any) => ({
        entryType: e.entry_type,
        amount: Number(e.amount),
      }))
    );
  }, [ledger]);

  const pipelineSummary: PipelineSummary = useMemo(() => {
    return computePipelineSummary(
      (deals as any[]).filter((d: any) => d.status === 'active').map((d: any) => d.pipeline_stage)
    );
  }, [deals]);

  const topPerformers = useMemo(() => {
    return (scores as any[]).slice(0, 5);
  }, [scores]);

  return {
    scores,
    deals,
    ledger,
    capitalMetrics,
    pipelineSummary,
    topPerformers,
    isLoading: scoresLoading || dealsLoading || ledgerLoading,
  };
}
