import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffServiceQualification {
  phorest_staff_id: string;
  service_external_id: string;
  branch_id: string;
  is_qualified: boolean;
}

/**
 * Fetch all qualified staff IDs for a given set of services
 * Returns staff who are qualified for ALL the selected services
 *
 * NOTE: `serviceIds` here are Phorest external IDs (service.phorest_service_id),
 * which is what the unified view stores in `service_external_id`. For the manual
 * source (`staff_service_qualifications`), we resolve these to internal UUIDs first.
 *
 * `branchId` is the phorest branch id (locations.phorest_branch_id).
 */
export function useQualifiedStaffForServices(serviceIds: string[], branchId?: string) {
  return useQuery({
    queryKey: ['staff-service-qualifications', serviceIds, branchId],
    queryFn: async () => {
      if (serviceIds.length === 0) {
        return { qualifiedStaffIds: [], qualifiedUserIds: [], disqualifiedUserIds: [], hasQualificationData: false };
      }

      // 1. Unified qualifications view (Phorest + manual), keyed by service_external_id
      let viewQuery = supabase
        .from('v_all_staff_qualifications' as any)
        .select('phorest_staff_id, staff_user_id, service_external_id, service_id, branch_id')
        .in('service_external_id', serviceIds)
        .eq('is_qualified', true);

      if (branchId) {
        viewQuery = viewQuery.eq('branch_id', branchId);
      }

      const { data: viewData, error: viewError } = await viewQuery;
      if (viewError) {
        console.error('[useQualifiedStaffForServices] view error:', viewError);
      }

      // 2. Manual qualifications use internal service_id (UUID).
      //    Resolve external IDs -> internal UUIDs first.
      const { data: serviceRows, error: serviceLookupError } = await (supabase
        .from('services') as any)
        .select('id, phorest_service_id')
        .in('phorest_service_id', serviceIds);

      if (serviceLookupError) {
        console.error('[useQualifiedStaffForServices] service lookup error:', serviceLookupError);
      }

      const internalServiceIds = (serviceRows || [])
        .map((s: any) => s.id)
        .filter(Boolean) as string[];

      let manualData: any[] = [];
      if (internalServiceIds.length > 0) {
        const { data, error: manualError } = await supabase
          .from('staff_service_qualifications')
          .select('user_id, service_id, is_active')
          .in('service_id', internalServiceIds);

        if (manualError) {
          console.error('[useQualifiedStaffForServices] manual error:', manualError);
        } else {
          manualData = data || [];
        }
      }

      const hasViewData = viewData && (viewData as any[]).length > 0;
      const hasManualData = manualData.length > 0;

      if (!hasViewData && !hasManualData) {
        // No qualification data — allow all staff
        return { qualifiedStaffIds: [], qualifiedUserIds: [], disqualifiedUserIds: [], hasQualificationData: false };
      }

      // Build qualified phorest_staff_ids: must qualify for ALL selected services
      const phorestStaffServiceCount: Record<string, Set<string>> = {};
      const userServiceCount: Record<string, Set<string>> = {};
      if (hasViewData) {
        for (const qual of (viewData as any[])) {
          if (qual.phorest_staff_id) {
            (phorestStaffServiceCount[qual.phorest_staff_id] ||= new Set()).add(qual.service_external_id);
          }
          if (qual.staff_user_id) {
            (userServiceCount[qual.staff_user_id] ||= new Set()).add(qual.service_external_id);
          }
        }
      }

      const qualifiedStaffIds = Object.entries(phorestStaffServiceCount)
        .filter(([_, set]) => set.size >= serviceIds.length)
        .map(([staffId]) => staffId);

      const viewQualifiedUserIds = Object.entries(userServiceCount)
        .filter(([_, set]) => set.size >= serviceIds.length)
        .map(([userId]) => userId);

      // Manual: user must be is_active=true for ALL selected internal service IDs
      const manualUserServiceActive: Record<string, { activeCount: number; hasInactive: boolean }> = {};
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

      const manualQualifiedUserIds = Object.entries(manualUserServiceActive)
        .filter(([_, info]) => !info.hasInactive && info.activeCount >= internalServiceIds.length)
        .map(([userId]) => userId);

      const disqualifiedUserIds = Object.entries(manualUserServiceActive)
        .filter(([_, info]) => info.hasInactive)
        .map(([userId]) => userId);

      const qualifiedUserIds = Array.from(new Set([...viewQualifiedUserIds, ...manualQualifiedUserIds]));

      return {
        qualifiedStaffIds,
        qualifiedUserIds,
        disqualifiedUserIds,
        hasQualificationData: true,
        partiallyQualified: Object.entries(phorestStaffServiceCount)
          .filter(([_, set]) => set.size < serviceIds.length)
          .map(([staffId, set]) => ({ staffId, qualifiedCount: set.size, totalRequired: serviceIds.length })),
      };
    },
    enabled: serviceIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all services a specific staff member is qualified for.
 * Returns Phorest external service IDs (service_external_id).
 */
export function useStaffQualifiedServices(phorestStaffId: string | undefined, branchId?: string, userId?: string) {
  return useQuery({
    queryKey: ['staff-qualified-services', phorestStaffId, branchId, userId],
    queryFn: async () => {
      const qualifiedServiceIds: string[] = [];

      // 1. Unified qualifications view
      if (phorestStaffId || userId) {
        let query = supabase
          .from('v_all_staff_qualifications' as any)
          .select('service_external_id, service_id')
          .eq('is_qualified', true);

        if (phorestStaffId) {
          query = query.eq('phorest_staff_id', phorestStaffId);
        } else if (userId) {
          query = query.eq('staff_user_id', userId);
        }

        if (branchId) {
          query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[useStaffQualifiedServices] view error:', error);
        } else if (data) {
          for (const d of (data as any[])) {
            if (d.service_external_id && !qualifiedServiceIds.includes(d.service_external_id)) {
              qualifiedServiceIds.push(d.service_external_id);
            }
          }
        }
      }

      // 2. Manual source (staff_service_qualifications) keyed by internal service_id (UUID).
      //    Resolve back to external IDs so the consumer's filter compares apples-to-apples.
      if (userId) {
        const { data: manualData, error: manualError } = await supabase
          .from('staff_service_qualifications')
          .select('service_id, is_active')
          .eq('user_id', userId);

        if (manualError) {
          console.error('[useStaffQualifiedServices] manual error:', manualError);
        } else if (manualData && manualData.length > 0) {
          const internalIds = manualData.map((d: any) => d.service_id).filter(Boolean);
          const { data: serviceRows } = await supabase
            .from('services')
            .select('id, phorest_service_id')
            .in('id', internalIds);

          const idMap: Record<string, string> = {};
          (serviceRows || []).forEach((s: any) => {
            if (s.phorest_service_id) idMap[s.id] = s.phorest_service_id;
          });

          const manualActiveExt = new Set(
            manualData.filter((d: any) => d.is_active !== false)
              .map((d: any) => idMap[d.service_id])
              .filter(Boolean)
          );
          const manualInactiveExt = new Set(
            manualData.filter((d: any) => d.is_active === false)
              .map((d: any) => idMap[d.service_id])
              .filter(Boolean)
          );

          manualActiveExt.forEach(id => {
            if (!qualifiedServiceIds.includes(id as string)) qualifiedServiceIds.push(id as string);
          });

          return qualifiedServiceIds.filter(id => !manualInactiveExt.has(id));
        }
      }

      return qualifiedServiceIds;
    },
    enabled: !!phorestStaffId || !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
