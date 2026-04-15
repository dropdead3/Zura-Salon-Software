import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffServiceQualification {
  phorest_staff_id: string;
  phorest_service_id: string;
  phorest_branch_id: string;
  is_qualified: boolean;
}

/**
 * Fetch all qualified staff IDs for a given set of services
 * Returns staff who are qualified for ALL the selected services
 */
export function useQualifiedStaffForServices(serviceIds: string[], branchId?: string) {
  return useQuery({
    queryKey: ['staff-service-qualifications', serviceIds, branchId],
    queryFn: async () => {
      if (serviceIds.length === 0) {
        return { qualifiedStaffIds: [], hasQualificationData: false };
      }

      // 1. Check v_all_staff_qualifications (unified view: Phorest + manual)
      let phorestQuery = supabase
        .from('v_all_staff_qualifications' as any)
        .select('phorest_staff_id, phorest_service_id')
        .in('phorest_service_id', serviceIds)
        .eq('is_qualified', true);

      if (branchId) {
        phorestQuery = phorestQuery.eq('phorest_branch_id', branchId);
      }

      const { data: phorestData, error: phorestError } = await phorestQuery;
      
      if (phorestError) {
        console.error('Error fetching staff qualifications:', phorestError);
      }

      // 2. Check staff_service_qualifications (manual/admin source)
      const { data: manualData, error: manualError } = await supabase
        .from('staff_service_qualifications')
        .select('user_id, service_id, is_active')
        .in('service_id', serviceIds);

      if (manualError) {
        console.error('Error fetching manual staff qualifications:', manualError);
      }

      const hasPhorestData = phorestData && (phorestData as any[]).length > 0;
      const hasManualData = manualData && manualData.length > 0;

      if (!hasPhorestData && !hasManualData) {
        // No qualification data from either source — allow all staff
        return { qualifiedStaffIds: [], hasQualificationData: false };
      }

      // Build qualified staff from qualification data
      const phorestStaffServiceCount: Record<string, number> = {};
      if (hasPhorestData) {
        for (const qual of (phorestData as any[])) {
          phorestStaffServiceCount[qual.phorest_staff_id] = (phorestStaffServiceCount[qual.phorest_staff_id] || 0) + 1;
        }
      }

      const phorestQualifiedIds = Object.entries(phorestStaffServiceCount)
        .filter(([_, count]) => count >= serviceIds.length)
        .map(([staffId]) => staffId);

      // Build qualified user_ids from manual data
      // Manual qualifications: user must have is_active=true for ALL selected services
      // If a user has is_active=false for any, they're excluded
      const manualUserServiceActive: Record<string, { activeCount: number; hasInactive: boolean }> = {};
      if (hasManualData) {
        for (const qual of manualData) {
          if (!manualUserServiceActive[qual.user_id]) {
            manualUserServiceActive[qual.user_id] = { activeCount: 0, hasInactive: false };
          }
          if (qual.is_active === false) {
            manualUserServiceActive[qual.user_id].hasInactive = true;
          } else {
            manualUserServiceActive[qual.user_id].activeCount += 1;
          }
        }
      }

      const manualQualifiedUserIds = Object.entries(manualUserServiceActive)
        .filter(([_, info]) => !info.hasInactive && info.activeCount >= serviceIds.length)
        .map(([userId]) => userId);

      // Manual disqualified user IDs (explicitly set is_active=false)
      const manualDisqualifiedUserIds = new Set(
        Object.entries(manualUserServiceActive)
          .filter(([_, info]) => info.hasInactive)
          .map(([userId]) => userId)
      );

      // Combine: phorest IDs (string phorest_staff_id) + manual user_ids
      // Note: These are different ID types. The booking wizard resolves phorest IDs via phorest_staff_mapping.
      return { 
        qualifiedStaffIds: phorestQualifiedIds, 
        qualifiedUserIds: manualQualifiedUserIds,
        disqualifiedUserIds: Array.from(manualDisqualifiedUserIds),
        hasQualificationData: true,
        partiallyQualified: Object.entries(phorestStaffServiceCount)
          .filter(([_, count]) => count < serviceIds.length)
          .map(([staffId, count]) => ({ staffId, qualifiedCount: count, totalRequired: serviceIds.length }))
      };
    },
    enabled: serviceIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all services a specific staff member is qualified for
 */
export function useStaffQualifiedServices(phorestStaffId: string | undefined, branchId?: string, userId?: string) {
  return useQuery({
    queryKey: ['staff-qualified-services', phorestStaffId, branchId, userId],
    queryFn: async () => {
      const qualifiedServiceIds: string[] = [];

      // 1. Unified qualifications view
      if (phorestStaffId) {
        let query = supabase
          .from('v_all_staff_qualifications' as any)
          .select('phorest_service_id')
          .eq('phorest_staff_id', phorestStaffId)
          .eq('is_qualified', true);

        if (branchId) {
          query = query.eq('phorest_branch_id', branchId);
        }

        const { data, error } = await query;
        if (!error && data) {
          qualifiedServiceIds.push(...(data as any[]).map((d: any) => d.phorest_service_id));
        }
      }

      // 2. Manual source (staff_service_qualifications by user_id)
      if (userId) {
        const { data: manualData, error: manualError } = await supabase
          .from('staff_service_qualifications')
          .select('service_id, is_active')
          .eq('user_id', userId);

        if (!manualError && manualData) {
          // Manual entries override: add active ones, remove inactive ones
          const manualActive = new Set(manualData.filter(d => d.is_active !== false).map(d => d.service_id));
          const manualInactive = new Set(manualData.filter(d => d.is_active === false).map(d => d.service_id));

          // Add manually qualified services not already present
          manualActive.forEach(id => {
            if (!qualifiedServiceIds.includes(id)) qualifiedServiceIds.push(id);
          });

          // Remove manually disqualified services
          return qualifiedServiceIds.filter(id => !manualInactive.has(id));
        }
      }

      return qualifiedServiceIds;
    },
    enabled: !!phorestStaffId || !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
