import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';

/**
 * Resolve comma-separated service names back to phorest_services IDs.
 * Used to pre-populate the booking popover when rebooking at checkout.
 */
export async function resolveServiceIds(
  serviceNameString: string | null | undefined,
  supabaseClient: { from: (table: string) => any }
): Promise<string[]> {
  if (!serviceNameString) return [];

  const names = serviceNameString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length === 0) return [];

  const { data, error } = await supabaseClient
    .from('v_all_services' as any)
    .select('id, name')
    .in('name', names);

  if (error || !data) return [];

  // Build a name->id map, keeping the first match per name
  const nameToId = new Map<string, string>();
  for (const row of data as { id: string; name: string }[]) {
    if (!nameToId.has(row.name)) {
      nameToId.set(row.name, row.id);
    }
  }

  // Return IDs in the same order as the original names
  return names
    .map((n) => nameToId.get(n))
    .filter((id): id is string => !!id);
}
