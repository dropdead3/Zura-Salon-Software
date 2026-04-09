/**
 * Lightweight entity search hooks for the command surface.
 * Each returns SearchCandidate[] shaped for the ranking pool.
 * All org-scoped, all lazy-loaded via `enabled`.
 */
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { UserCircle, Package, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { SearchCandidate } from '@/lib/searchRanker';

// ─── Clients ────────────────────────────────────────────────

export function useClientSearchCandidates(enabled: boolean): SearchCandidate[] {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data } = useQuery({
    queryKey: ['command-clients', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, is_vip')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('last_visit_date', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  return React.useMemo(() => {
    if (!data) return [];
    return data.map((c) => {
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
      const subtitleParts: string[] = [];
      if (c.phone) subtitleParts.push(c.phone);
      else if (c.email) subtitleParts.push(c.email);
      if (c.is_vip) subtitleParts.push('VIP');

      return {
        id: `client-${c.id}`,
        type: 'client' as const,
        title: fullName,
        subtitle: subtitleParts.join(' · ') || undefined,
        path: `/dashboard/clients?search=${encodeURIComponent(fullName)}`,
        icon: React.createElement(UserCircle, { className: 'w-4 h-4' }),
      };
    });
  }, [data]);
}

// ─── Products / Inventory ───────────────────────────────────

export function useProductSearchCandidates(enabled: boolean): SearchCandidate[] {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data } = useQuery({
    queryKey: ['command-products', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, brand, category, quantity_on_hand')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name')
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  return React.useMemo(() => {
    if (!data) return [];
    return data.map((p) => {
      const subtitleParts: string[] = [];
      if (p.brand) subtitleParts.push(p.brand);
      if (p.sku) subtitleParts.push(`SKU: ${p.sku}`);
      if (p.quantity_on_hand != null) subtitleParts.push(`Qty: ${p.quantity_on_hand}`);

      return {
        id: `product-${p.id}`,
        type: 'inventory' as const,
        title: p.name,
        subtitle: subtitleParts.join(' · ') || p.category || undefined,
        path: `/dashboard/admin/inventory?search=${encodeURIComponent(p.name)}`,
        icon: React.createElement(Package, { className: 'w-4 h-4' }),
        metadata: p.category || undefined,
      };
    });
  }, [data]);
}

// ─── Today's Appointments ───────────────────────────────────

export function useAppointmentSearchCandidates(enabled: boolean): SearchCandidate[] {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const today = new Date().toISOString().split('T')[0];

  const { data } = useQuery({
    queryKey: ['command-appointments', orgId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('id, client_name, service_name, staff_name, start_time, status')
        .eq('organization_id', orgId!)
        .eq('appointment_date', today)
        .neq('status', 'cancelled')
        .order('start_time')
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!orgId,
    staleTime: 60_000,
  });

  return React.useMemo(() => {
    if (!data) return [];
    return data.map((a) => {
      const timePart = a.start_time?.slice(0, 5) || '';
      const subtitleParts = [timePart, a.service_name, a.staff_name].filter(Boolean);

      return {
        id: `appt-${a.id}`,
        type: 'appointment' as const,
        title: a.client_name || 'Walk-in',
        subtitle: subtitleParts.join(' · ') || undefined,
        path: '/dashboard/schedule',
        icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
        metadata: a.status || undefined,
      };
    });
  }, [data]);
}
