import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface AtRiskClient {
  id: string;
  name: string;
  lastVisit: string;
  daysSinceVisit: number;
  totalSpend: number;
}

interface ClientRetentionData {
  totalClients: number;
  newClients: number;
  returningClients: number;
  retentionRate: number;
  atRiskClients: number;
  averageLTV: number;
  atRiskClientsList: AtRiskClient[];
}

export function useClientRetentionReport(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['client-retention-report', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<ClientRetentionData> => {
      // Get all clients (batch to bypass 1,000 row limit)
      const clients: { id: string; name: string | null; created_at: string }[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_clients')
          .select('id, name, created_at')
          .eq('is_duplicate', false)
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          clients.push(...data);
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (!clients || clients.length === 0) {
        return {
          totalClients: 0,
          newClients: 0,
          returningClients: 0,
          retentionRate: 0,
          atRiskClients: 0,
          averageLTV: 0,
          atRiskClientsList: [],
        };
      }

      // Get appointments in date range
      let appointmentsQuery = supabase
        .from('phorest_appointments')
        .select('phorest_client_id, appointment_date, total_price')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId) {
        appointmentsQuery = appointmentsQuery.eq('location_id', locationId);
      }

      const { data: appointments } = await appointmentsQuery;

      // Get all-time appointments for LTV
      const { data: allAppointments } = await supabase
        .from('phorest_appointments')
        .select('phorest_client_id, appointment_date, total_price')
        .not('status', 'in', '("cancelled","no_show")');

      // Calculate metrics
      const clientsInPeriod = new Set(appointments?.map(a => a.phorest_client_id).filter(Boolean));
      const newClientsInPeriod = clients.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= new Date(dateFrom) && createdDate <= new Date(dateTo);
      });

      // Calculate client LTV and last visit
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

      // Find at-risk clients (60+ days since last visit, 2+ lifetime visits)
      const today = new Date();
      const atRiskClientsList: AtRiskClient[] = [];

      clients.forEach(client => {
        const stats = clientStats[client.id];
        if (!stats || stats.visitCount < 2) return;

        const daysSince = differenceInDays(today, new Date(stats.lastVisit));
        if (daysSince >= 60) {
          atRiskClientsList.push({
            id: client.id,
            name: client.name || 'Unknown',
            lastVisit: stats.lastVisit,
            daysSinceVisit: daysSince,
            totalSpend: stats.totalSpend,
          });
        }
      });

      atRiskClientsList.sort((a, b) => b.totalSpend - a.totalSpend);

      // Calculate average LTV
      const totalLTV = Object.values(clientStats).reduce((sum, s) => sum + s.totalSpend, 0);
      const averageLTV = Object.keys(clientStats).length > 0 
        ? totalLTV / Object.keys(clientStats).length 
        : 0;

      // Calculate retention rate (clients who returned in period / clients from previous period)
      const returningClients = clientsInPeriod.size - newClientsInPeriod.length;
      const retentionRate = clients.length > 0 
        ? (returningClients / clients.length) * 100 
        : 0;

      return {
        totalClients: clients.length,
        newClients: newClientsInPeriod.length,
        returningClients: Math.max(0, returningClients),
        retentionRate,
        atRiskClients: atRiskClientsList.length,
        averageLTV,
        atRiskClientsList: atRiskClientsList.slice(0, 50),
      };
    },
  });
}
