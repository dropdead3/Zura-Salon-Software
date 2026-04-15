/**
 * Shared data fetchers for goal metrics.
 * Used by both useGoalCurrentValue (current period) and useHistoricalBenchmarks (90-day lookback).
 */
import { supabase } from '@/integrations/supabase/client';

function applyLocationFilter(query: any, locationId?: string | null) {
  if (locationId && locationId !== 'all') {
    return query.eq('location_id', locationId);
  }
  return query;
}

export async function fetchRevenue(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number> {
  let query = supabase
    .from('v_all_appointments' as any)
    .select('total_price')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")')
    .not('total_price', 'is', null);

  query = applyLocationFilter(query, locationId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as any[])?.reduce((sum: number, r: any) => sum + (Number(r.total_price) || 0), 0) ?? 0;
}

export async function fetchAvgTicket(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<{ avg: number | null; count: number }> {
  let query = supabase
    .from('v_all_appointments' as any)
    .select('total_price')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")')
    .not('total_price', 'is', null)
    .gt('total_price', 0);

  query = applyLocationFilter(query, locationId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return { avg: null, count: 0 };
  const rows = data as any[];
  const total = rows.reduce((sum: number, r: any) => sum + (Number(r.total_price) || 0), 0);
  return { avg: total / rows.length, count: rows.length };
}

export async function fetchRetailRevenue(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number> {
  let query = supabase
    .from('v_all_transaction_items' as any)
    .select('total_amount')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo)
    .eq('item_type', 'product')
    .not('total_amount', 'is', null);

  query = applyLocationFilter(query, locationId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as any[])?.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0) ?? 0;
}

export async function fetchNoShowRate(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<{ rate: number | null; totalCount: number }> {
  let totalQ = supabase
    .from('v_all_appointments' as any)
    .select('id', { count: 'exact', head: true })
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled")');

  let noshowQ = supabase
    .from('v_all_appointments' as any)
    .select('id', { count: 'exact', head: true })
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .eq('status', 'no_show');

  totalQ = applyLocationFilter(totalQ, locationId);
  noshowQ = applyLocationFilter(noshowQ, locationId);

  const [totalRes, noshowRes] = await Promise.all([totalQ, noshowQ]);
  if (totalRes.error) throw totalRes.error;
  if (noshowRes.error) throw noshowRes.error;
  const total = totalRes.count ?? 0;
  if (total === 0) return { rate: null, totalCount: 0 };
  return { rate: ((noshowRes.count ?? 0) / total) * 100, totalCount: total };
}

export async function fetchRebookRate(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<{ rate: number | null; count: number }> {
  let query = supabase
    .from('v_all_appointments' as any)
    .select('rebooked_at_checkout')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")');

  query = applyLocationFilter(query, locationId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return { rate: null, count: 0 };
  const rows = data as any[];
  const rebooked = rows.filter((r: any) => r.rebooked_at_checkout === true).length;
  return { rate: (rebooked / rows.length) * 100, count: rows.length };
}

export async function fetchNewClientPct(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<{ rate: number | null; count: number }> {
  let query = supabase
    .from('v_all_appointments' as any)
    .select('is_new_client')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")');

  query = applyLocationFilter(query, locationId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return { rate: null, count: 0 };
  const rows = data as any[];
  const newClients = rows.filter((r: any) => r.is_new_client === true).length;
  return { rate: (newClients / rows.length) * 100, count: rows.length };
}
