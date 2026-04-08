import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { calculateCLV, CLV_TIERS, type CLVTier } from '@/lib/clv-calculator';

interface AtRiskClient {
  id: string;
  name: string;
  lastVisit: string;
  daysSinceVisit: number;
  totalSpend: number;
}

export interface CLVClientRow {
  id: string;
  name: string;
  tier: CLVTier;
  lifetimeValue: number;
  annualValue: number;
  avgTicket: number;
  annualFrequency: number;
  visitCount: number;
  totalSpend: number;
  lastVisit: string | null;
}

export interface CLVTierDistribution {
  tier: CLVTier;
  label: string;
  count: number;
  totalAnnualValue: number;
  percentOfClients: number;
  percentOfValue: number;
}

interface ClientRetentionData {
  totalClients: number;
  newClients: number;
  returningClients: number;
  retentionRate: number;
  atRiskClients: number;
  averageLTV: number;
  atRiskClientsList: AtRiskClient[];
  clvClients: CLVClientRow[];
  clvTierDistribution: CLVTierDistribution[];
  totalPortfolioValue: number;
  averageCLV: number;
  medianCLV: number;
  top10RevenueShare: number;
  top50RevenueShare: number;
}

interface NormalizedClient {
  id: string;
  name: string;
  created_at: string;
  first_visit: string | null;
  last_visit: string | null;
  total_spend: number;
  visit_count: number;
  client_since: string | null;
  phorest_client_id: string | null;
}

export function useClientRetentionReport(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['client-retention-report', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<ClientRetentionData> => {
      // Fetch from both sources and merge
      const allClients: NormalizedClient[] = [];

      // 1. Zura-owned clients (primary)
      {
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('clients')
            .select('id, first_name, last_name, created_at, first_visit, last_visit_date, total_spend, visit_count, client_since, phorest_client_id')
            .eq('status', 'active')
            .eq('is_placeholder', false)
            .range(offset, offset + batchSize - 1);
          if (error) break;
          (data || []).forEach((c: any) => {
            allClients.push({
              id: c.id,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
              created_at: c.created_at || '',
              first_visit: c.first_visit || c.client_since,
              last_visit: c.last_visit_date,
              total_spend: Number(c.total_spend) || 0,
              visit_count: c.visit_count || 0,
              client_since: c.client_since,
              phorest_client_id: c.phorest_client_id,
            });
          });
          hasMore = (data?.length || 0) === batchSize;
          offset += batchSize;
        }
      }

      // 2. Phorest clients (supplement — add those not already present)
      const seenPhorestIds = new Set(allClients.map(c => c.phorest_client_id).filter(Boolean));
      {
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('phorest_clients')
            .select('id, name, created_at, first_visit, last_visit, total_spend, visit_count, client_since')
            .eq('is_duplicate', false)
            .range(offset, offset + batchSize - 1);
          if (error) break;
          (data || []).forEach((c: any) => {
            if (!seenPhorestIds.has(c.id)) {
              allClients.push({
                id: c.id,
                name: c.name || 'Unknown',
                created_at: c.created_at || '',
                first_visit: c.first_visit,
                last_visit: c.last_visit,
                total_spend: Number(c.total_spend) || 0,
                visit_count: c.visit_count || 0,
                client_since: c.client_since,
                phorest_client_id: c.id,
              });
            }
          });
          hasMore = (data?.length || 0) === batchSize;
          offset += batchSize;
        }
      }

      if (allClients.length === 0) {
        return {
          totalClients: 0, newClients: 0, returningClients: 0, retentionRate: 0,
          atRiskClients: 0, averageLTV: 0, atRiskClientsList: [],
          clvClients: [], clvTierDistribution: [], totalPortfolioValue: 0,
          averageCLV: 0, medianCLV: 0, top10RevenueShare: 0, top50RevenueShare: 0,
        };
      }

      // Get appointments in date range (both tables)
      let phorestAptQuery = supabase
        .from('phorest_appointments')
        .select('phorest_client_id, appointment_date, total_price')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId) {
        phorestAptQuery = phorestAptQuery.eq('location_id', locationId);
      }

      const { data: appointments } = await phorestAptQuery;

      // Get all-time appointments for LTV
      const { data: allAppointments } = await supabase
        .from('phorest_appointments')
        .select('phorest_client_id, appointment_date, total_price')
        .not('status', 'in', '("cancelled","no_show")');

      // Calculate metrics
      const clientsInPeriod = new Set(appointments?.map(a => a.phorest_client_id).filter(Boolean));
      const newClientsInPeriod = allClients.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= new Date(dateFrom) && createdDate <= new Date(dateTo);
      });

      // Calculate client LTV from appointments
      const clientStats: Record<string, { totalSpend: number; lastVisit: string; visitCount: number }> = {};
      
      allAppointments?.forEach(apt => {
        const clientId = apt.phorest_client_id;
        if (!clientId) return;
        if (!clientStats[clientId]) {
          clientStats[clientId] = { totalSpend: 0, lastVisit: apt.appointment_date, visitCount: 0 };
        }
        clientStats[clientId].totalSpend += Number(apt.total_price) || 0;
        clientStats[clientId].visitCount += 1;
        if (apt.appointment_date > clientStats[clientId].lastVisit) {
          clientStats[clientId].lastVisit = apt.appointment_date;
        }
      });

      // Find at-risk clients
      const today = new Date();
      const atRiskClientsList: AtRiskClient[] = [];

      allClients.forEach(client => {
        const stats = clientStats[client.id] || clientStats[client.phorest_client_id || ''];
        const visitCount = stats?.visitCount || client.visit_count;
        if (visitCount < 2) return;
        const lastVisit = stats?.lastVisit || client.last_visit;
        if (!lastVisit) return;
        const daysSince = differenceInDays(today, new Date(lastVisit));
        if (daysSince >= 60) {
          atRiskClientsList.push({
            id: client.id,
            name: client.name,
            lastVisit,
            daysSinceVisit: daysSince,
            totalSpend: stats?.totalSpend || client.total_spend,
          });
        }
      });

      atRiskClientsList.sort((a, b) => b.totalSpend - a.totalSpend);

      // Calculate average LTV
      const totalLTV = Object.values(clientStats).reduce((sum, s) => sum + s.totalSpend, 0);
      const averageLTV = Object.keys(clientStats).length > 0 
        ? totalLTV / Object.keys(clientStats).length 
        : 0;

      // Retention rate
      const returningClients = clientsInPeriod.size - newClientsInPeriod.length;
      const retentionRate = allClients.length > 0 
        ? (returningClients / allClients.length) * 100 
        : 0;

      // CLV computation
      const clvClients: CLVClientRow[] = [];
      
      allClients.forEach(client => {
        const firstVisit = client.client_since || client.first_visit || null;
        const clv = calculateCLV(client.total_spend, client.visit_count, firstVisit, client.last_visit);
        if (!clv.isReliable) return;

        const annualValue = clv.annualValue;
        const tier: CLVTier = annualValue >= 2000 ? 'platinum'
          : annualValue >= 1000 ? 'gold'
          : annualValue >= 500 ? 'silver'
          : 'bronze';

        clvClients.push({
          id: client.id,
          name: client.name,
          tier,
          lifetimeValue: clv.lifetimeValue,
          annualValue,
          avgTicket: clv.avgTicket,
          annualFrequency: clv.annualFrequency,
          visitCount: client.visit_count,
          totalSpend: client.total_spend,
          lastVisit: client.last_visit,
        });
      });

      clvClients.sort((a, b) => b.annualValue - a.annualValue);

      // Tier distribution
      const tierKeys: CLVTier[] = ['platinum', 'gold', 'silver', 'bronze'];
      const totalAnnualAll = clvClients.reduce((s, c) => s + c.annualValue, 0);
      const clvTierDistribution: CLVTierDistribution[] = tierKeys.map(tier => {
        const inTier = clvClients.filter(c => c.tier === tier);
        return {
          tier,
          label: CLV_TIERS[tier].label,
          count: inTier.length,
          totalAnnualValue: inTier.reduce((s, c) => s + c.annualValue, 0),
          percentOfClients: clvClients.length > 0 ? (inTier.length / clvClients.length) * 100 : 0,
          percentOfValue: totalAnnualAll > 0 ? (inTier.reduce((s, c) => s + c.annualValue, 0) / totalAnnualAll) * 100 : 0,
        };
      });

      const totalPortfolioValue = clvClients.reduce((s, c) => s + c.lifetimeValue, 0);
      const annualValues = clvClients.map(c => c.annualValue).sort((a, b) => b - a);
      const averageCLV = annualValues.length > 0 ? totalAnnualAll / annualValues.length : 0;
      const medianCLV = annualValues.length > 0 ? annualValues[Math.floor(annualValues.length / 2)] : 0;

      const top10Count = Math.max(1, Math.ceil(clvClients.length * 0.1));
      const top10Value = annualValues.slice(0, top10Count).reduce((s, v) => s + v, 0);
      const top10RevenueShare = totalAnnualAll > 0 ? (top10Value / totalAnnualAll) * 100 : 0;

      const top50Count = Math.max(1, Math.ceil(clvClients.length * 0.5));
      const top50Value = annualValues.slice(0, top50Count).reduce((s, v) => s + v, 0);
      const top50RevenueShare = totalAnnualAll > 0 ? (top50Value / totalAnnualAll) * 100 : 0;

      return {
        totalClients: allClients.length,
        newClients: newClientsInPeriod.length,
        returningClients: Math.max(0, returningClients),
        retentionRate,
        atRiskClients: atRiskClientsList.length,
        averageLTV,
        atRiskClientsList: atRiskClientsList.slice(0, 50),
        clvClients,
        clvTierDistribution,
        totalPortfolioValue,
        averageCLV,
        medianCLV,
        top10RevenueShare,
        top50RevenueShare,
      };
    },
  });
}
