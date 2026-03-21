import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralLink {
  id: string;
  organization_id: string;
  referrer_client_id: string | null;
  referrer_user_id: string | null;
  referral_code: string;
  campaign_name: string | null;
  reward_type: 'voucher' | 'credit' | 'points' | 'discount' | 'free_service';
  referrer_reward_value: number | null;
  referrer_reward_description: string | null;
  referee_reward_value: number | null;
  referee_reward_description: string | null;
  uses: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string | null;
  terms_conditions: string | null;
  created_at: string;
  created_by: string | null;
  // Computed
  conversions_count?: number;
  total_revenue?: number;
}

export interface ReferralConversion {
  id: string;
  referral_link_id: string;
  referred_client_id: string;
  first_appointment_id: string | null;
  first_appointment_date: string | null;
  first_appointment_value: number | null;
  referrer_rewarded: boolean;
  referrer_reward_issued_at: string | null;
  referee_rewarded: boolean;
  referee_reward_issued_at: string | null;
  converted_at: string;
  // Joined
  referred_client_name?: string;
}

export interface CreateReferralLinkData {
  organization_id: string;
  referrer_client_id?: string;
  referrer_user_id?: string;
  campaign_name?: string;
  reward_type: 'voucher' | 'credit' | 'points' | 'discount' | 'free_service';
  referrer_reward_value?: number;
  referrer_reward_description?: string;
  referee_reward_value?: number;
  referee_reward_description?: string;
  max_uses?: number;
  expires_at?: string;
  terms_conditions?: string;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useReferralLinks(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['referral-links', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_links' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch conversion counts
      const linkIds = (data || []).map((l: any) => l.id);
      const { data: conversions } = await supabase
        .from('referral_conversions' as any)
        .select('referral_link_id, first_appointment_value')
        .in('referral_link_id', linkIds);

      const conversionStats = new Map<string, { count: number; revenue: number }>();
      (conversions || []).forEach((c: any) => {
        const stats = conversionStats.get(c.referral_link_id) || { count: 0, revenue: 0 };
        stats.count++;
        stats.revenue += c.first_appointment_value || 0;
        conversionStats.set(c.referral_link_id, stats);
      });

      return (data || []).map((link: any) => {
        const stats = conversionStats.get(link.id) || { count: 0, revenue: 0 };
        return {
          ...link,
          conversions_count: stats.count,
          total_revenue: stats.revenue,
        };
      }) as ReferralLink[];
    },
    enabled: !!organizationId,
  });
}

export function useReferralConversions(referralLinkId: string | undefined) {
  return useQuery({
    queryKey: ['referral-conversions', referralLinkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_conversions' as any)
        .select('*')
        .eq('referral_link_id', referralLinkId!)
        .order('converted_at', { ascending: false });

      if (error) throw error;

      // Fetch client names
      const clientIds = (data || []).map((c: any) => c.referred_client_id);
      const { data: clients } = await supabase
        .from('phorest_clients' as any)
        .select('id, client_first_name, client_last_name')
        .in('id', clientIds);

      const clientMap = new Map(((clients || []) as any[]).map((c: any) => [c.id, `${c.client_first_name || ''} ${c.client_last_name || ''}`.trim()]));

      return (data || []).map((conversion: any) => ({
        ...conversion,
        referred_client_name: clientMap.get(conversion.referred_client_id),
      })) as ReferralConversion[];
    },
    enabled: !!referralLinkId,
  });
}

export function useCreateReferralLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReferralLinkData) => {
      const referral_code = generateReferralCode();

      const { data: link, error } = await supabase
        .from('referral_links' as any)
        .insert({
          ...data,
          referral_code,
          is_active: true,
          uses: 0,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return link;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-links'] });
      toast.success('Referral link created');
    },
    onError: (error) => {
      toast.error('Failed to create referral link', { description: error.message });
    },
  });
}

export function useUpdateReferralLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReferralLink> & { id: string }) => {
      const { data, error } = await supabase
        .from('referral_links' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-links'] });
      toast.success('Referral link updated');
    },
    onError: (error) => {
      toast.error('Failed to update referral link', { description: error.message });
    },
  });
}

export function useDeactivateReferralLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('referral_links' as any)
        .update({ is_active: false } as any)
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-links'] });
      toast.success('Referral link deactivated');
    },
    onError: (error) => {
      toast.error('Failed to deactivate link', { description: error.message });
    },
  });
}

export function useRecordReferralConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referralCode,
      referredClientId,
      appointmentId,
      appointmentDate,
      appointmentValue,
    }: {
      referralCode: string;
      referredClientId: string;
      appointmentId?: string;
      appointmentDate?: string;
      appointmentValue?: number;
    }) => {
      // Find the referral link
      const { data: link, error: linkError } = await supabase
        .from('referral_links' as any)
        .select('id, uses, max_uses')
        .eq('referral_code', referralCode)
        .eq('is_active', true)
        .single();

      if (linkError || !link) throw new Error('Invalid or inactive referral code');

      // Check max uses
      if ((link as any).max_uses && (link as any).uses >= (link as any).max_uses) {
        throw new Error('Referral link has reached maximum uses');
      }

      // Create conversion record
      const { data: conversion, error } = await supabase
        .from('referral_conversions' as any)
        .insert({
          referral_link_id: (link as any).id,
          referred_client_id: referredClientId,
          first_appointment_id: appointmentId,
          first_appointment_date: appointmentDate,
          first_appointment_value: appointmentValue,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Increment uses count
      await supabase
        .from('referral_links' as any)
        .update({ uses: (link as any).uses + 1 } as any)
        .eq('id', (link as any).id);

      return conversion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-links'] });
      queryClient.invalidateQueries({ queryKey: ['referral-conversions'] });
      toast.success('Referral conversion recorded');
    },
    onError: (error) => {
      toast.error('Failed to record conversion', { description: error.message });
    },
  });
}

export function useReferralLeaderboard(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['referral-leaderboard', organizationId],
    queryFn: async () => {
      const { data: links } = await supabase
        .from('referral_links' as any)
        .select('id, referrer_client_id, referrer_user_id')
        .eq('organization_id', organizationId!);

      const linkIds = (links || []).map((l: any) => l.id);
      const { data: conversions } = await supabase
        .from('referral_conversions' as any)
        .select('referral_link_id, first_appointment_value')
        .in('referral_link_id', linkIds);

      // Aggregate by referrer
      const referrerStats = new Map<string, { count: number; revenue: number; type: 'client' | 'user' }>();
      
      ((conversions || []) as any[]).forEach((c: any) => {
        const link = ((links || []) as any[]).find((l: any) => l.id === c.referral_link_id);
        if (!link) return;

        const referrerId = link.referrer_client_id || link.referrer_user_id;
        const type = link.referrer_client_id ? 'client' : 'user';
        
        const stats = referrerStats.get(referrerId) || { count: 0, revenue: 0, type };
        stats.count++;
        stats.revenue += c.first_appointment_value || 0;
        referrerStats.set(referrerId, stats);
      });

      // Sort by count descending
      return Array.from(referrerStats.entries())
        .map(([id, stats]) => ({ referrer_id: id, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    enabled: !!organizationId,
  });
}
