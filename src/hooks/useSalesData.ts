import { useQuery } from '@tanstack/react-query';
import { formatDisplayName, formatFullDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface SalesTransaction {
  id: string;
  phorest_transaction_id: string;
  transaction_date: string;
  stylist_user_id: string | null;
  phorest_staff_id: string | null;
  client_name: string | null;
  item_type: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number | null;
  total_amount: number;
  payment_method: string | null;
  branch_name: string | null;
  location_id: string | null;
  created_at: string;
}

export interface DailySalesSummary {
  id: string;
  summary_date: string;
  user_id: string | null;
  phorest_staff_id: string | null;
  location_id: string | null;
  branch_name: string | null;
  total_revenue: number | null;
  service_revenue: number | null;
  product_revenue: number | null;
  total_services: number | null;
  total_products: number | null;
  total_transactions: number | null;
  average_ticket: number | null;
  total_discounts: number | null;
}

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  locationId?: string;
  itemType?: string;
}

export interface PhorestStaffSalesData {
  phorestStaffId: string;
  phorestStaffName: string;
  branchName?: string;
  isMapped: boolean;
  linkedUserId?: string;
  linkedUserName?: string;
  linkedUserPhoto?: string;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalServices: number;
  totalProducts: number;
  totalTransactions: number;
}

// Fetch sales transactions with filters
export function useSalesTransactions(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: ['sales-transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('phorest_sales_transactions')
        .select(`
          *,
          employee_profiles:stylist_user_id (
            full_name,
            display_name,
            photo_url
          )
        `)
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte('transaction_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('transaction_date', filters.dateTo);
      }
      if (filters.userId) {
        query = query.eq('stylist_user_id', filters.userId);
      }
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.itemType) {
        query = query.eq('item_type', filters.itemType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Fetch daily sales summaries (aggregated from live POS transaction items)
export function useDailySalesSummary(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: ['daily-sales-summary', filters],
    queryFn: async () => {
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let q = supabase
          .from('phorest_transaction_items')
          .select('stylist_user_id, total_amount, tax_amount, item_type, transaction_date, location_id')
          .range(from, from + pageSize - 1);

        if (filters.dateFrom) q = q.gte('transaction_date', filters.dateFrom);
        if (filters.dateTo) q = q.lte('transaction_date', filters.dateTo);
        if (filters.userId) q = q.eq('stylist_user_id', filters.userId);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);

        const { data, error } = await q;
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Aggregate by date + user to produce daily summary rows
      const byKey: Record<string, any> = {};
      for (const item of allData) {
        const date = (item.transaction_date || '').slice(0, 10);
        const key = `${date}|${item.stylist_user_id || ''}`;
        if (!byKey[key]) {
          byKey[key] = {
            summary_date: date,
            user_id: item.stylist_user_id,
            location_id: item.location_id,
            total_revenue: 0,
            service_revenue: 0,
            product_revenue: 0,
            total_services: 0,
            total_products: 0,
            total_transactions: 0,
          };
        }
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        byKey[key].total_revenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          byKey[key].service_revenue += amount;
          byKey[key].total_services += 1;
        } else {
          byKey[key].product_revenue += amount;
          byKey[key].total_products += 1;
        }
      }

      return Object.values(byKey).sort((a: any, b: any) => b.summary_date.localeCompare(a.summary_date));
    },
  });
}

// Resolve phorest staff IDs for a user from the staff mapping table
async function resolvePhorestStaffIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('phorest_staff_mapping')
    .select('phorest_staff_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return data?.map(m => m.phorest_staff_id) || [];
}

// Get sales summary for a specific user (for My Stats page) — from live POS transaction items
export function useUserSalesSummary(userId: string | undefined, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['user-sales-summary', userId, dateFrom, dateTo],
    queryFn: async () => {
      if (!userId) return null;

      // Resolve phorest staff IDs for fallback querying
      const phorestStaffIds = await resolvePhorestStaffIds(userId);

      // Fetch by stylist_user_id first
      const fetchItems = async (filterField: string, filterValues: string[]) => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          let q = supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount, item_type, transaction_date') as any;
          if (filterValues.length === 1) {
            q = q.eq(filterField, filterValues[0]);
          } else {
            q = q.in(filterField, filterValues);
          }
          if (dateFrom) q = q.gte('transaction_date', dateFrom);
          if (dateTo) q = q.lte('transaction_date', dateTo);
          const { data, error } = await q.range(from, from + pageSize - 1);
          if (error) throw error;
          allData.push(...(data || []));
          hasMore = (data?.length || 0) === pageSize;
          from += pageSize;
        }
        return allData;
      };

      let items = await fetchItems('stylist_user_id', [userId]);
      
      // Fallback: if no data by stylist_user_id, try phorest_staff_id
      if (items.length === 0 && phorestStaffIds.length > 0) {
        items = await fetchItems('phorest_staff_id', phorestStaffIds);
      }

      if (items.length === 0) return null;

      let totalRevenue = 0, serviceRevenue = 0, productRevenue = 0;
      let totalServices = 0, totalProducts = 0;
      const daysSet = new Set<string>();

      for (const item of items) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        totalRevenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          serviceRevenue += amount;
          totalServices += 1;
        } else {
          productRevenue += amount;
          totalProducts += 1;
        }
        const date = (item.transaction_date || '').slice(0, 10);
        if (date) daysSet.add(date);
      }

      const totalTransactions = totalServices + totalProducts;

      return {
        totalRevenue,
        serviceRevenue,
        productRevenue,
        totalServices,
        totalProducts,
        totalTransactions,
        totalDiscounts: 0,
        averageTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        daysWithData: daysSet.size,
        dailyData: [], // No longer relevant for summary
      };
    },
    enabled: !!userId,
  });
}

// Helper to calculate appointment duration in hours
function getAppointmentDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

// Using shared fetchAllBatched from @/utils/fetchAllBatched
import { fetchAllBatched } from '@/utils/fetchAllBatched';

// Get aggregated sales metrics for dashboard from appointments (since sales API is not available)
export function useSalesMetrics(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: ['sales-metrics-from-appointments', filters],
    queryFn: async () => {
      // Build appointment query with batch fetching
      const data = await fetchAllBatched<{
        id: string; total_price: number | null; tip_amount: number | null;
        service_name: string | null; phorest_staff_id: string | null;
        phorest_client_id: string | null;
        location_id: string | null; appointment_date: string;
        start_time: string | null; end_time: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('id, total_price, tip_amount, service_name, phorest_staff_id, phorest_client_id, location_id, appointment_date, start_time, end_time')
          .not('total_price', 'is', null)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);

        if (filters.dateFrom) q = q.gte('appointment_date', filters.dateFrom);
        if (filters.dateTo) q = q.lte('appointment_date', filters.dateTo);
        if (filters.locationId && filters.locationId !== 'all') {
          const ids = filters.locationId.split(',').filter(Boolean);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      // Build transaction items query for product revenue, tips, and POS transaction count
      const txItems = await fetchAllBatched<{
        total_amount: number | null; tax_amount: number | null; item_type: string | null; tip_amount: number | null; phorest_client_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('total_amount, tax_amount, item_type, tip_amount, phorest_client_id')
          .not('total_amount', 'is', null)
          .range(from, to);

        if (filters.dateFrom) q = q.gte('transaction_date', filters.dateFrom);
        if (filters.dateTo) q = q.lte('transaction_date', filters.dateTo);
        if (filters.locationId && filters.locationId !== 'all') {
          const ids = filters.locationId.split(',').filter(Boolean);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      // Aggregate product revenue, tips, and POS transaction count from transaction items
      let productRevenue = 0;
      let totalProducts = 0;
      const posClientIds = new Set<string>();
      for (const item of txItems) {
        const itemType = (item.item_type || '').toLowerCase();
        if (['product', 'retail'].includes(itemType)) {
          productRevenue += (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
          totalProducts += 1;
        }
        if (item.phorest_client_id) {
          posClientIds.add(item.phorest_client_id);
        }
      }
      const posTransactionCount = posClientIds.size;

      // Derive total revenue from transaction items (actual POS data, the single source of truth)
      let txServiceRevenue = 0;
      let txTotalRevenue = 0;
      for (const item of txItems) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        txTotalRevenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service' || itemType === 'sale_fee') {
          txServiceRevenue += amount;
        }
      }

      // Sum tips from appointments, deduplicating multi-service appointments
      // Phorest duplicates the same tip on every service line item within one visit
      const seenTipKeys = new Set<string>();
      let totalTipsFromAppointments = 0;
      for (const apt of data) {
        const tip = Number(apt.tip_amount) || 0;
        if (tip === 0) continue;
        const key = `${apt.phorest_staff_id}|${apt.phorest_client_id}|${apt.appointment_date}|${tip}`;
        if (!seenTipKeys.has(key)) {
          seenTipKeys.add(key);
          totalTipsFromAppointments += tip;
        }
      }

      // Use transaction items as the authoritative revenue source when available;
      // fall back to appointments only if no transaction data exists at all.
      const hasTransactionData = txItems.length > 0;

      if (data.length === 0 && !hasTransactionData) {
        return {
          totalRevenue: 0,
          serviceRevenue: 0,
          productRevenue: 0,
          totalServices: 0,
          totalProducts: 0,
          totalTransactions: 0,
          averageTicket: 0,
          totalDiscounts: 0,
          unmappedStaffRecords: 0,
          totalServiceHours: 0,
          daysWithSales: 0,
          totalTips: 0,
          dataSource: 'appointments' as const,
        };
      }

      // Revenue from actual POS transactions (single source of truth per sales-analytics-data-integrity-standards)
      const totalRevenue = hasTransactionData
        ? txTotalRevenue
        : data.reduce((sum, apt) => sum + ((Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0)), 0);
      const serviceRevenue = hasTransactionData
        ? txServiceRevenue
        : Math.max(0, totalRevenue - productRevenue);
      const totalServices = data.length;
      const uniqueVisits = new Set(data.map(d => `${d.phorest_client_id}|${d.appointment_date}`).filter(k => !k.startsWith('null'))).size;
      const daysWithSales = new Set(data.map(d => d.appointment_date).filter(Boolean)).size;
      
      // Calculate total service hours from appointment durations
      const totalServiceHours = data.reduce((sum, apt) => {
        if (apt.start_time && apt.end_time) {
          return sum + getAppointmentDurationHours(apt.start_time, apt.end_time);
        }
        return sum;
      }, 0);

      return {
        totalRevenue,
        serviceRevenue,
        productRevenue,
        totalServices,
        totalProducts,
        totalTransactions: posTransactionCount || uniqueVisits || totalServices,
        averageTicket: posTransactionCount > 0 ? totalRevenue / posTransactionCount : (uniqueVisits > 0 ? totalRevenue / uniqueVisits : (totalServices > 0 ? totalRevenue / totalServices : 0)),
        totalDiscounts: 0,
        unmappedStaffRecords: 0,
        totalServiceHours,
        daysWithSales,
        totalTips: totalTipsFromAppointments,
        dataSource: 'appointments' as const,
      };
    },
  });
}

// Get sales by stylist for leaderboard (from actual POS transaction data)
export function useSalesByStylist(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['sales-by-stylist-from-transactions', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Get staff mappings with photos
      const { data: mappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, user_id, phorest_staff_name')
        .eq('is_active', true);

      // Resolve names via centralized utility
      const phorestIds = (mappings || []).map(m => m.phorest_staff_id);
      const { resolveStaffNames } = await import('@/utils/resolveStaffNames');
      const staffNameData = await resolveStaffNames(phorestIds);

      // Fetch photos from employee_profiles
      const userIds = (mappings || []).filter(m => m.user_id).map(m => m.user_id!);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('employee_profiles').select('user_id, photo_url').in('user_id', userIds)
        : { data: [] as any[] };
      const photoMap = new Map((profiles || []).map((p: any) => [p.user_id, p.photo_url]));

      const mappingLookup: Record<string, { userId: string; name: string; photo?: string }> = {};
      const staffNameLookup: Record<string, string> = {};
      (mappings || []).forEach(m => {
        if (m.user_id) {
          mappingLookup[m.phorest_staff_id] = {
            userId: m.user_id,
            name: staffNameData.byPhorestId[m.phorest_staff_id] || m.phorest_staff_name || 'Unknown',
            photo: photoMap.get(m.user_id) || undefined,
          };
        }
        if (m.phorest_staff_name) {
          staffNameLookup[m.phorest_staff_id] = staffNameData.byPhorestId[m.phorest_staff_id] || m.phorest_staff_name;
        }
      });

      // Fetch actual POS transaction items with batch fetching
      const data = await fetchAllBatched<{
        phorest_staff_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        item_type: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, total_amount, tax_amount, item_type')
          .not('phorest_staff_id', 'is', null)
          .not('total_amount', 'is', null)
          .range(from, to);

        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId && locationId !== 'all') {
          const ids = locationId.split(',').filter(Boolean);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      // Aggregate by staff, splitting service vs product revenue
      const byUser: Record<string, any> = {};
      data.forEach(item => {
        const staffId = item.phorest_staff_id!;
        const mapping = mappingLookup[staffId];
        
        const userId = mapping ? mapping.userId : `phorest:${staffId}`;
        const displayName = mapping
          ? mapping.name
          : (staffNameLookup[staffId] || `Staff ${staffId.slice(0, 4)}`);
        const photo = mapping?.photo;

        if (!byUser[userId]) {
          byUser[userId] = {
            user_id: userId,
            name: displayName,
            photo_url: photo,
            totalRevenue: 0,
            serviceRevenue: 0,
            productRevenue: 0,
            totalServices: 0,
            totalProducts: 0,
            totalTransactions: 0,
          };
        }

        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        const isProduct = ['product', 'retail'].includes(itemType);

        byUser[userId].totalRevenue += amount;
        if (isProduct) {
          byUser[userId].productRevenue += amount;
          byUser[userId].totalProducts += 1;
        } else {
          byUser[userId].serviceRevenue += amount;
          byUser[userId].totalServices += 1;
        }
        byUser[userId].totalTransactions += 1;
      });

      return Object.values(byUser).sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
  });
}

// Get sales by location (from appointments)
export function useSalesByLocation(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['sales-by-location-from-appointments', dateFrom, dateTo],
    queryFn: async () => {
      // First fetch locations to map IDs to names
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, is_active')
        .eq('is_active', true);

      // Fetch appointments with batch fetching + status filter
      const data = await fetchAllBatched<{
        location_id: string | null; total_price: number | null; tip_amount: number | null; phorest_client_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('location_id, total_price, tip_amount, phorest_client_id')
          .not('total_price', 'is', null)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);

        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        return q;
      });

      // Pre-populate ALL active locations with zero values
      const byLocation: Record<string, any> = {};
      locations?.forEach(loc => {
        byLocation[loc.id] = {
          location_id: loc.id,
          name: loc.name || 'Unknown Location',
          totalRevenue: 0,
          serviceRevenue: 0,
          productRevenue: 0,
          totalServices: 0,
          totalProducts: 0,
          totalTransactions: 0,
        };
      });

      // Add revenue data from appointments to existing location entries
      // Track unique client visits per location
      const locationVisitSets: Record<string, Set<string>> = {};
      data.forEach(apt => {
        const key = apt.location_id;
        if (key && byLocation[key]) {
          const tipAdj = (Number(apt.total_price) || 0) - (Number((apt as any).tip_amount) || 0);
          byLocation[key].totalRevenue += tipAdj;
          byLocation[key].serviceRevenue += tipAdj;
          byLocation[key].totalServices += 1;
          if (!locationVisitSets[key]) locationVisitSets[key] = new Set();
          const clientKey = (apt as any).phorest_client_id;
          if (clientKey) locationVisitSets[key].add(clientKey);
          else byLocation[key].totalTransactions += 1;
        }
      });
      // Set totalTransactions from unique visits
      Object.entries(locationVisitSets).forEach(([locId, visits]) => {
        if (byLocation[locId]) byLocation[locId].totalTransactions = visits.size;
      });

      return Object.values(byLocation).sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
  });
}

export interface ServiceMixItem {
  category: string;
  revenue: number;
  count: number;
  percentRevenue: number;
}

/** Revenue and count by service category from appointments. */
export function useServiceMix(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['service-mix', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<ServiceMixItem[]> => {
      const data = await fetchAllBatched<{
        service_category: string | null;
        total_price: number | null;
        tip_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('service_category, total_price, tip_amount')
          .not('total_price', 'is', null)
          .in('status', ['completed'])
          .range(from, to);

        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const byCategory: Record<string, { revenue: number; count: number }> = {};
      (data || []).forEach((row) => {
        const cat = (row as { service_category?: string | null }).service_category || 'Uncategorized';
        if (!byCategory[cat]) byCategory[cat] = { revenue: 0, count: 0 };
        byCategory[cat].revenue += (Number((row as any).total_price) || 0) - (Number((row as any).tip_amount) || 0);
        byCategory[cat].count += 1;
      });

      const total = Object.values(byCategory).reduce((s, x) => s + x.revenue, 0);
      return Object.entries(byCategory)
        .map(([category, { revenue, count }]) => ({
          category,
          revenue,
          count,
          percentRevenue: total > 0 ? (revenue / total) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

// Get daily trend data for charts (from appointments)
export function useSalesTrend(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['sales-trend-from-appointments', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<{
        appointment_date: string | null;
        total_price: number | null;
        tip_amount: number | null;
        location_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('appointment_date, total_price, tip_amount, location_id')
          .not('total_price', 'is', null)
          .order('appointment_date', { ascending: true })
          .range(from, to);

        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Aggregate by date (for overall trend)
      const byDate: Record<string, any> = {};
      // Also track by location
      const byLocationDate: Record<string, Record<string, number>> = {};
      
      data?.forEach(apt => {
        const dateKey = apt.appointment_date?.split('T')[0] || apt.appointment_date;
        
        // Overall aggregation
        if (!byDate[dateKey]) {
          byDate[dateKey] = {
            date: dateKey,
            revenue: 0,
            services: 0,
            products: 0,
            transactions: 0,
          };
        }
        const tipAdjRev = (Number(apt.total_price) || 0) - (Number((apt as any).tip_amount) || 0);
        byDate[dateKey].revenue += tipAdjRev;
        byDate[dateKey].services += tipAdjRev;
        byDate[dateKey].transactions += 1;

        // Per-location aggregation
        if (apt.location_id) {
          if (!byLocationDate[apt.location_id]) {
            byLocationDate[apt.location_id] = {};
          }
          if (!byLocationDate[apt.location_id][dateKey]) {
            byLocationDate[apt.location_id][dateKey] = 0;
          }
          byLocationDate[apt.location_id][dateKey] += (Number(apt.total_price) || 0) - (Number((apt as any).tip_amount) || 0);
        }
      });

      // Convert location data to arrays
      const locationTrends: Record<string, { date: string; value: number }[]> = {};
      Object.entries(byLocationDate).forEach(([locId, dates]) => {
        locationTrends[locId] = Object.entries(dates)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
      });

      return {
        overall: Object.values(byDate),
        byLocation: locationTrends,
      };
    },
  });
}

// Get sales by Phorest staff ID (includes unmapped staff) - from appointments
export function useSalesByPhorestStaff(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['sales-by-phorest-staff-from-appointments', dateFrom, dateTo],
    queryFn: async () => {
      // Fetch staff mappings
      const { data: mappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, phorest_staff_name, phorest_branch_name, user_id')
        .eq('is_active', true);

      // Resolve names via centralized utility
      const phorestIds = (mappings || []).map(m => m.phorest_staff_id);
      const { resolveStaffNames } = await import('@/utils/resolveStaffNames');
      const staffNameData = await resolveStaffNames(phorestIds);

      // Fetch photos
      const userIds = (mappings || []).filter(m => m.user_id).map(m => m.user_id!);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('employee_profiles').select('user_id, photo_url').in('user_id', userIds)
        : { data: [] as any[] };
      const photoMap = new Map((profiles || []).map((p: any) => [p.user_id, p.photo_url]));

      // Build mapping lookup
      const mappingLookup: Record<string, {
        userId: string;
        userName: string;
        userPhoto?: string;
        phorestName: string;
        branchName?: string;
      }> = {};
      
      (mappings || []).forEach(m => {
        mappingLookup[m.phorest_staff_id] = {
          userId: m.user_id,
          userName: staffNameData.byPhorestId[m.phorest_staff_id] || 'Unknown',
          userPhoto: m.user_id ? photoMap.get(m.user_id) || undefined : undefined,
          phorestName: m.phorest_staff_name || 'Unknown',
          branchName: m.phorest_branch_name || undefined,
        };
      });

      // Fetch appointments with phorest_staff_id (paginated)
      const data = await fetchAllBatched<{
        phorest_staff_id: string | null;
        total_price: number | null;
        tip_amount: number | null;
        service_name: string | null;
        location_id: string | null;
        phorest_client_id: string | null;
        appointment_date: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, total_price, tip_amount, service_name, location_id, phorest_client_id, appointment_date')
          .not('phorest_staff_id', 'is', null)
          .not('total_price', 'is', null)
          .range(from, to);

        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        return q;
      });

      // Build staff name lookup using centralized resolution
      const staffNameLookup: Record<string, string> = {};
      (mappings || []).forEach(m => {
        if (m.phorest_staff_id) {
          staffNameLookup[m.phorest_staff_id] = staffNameData.byPhorestId[m.phorest_staff_id] || m.phorest_staff_name || 'Unknown';
        }
      });

      // Aggregate by phorest_staff_id
      const byStaff: Record<string, PhorestStaffSalesData> = {};
      const staffVisitSets: Record<string, Set<string>> = {};
      
      data?.forEach(apt => {
        const phorestId = apt.phorest_staff_id!;
        const mapping = mappingLookup[phorestId];
        
        if (!byStaff[phorestId]) {
          byStaff[phorestId] = {
            phorestStaffId: phorestId,
            phorestStaffName: mapping?.phorestName || staffNameLookup[phorestId] || phorestId.substring(0, 8),
            branchName: mapping?.branchName,
            isMapped: !!mapping,
            linkedUserId: mapping?.userId,
            linkedUserName: mapping?.userName,
            linkedUserPhoto: mapping?.userPhoto,
            totalRevenue: 0,
            serviceRevenue: 0,
            productRevenue: 0,
            totalServices: 0,
            totalProducts: 0,
            totalTransactions: 0,
          };
        }
        
        const rev = (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
        byStaff[phorestId].totalRevenue += rev;
        byStaff[phorestId].serviceRevenue += rev;
        byStaff[phorestId].totalServices += 1;
        // Track unique client visits per staff
        if (!staffVisitSets[phorestId]) staffVisitSets[phorestId] = new Set();
        const visitKey = `${(apt as any).phorest_client_id}|${(apt as any).appointment_date}`;
        staffVisitSets[phorestId].add(visitKey);
      });

      // Set totalTransactions from unique visits
      Object.entries(staffVisitSets).forEach(([phorestId, visits]) => {
        if (byStaff[phorestId]) byStaff[phorestId].totalTransactions = visits.size;
      });

      const results = Object.values(byStaff).sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      return {
        allStaff: results,
        mappedCount: results.filter(s => s.isMapped).length,
        unmappedCount: results.filter(s => !s.isMapped).length,
      };
    },
  });
}
