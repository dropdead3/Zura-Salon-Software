/**
 * resolveStaffNames — Centralized staff name resolution utility.
 * 
 * Resolves phorest_staff_ids to display names using:
 * 1. employee_profiles (Zura-owned, primary) via phorest_staff_mapping join
 * 2. phorest_staff_mapping.phorest_staff_name (fallback for unmapped staff)
 * 
 * This ensures analytics work both during Phorest transition and after detach,
 * since employee_profiles is Zura-owned and will persist.
 */

import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

export interface StaffNameMap {
  /** phorest_staff_id → display name */
  byPhorestId: Record<string, string>;
  /** user_id → display name */
  byUserId: Record<string, string>;
  /** phorest_staff_id → user_id (if mapped) */
  phorestToUserId: Record<string, string>;
}

/**
 * Resolve a list of phorest_staff_ids to display names.
 * Returns a Record<phorestStaffId, displayName>.
 */
export async function resolveStaffNamesByPhorestIds(
  phorestStaffIds: string[]
): Promise<Record<string, string>> {
  if (phorestStaffIds.length === 0) return {};

  const nameMap: Record<string, string> = {};

  // Query v_all_staff view (flat columns, no FK join)
  const { data: mappings } = await supabase
    .from('v_all_staff' as any)
    .select('phorest_staff_id, phorest_staff_name, display_name, full_name')
    .in('phorest_staff_id', phorestStaffIds);

  ((mappings as any[]) || []).forEach((m: any) => {
    const name = m.display_name
      ? formatDisplayName(m.full_name || '', m.display_name)
      : (m.phorest_staff_name ? formatDisplayName(m.phorest_staff_name) : 'Unknown');
    nameMap[m.phorest_staff_id] = name;
  });

  // Phase B fallback: IDs not found in phorest_staff_mapping may be user_ids
  // (Zura-only orgs have no phorest mappings — resolve from employee_profiles directly)
  const unresolvedIds = phorestStaffIds.filter(id => !nameMap[id]);
  if (unresolvedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('employee_profiles')
      .select('user_id, display_name, full_name')
      .in('user_id', unresolvedIds);

    (profiles || []).forEach((p: any) => {
      nameMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
    });
  }

  return nameMap;
}

/**
 * Resolve phorest_staff_ids to display names AND photo URLs.
 * Used when the UI needs headshot photos alongside names.
 */
export async function resolveStaffWithPhotosByPhorestIds(
  phorestStaffIds: string[]
): Promise<Record<string, { name: string; photoUrl: string | null }>> {
  if (phorestStaffIds.length === 0) return {};

  const result: Record<string, { name: string; photoUrl: string | null }> = {};

  const { data: mappings } = await supabase
    .from('v_all_staff' as any)
    .select('phorest_staff_id, phorest_staff_name, display_name, full_name, photo_url')
    .in('phorest_staff_id', phorestStaffIds);

  ((mappings as any[]) || []).forEach((m: any) => {
    const name = m.display_name
      ? formatDisplayName(m.full_name || '', m.display_name)
      : (m.phorest_staff_name ? formatDisplayName(m.phorest_staff_name) : 'Unknown');
    const photoUrl = m.photo_url || null;
    result[m.phorest_staff_id] = { name, photoUrl };
  });

  return result;
}

/**
 * Resolve a list of user_ids to display names using employee_profiles directly.
 * No dependency on phorest_staff_mapping — works fully standalone.
 */
export async function resolveStaffNamesByUserIds(
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const nameMap: Record<string, string> = {};

  const { data: profiles } = await supabase
    .from('employee_profiles')
    .select('user_id, display_name, full_name')
    .in('user_id', userIds);

  (profiles || []).forEach((p: any) => {
    nameMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
  });

  return nameMap;
}

/**
 * Full staff resolution: returns maps by both phorest_staff_id and user_id,
 * plus a cross-reference map.
 */
export async function resolveStaffNames(
  phorestStaffIds: string[]
): Promise<StaffNameMap> {
  const result: StaffNameMap = {
    byPhorestId: {},
    byUserId: {},
    phorestToUserId: {},
  };

  if (phorestStaffIds.length === 0) return result;

  const { data: mappings } = await supabase
    .from('v_all_staff' as any)
    .select('phorest_staff_id, phorest_staff_name, user_id, display_name, full_name')
    .in('phorest_staff_id', phorestStaffIds);

  ((mappings as any[]) || []).forEach((m: any) => {
    const name = m.display_name
      ? formatDisplayName(m.full_name || '', m.display_name)
      : (m.phorest_staff_name ? formatDisplayName(m.phorest_staff_name) : 'Unknown');

    result.byPhorestId[m.phorest_staff_id] = name;
    if (m.user_id) {
      result.byUserId[m.user_id] = name;
      result.phorestToUserId[m.phorest_staff_id] = m.user_id;
    }
  });

  return result;
}
