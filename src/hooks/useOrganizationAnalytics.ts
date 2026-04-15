import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface OrganizationMetrics {
  id: string;
  name: string;
  slug: string;
  accountNumber: number;
  subscriptionTier: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  activatedAt: string | null;
  
  // Size metrics
  locationCount: number;
  userCount: number;
  activeUserCount: number;
  clientCount: number;
  appointmentCount: number;
  
  // Revenue (salon revenue, not subscription)
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;
  averageTicket: number;
  serviceRevenue: number;
  retailRevenue: number;
  
  // Performance
  avgRebookingRate: number;
  avgRetentionRate: number;
  avgRetailAttachment: number;
  newClientsThisMonth: number;
  
  // Subscription
  mrr: number;
  billingCycle: string | null;
}

export interface PlatformAnalyticsSummary {
  totalOrganizations: number;
  activeOrganizations: number;
  totalLocations: number;
  totalUsers: number;
  totalClients: number;
  totalAppointments: number;
  
  // Revenue
  combinedMonthlyRevenue: number;
  avgRevenuePerOrg: number;
  avgRevenuePerLocation: number;
  platformMRR: number;
  platformARR: number;
  
  // Performance averages
  platformAvgRebooking: number;
  platformAvgRetention: number;
  platformAvgTicket: number;
  platformAvgRetailAttachment: number;
  
  // Geographic distribution
  countryDistribution: { country: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  tierDistribution: { tier: string; count: number; mrr: number }[];
  
  // Growth data
  monthlyGrowth: { month: string; organizations: number; locations: number; users: number }[];
  
  // Full metrics list
  organizationMetrics: OrganizationMetrics[];
}

export function useOrganizationAnalytics() {
  // Fetch all organizations
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ['platform-analytics-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('account_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch locations with org mapping
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['platform-analytics-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, organization_id, is_active, country')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch employee counts per org
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['platform-analytics-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, organization_id, is_active, is_approved');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch billing data for subscription info
  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ['platform-analytics-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_billing')
        .select(`
          organization_id,
          billing_cycle,
          base_price,
          custom_price,
          subscription_plans (name)
        `);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch clients count per location (dual-source: Zura clients + phorest_clients)
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['platform-analytics-clients'],
    queryFn: async () => {
      // Try Zura-owned clients first
      const { data: zuraClients, error: zuraError } = await supabase
        .from('clients')
        .select('id, location_id, phorest_client_id')
        .eq('status', 'active')
        .eq('is_placeholder', false);

      // Also fetch phorest_clients
      const { data: phorestClients } = await supabase
        .from('phorest_clients')
        .select('id, location_id')
        .eq('is_duplicate', false);

      // Merge: deduplicate by phorest_client_id
      const seenPhorestIds = new Set(
        (zuraClients || []).map((c: any) => c.phorest_client_id).filter(Boolean)
      );
      const merged = [
        ...(zuraClients || []).map((c: any) => ({ id: c.id, location_id: c.location_id })),
        ...(phorestClients || []).filter((c: any) => !seenPhorestIds.has(c.id)).map((c: any) => ({ id: c.id, location_id: c.location_id })),
      ];
      return merged;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sales data from live POS transaction items
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['platform-analytics-sales'],
    queryFn: async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const startDate = sixtyDaysAgo.toISOString().split('T')[0];
      
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('v_all_transaction_items')
          .select('location_id, transaction_date, total_amount, tax_amount, item_type')
          .gte('transaction_date', startDate)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Aggregate by location + date to produce summary-like rows
      const byKey: Record<string, any> = {};
      for (const item of allData) {
        const date = (item.transaction_date || '').slice(0, 10);
        const key = `${item.location_id || ''}|${date}`;
        if (!byKey[key]) {
          byKey[key] = { location_id: item.location_id, summary_date: date, total_revenue: 0, service_revenue: 0, product_revenue: 0, average_ticket: 0, _count: 0 };
        }
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        byKey[key].total_revenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') byKey[key].service_revenue += amount;
        else byKey[key].product_revenue += amount;
        byKey[key]._count += 1;
      }
      // Calculate average ticket
      for (const row of Object.values(byKey)) {
        row.average_ticket = row._count > 0 ? row.total_revenue / row._count : 0;
      }
      return Object.values(byKey);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch performance metrics live from appointments (rebooking, new clients)
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['platform-analytics-performance'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Fetch appointments with rebooking + new client flags
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, rebooked_at_checkout, is_new_client, location_id')
          .gte('appointment_date', startDate)
          .not('status', 'in', '("cancelled","no_show")')
          .eq('is_demo', false)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Get staff → user_id mapping
      const { data: mappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, user_id');
      const staffToUser: Record<string, string> = {};
      (mappings || []).forEach((m: any) => {
        if (m.phorest_staff_id && m.user_id) staffToUser[m.phorest_staff_id] = m.user_id;
      });

      // Aggregate per user_id
      const byUser: Record<string, { total: number; rebooked: number; newClients: number }> = {};
      for (const apt of allData) {
        const userId = apt.phorest_staff_id ? staffToUser[apt.phorest_staff_id] : null;
        if (!userId) continue;
        if (!byUser[userId]) byUser[userId] = { total: 0, rebooked: 0, newClients: 0 };
        byUser[userId].total++;
        if (apt.rebooked_at_checkout) byUser[userId].rebooked++;
        if (apt.is_new_client) byUser[userId].newClients++;
      }

      // Convert to array with user_id key
      return Object.entries(byUser).map(([userId, d]) => ({
        user_id: userId,
        rebooking_rate: d.total > 0 ? (d.rebooked / d.total) * 100 : 0,
        retention_rate: d.total > 0 ? ((d.total - d.newClients) / d.total) * 100 : 0,
        new_clients: d.newClients,
        total_revenue: 0, // Revenue comes from salesData
        retail_sales: 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch appointments count
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['platform-analytics-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('id, location_id');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const analytics = useMemo<PlatformAnalyticsSummary | null>(() => {
    if (!organizations || !locations) return null;

    // Create location -> org mapping
    const locationOrgMap = new Map<string, string>();
    const orgCountryMap = new Map<string, string>();
    
    locations.forEach(loc => {
      if (loc.organization_id) {
        locationOrgMap.set(loc.id, loc.organization_id);
        // Track first country found for each org
        if (loc.country && !orgCountryMap.has(loc.organization_id)) {
          orgCountryMap.set(loc.organization_id, loc.country);
        }
      }
    });

    // Create user_id -> org_id mapping from employees
    const userOrgMap = new Map<string, string>();
    employees?.forEach(emp => {
      if (emp.user_id && emp.organization_id) {
        userOrgMap.set(emp.user_id, emp.organization_id);
      }
    });

    // Aggregate metrics per organization
    const orgMetricsMap = new Map<string, OrganizationMetrics>();

    // Initialize all orgs
    organizations.forEach(org => {
      const billing = billingData?.find(b => b.organization_id === org.id);
      const effectivePrice = billing?.custom_price ?? billing?.base_price ?? 0;
      const monthlyPrice = billing?.billing_cycle === 'annual' 
        ? effectivePrice / 12 
        : effectivePrice;

      orgMetricsMap.set(org.id, {
        id: org.id,
        name: org.name,
        slug: org.slug,
        accountNumber: org.account_number || 0,
        subscriptionTier: (billing?.subscription_plans as any)?.name || null,
        country: orgCountryMap.get(org.id) || null,
        status: org.status || 'unknown',
        createdAt: org.created_at || '',
        activatedAt: org.activated_at,
        locationCount: 0,
        userCount: 0,
        activeUserCount: 0,
        clientCount: 0,
        appointmentCount: 0,
        totalRevenue: 0,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        revenueGrowth: 0,
        averageTicket: 0,
        serviceRevenue: 0,
        retailRevenue: 0,
        avgRebookingRate: 0,
        avgRetentionRate: 0,
        avgRetailAttachment: 0,
        newClientsThisMonth: 0,
        mrr: monthlyPrice,
        billingCycle: billing?.billing_cycle || null,
      });
    });

    // Count locations per org
    locations.forEach(loc => {
      if (loc.organization_id && orgMetricsMap.has(loc.organization_id)) {
        const metrics = orgMetricsMap.get(loc.organization_id)!;
        metrics.locationCount++;
      }
    });

    // Count employees per org
    employees?.forEach(emp => {
      if (emp.organization_id && orgMetricsMap.has(emp.organization_id)) {
        const metrics = orgMetricsMap.get(emp.organization_id)!;
        metrics.userCount++;
        if (emp.is_active && emp.is_approved) {
          metrics.activeUserCount++;
        }
      }
    });

    // Count clients per org (via location)
    clients?.forEach(client => {
      if (client.location_id) {
        const orgId = locationOrgMap.get(client.location_id);
        if (orgId && orgMetricsMap.has(orgId)) {
          orgMetricsMap.get(orgId)!.clientCount++;
        }
      }
    });

    // Count appointments per org
    appointments?.forEach(apt => {
      if (apt.location_id) {
        const orgId = locationOrgMap.get(apt.location_id);
        if (orgId && orgMetricsMap.has(orgId)) {
          orgMetricsMap.get(orgId)!.appointmentCount++;
        }
      }
    });

    // Aggregate revenue per org
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const orgRevenueThisMonth = new Map<string, number>();
    const orgRevenueLastMonth = new Map<string, number>();
    const orgTickets = new Map<string, number[]>();

    salesData?.forEach(sale => {
      if (sale.location_id) {
        const orgId = locationOrgMap.get(sale.location_id);
        if (orgId && orgMetricsMap.has(orgId)) {
          const metrics = orgMetricsMap.get(orgId)!;
          metrics.totalRevenue += sale.total_revenue || 0;
          metrics.serviceRevenue += sale.service_revenue || 0;
          metrics.retailRevenue += sale.product_revenue || 0;

          const saleDate = new Date(sale.summary_date);
          if (saleDate >= thisMonthStart) {
            orgRevenueThisMonth.set(orgId, (orgRevenueThisMonth.get(orgId) || 0) + (sale.total_revenue || 0));
          } else if (saleDate >= lastMonthStart && saleDate <= lastMonthEnd) {
            orgRevenueLastMonth.set(orgId, (orgRevenueLastMonth.get(orgId) || 0) + (sale.total_revenue || 0));
          }

          if (sale.average_ticket) {
            if (!orgTickets.has(orgId)) orgTickets.set(orgId, []);
            orgTickets.get(orgId)!.push(sale.average_ticket);
          }
        }
      }
    });

    // Calculate revenue growth and average ticket
    orgMetricsMap.forEach((metrics, orgId) => {
      metrics.revenueThisMonth = orgRevenueThisMonth.get(orgId) || 0;
      metrics.revenueLastMonth = orgRevenueLastMonth.get(orgId) || 0;
      if (metrics.revenueLastMonth > 0) {
        metrics.revenueGrowth = ((metrics.revenueThisMonth - metrics.revenueLastMonth) / metrics.revenueLastMonth) * 100;
      }
      const tickets = orgTickets.get(orgId) || [];
      metrics.averageTicket = tickets.length > 0 ? tickets.reduce((a, b) => a + b, 0) / tickets.length : 0;
    });

    // Aggregate performance metrics per org (via user_id -> org mapping)
    const orgPerformance = new Map<string, { rebooking: number[]; retention: number[]; newClients: number }>();

    performanceData?.forEach(perf => {
      if (perf.user_id) {
        const orgId = userOrgMap.get(perf.user_id);
        if (orgId) {
          if (!orgPerformance.has(orgId)) {
            orgPerformance.set(orgId, { rebooking: [], retention: [], newClients: 0 });
          }
          const p = orgPerformance.get(orgId)!;
          if (perf.rebooking_rate) p.rebooking.push(perf.rebooking_rate);
          if (perf.retention_rate) p.retention.push(perf.retention_rate);
          p.newClients += perf.new_clients || 0;
        }
      }
    });

    orgPerformance.forEach((perf, orgId) => {
      if (orgMetricsMap.has(orgId)) {
        const metrics = orgMetricsMap.get(orgId)!;
        metrics.avgRebookingRate = perf.rebooking.length > 0 ? perf.rebooking.reduce((a, b) => a + b, 0) / perf.rebooking.length : 0;
        metrics.avgRetentionRate = perf.retention.length > 0 ? perf.retention.reduce((a, b) => a + b, 0) / perf.retention.length : 0;
        // Retail attachment calculated from salesData
        metrics.avgRetailAttachment = metrics.totalRevenue > 0 ? (metrics.retailRevenue / metrics.totalRevenue) * 100 : 0;
        metrics.newClientsThisMonth = perf.newClients;
      }
    });

    // Convert to array
    const allMetrics = Array.from(orgMetricsMap.values());

    // Calculate platform totals
    const totalOrganizations = allMetrics.length;
    const activeOrganizations = allMetrics.filter(m => m.status === 'active').length;
    const totalLocations = allMetrics.reduce((sum, m) => sum + m.locationCount, 0);
    const totalUsers = allMetrics.reduce((sum, m) => sum + m.userCount, 0);
    const totalClients = allMetrics.reduce((sum, m) => sum + m.clientCount, 0);
    const totalAppointments = allMetrics.reduce((sum, m) => sum + m.appointmentCount, 0);
    const combinedMonthlyRevenue = allMetrics.reduce((sum, m) => sum + m.revenueThisMonth, 0);
    const platformMRR = allMetrics.reduce((sum, m) => sum + m.mrr, 0);

    // Calculate averages
    const orgsWithRevenue = allMetrics.filter(m => m.totalRevenue > 0);
    const avgRevenuePerOrg = orgsWithRevenue.length > 0 
      ? orgsWithRevenue.reduce((sum, m) => sum + m.revenueThisMonth, 0) / orgsWithRevenue.length 
      : 0;
    const avgRevenuePerLocation = totalLocations > 0 ? combinedMonthlyRevenue / totalLocations : 0;

    const orgsWithMetrics = allMetrics.filter(m => m.avgRebookingRate > 0);
    const platformAvgRebooking = orgsWithMetrics.length > 0
      ? orgsWithMetrics.reduce((sum, m) => sum + m.avgRebookingRate, 0) / orgsWithMetrics.length
      : 0;
    const platformAvgRetention = orgsWithMetrics.length > 0
      ? orgsWithMetrics.reduce((sum, m) => sum + m.avgRetentionRate, 0) / orgsWithMetrics.length
      : 0;
    const platformAvgTicket = orgsWithMetrics.length > 0
      ? orgsWithMetrics.reduce((sum, m) => sum + m.averageTicket, 0) / orgsWithMetrics.length
      : 0;
    const platformAvgRetailAttachment = orgsWithMetrics.length > 0
      ? orgsWithMetrics.reduce((sum, m) => sum + m.avgRetailAttachment, 0) / orgsWithMetrics.length
      : 0;

    // Geographic distribution (from locations)
    const countryMap = new Map<string, number>();
    allMetrics.forEach(m => {
      const country = m.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    const countryDistribution = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    // Status distribution
    const statusMap = new Map<string, number>();
    allMetrics.forEach(m => {
      statusMap.set(m.status, (statusMap.get(m.status) || 0) + 1);
    });
    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }));

    // Tier distribution
    const tierMap = new Map<string, { count: number; mrr: number }>();
    allMetrics.forEach(m => {
      const tier = m.subscriptionTier || 'No Plan';
      const existing = tierMap.get(tier) || { count: 0, mrr: 0 };
      tierMap.set(tier, { count: existing.count + 1, mrr: existing.mrr + m.mrr });
    });
    const tierDistribution = Array.from(tierMap.entries())
      .map(([tier, data]) => ({ tier, count: data.count, mrr: data.mrr }))
      .sort((a, b) => b.mrr - a.mrr);

    // Monthly growth (based on created_at)
    const monthlyGrowthMap = new Map<string, { organizations: number; locations: number; users: number }>();
    allMetrics.forEach(m => {
      if (m.createdAt) {
        const month = m.createdAt.slice(0, 7); // YYYY-MM
        const existing = monthlyGrowthMap.get(month) || { organizations: 0, locations: 0, users: 0 };
        monthlyGrowthMap.set(month, {
          organizations: existing.organizations + 1,
          locations: existing.locations + m.locationCount,
          users: existing.users + m.userCount,
        });
      }
    });
    const monthlyGrowth = Array.from(monthlyGrowthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalOrganizations,
      activeOrganizations,
      totalLocations,
      totalUsers,
      totalClients,
      totalAppointments,
      combinedMonthlyRevenue,
      avgRevenuePerOrg,
      avgRevenuePerLocation,
      platformMRR,
      platformARR: platformMRR * 12,
      platformAvgRebooking,
      platformAvgRetention,
      platformAvgTicket,
      platformAvgRetailAttachment,
      countryDistribution,
      statusDistribution,
      tierDistribution,
      monthlyGrowth,
      organizationMetrics: allMetrics,
    };
  }, [organizations, locations, employees, billingData, clients, salesData, performanceData, appointments]);

  const isLoading = orgsLoading || locationsLoading || employeesLoading || billingLoading || 
                    clientsLoading || salesLoading || performanceLoading || appointmentsLoading;

  // Leaderboard helpers
  const topByRevenue = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .sort((a, b) => b.revenueThisMonth - a.revenueThisMonth)
      .slice(0, 10);
  }, [analytics]);

  const topBySize = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .sort((a, b) => (b.locationCount + b.userCount) - (a.locationCount + a.userCount))
      .slice(0, 10);
  }, [analytics]);

  const topByGrowth = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .filter(m => m.revenueGrowth !== 0)
      .sort((a, b) => b.revenueGrowth - a.revenueGrowth)
      .slice(0, 10);
  }, [analytics]);

  const topByPerformance = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .filter(m => m.avgRebookingRate > 0 || m.avgRetentionRate > 0)
      .sort((a, b) => (b.avgRebookingRate + b.avgRetentionRate) - (a.avgRebookingRate + a.avgRetentionRate))
      .slice(0, 10);
  }, [analytics]);

  const topByClients = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .sort((a, b) => b.newClientsThisMonth - a.newClientsThisMonth)
      .slice(0, 10);
  }, [analytics]);

  const topByRetail = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.organizationMetrics]
      .filter(m => m.avgRetailAttachment > 0)
      .sort((a, b) => b.avgRetailAttachment - a.avgRetailAttachment)
      .slice(0, 10);
  }, [analytics]);

  return {
    analytics,
    isLoading,
    topByRevenue,
    topBySize,
    topByGrowth,
    topByPerformance,
    topByClients,
    topByRetail,
  };
}
