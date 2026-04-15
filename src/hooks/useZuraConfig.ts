import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───

export interface ZuraPersonalityConfig {
  id: string;
  organization_id: string;
  display_name: string;
  tone: 'professional' | 'friendly' | 'motivational' | 'luxury' | 'casual';
  formality_level: number;
  emoji_usage: boolean;
  custom_greeting: string | null;
  custom_sign_off: string | null;
  brand_voice_notes: string | null;
  prohibited_phrases: string[];
  encouraged_phrases: string[];
  response_length_preference: 'concise' | 'moderate' | 'detailed';
  updated_at: string;
  updated_by: string | null;
}

export interface ZuraKnowledgeEntry {
  id: string;
  organization_id: string;
  category: 'salon_policy' | 'product_info' | 'pricing' | 'brand_guidelines' | 'service_info' | 'faq' | 'custom';
  title: string;
  content: string;
  priority: number;
  is_active: boolean;
  applies_to_functions: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ZuraRoleRule {
  id: string;
  organization_id: string;
  target_role: string;
  tone_override: string | null;
  custom_instructions: string | null;
  data_boundaries: string | null;
  suggested_cta_style: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZuraGuardrail {
  id: string;
  organization_id: string;
  rule_type: 'topic_block' | 'data_boundary' | 'behavior_rule' | 'compliance';
  rule_description: string;
  severity: 'soft_warn' | 'hard_block';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Personality Config ───

export function useZuraPersonality(orgId: string | undefined) {
  return useQuery({
    queryKey: ['zura-personality', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('zura_personality_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ZuraPersonalityConfig | null;
    },
    enabled: !!orgId,
  });
}

export function useUpsertZuraPersonality() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: Partial<ZuraPersonalityConfig> }) => {
      const payload = { ...data, organization_id: orgId, updated_by: user?.id };
      const { data: result, error } = await supabase
        .from('zura_personality_config')
        .upsert(payload, { onConflict: 'organization_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-personality', vars.orgId] });
      toast.success('Personality settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Knowledge Entries ───

export function useZuraKnowledge(orgId: string | undefined) {
  return useQuery({
    queryKey: ['zura-knowledge', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('zura_knowledge_entries')
        .select('*')
        .eq('organization_id', orgId)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data || []) as ZuraKnowledgeEntry[];
    },
    enabled: !!orgId,
  });
}

export function useCreateKnowledgeEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: Partial<ZuraKnowledgeEntry> }) => {
      const { data: result, error } = await supabase
        .from('zura_knowledge_entries')
        .insert([{ ...data, organization_id: orgId, created_by: user?.id } as any])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-knowledge', vars.orgId] });
      toast.success('Knowledge entry created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateKnowledgeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId, data }: { id: string; orgId: string; data: Partial<ZuraKnowledgeEntry> }) => {
      const { error } = await supabase.from('zura_knowledge_entries').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-knowledge', vars.orgId] });
      toast.success('Knowledge entry updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKnowledgeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase.from('zura_knowledge_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-knowledge', vars.orgId] });
      toast.success('Knowledge entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Role Rules ───

export function useZuraRoleRules(orgId: string | undefined) {
  return useQuery({
    queryKey: ['zura-role-rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('zura_role_rules')
        .select('*')
        .eq('organization_id', orgId)
        .order('target_role');
      if (error) throw error;
      return (data || []) as ZuraRoleRule[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertRoleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: Partial<ZuraRoleRule> }) => {
      const { error } = await supabase
        .from('zura_role_rules')
        .upsert([{ ...data, organization_id: orgId } as any], { onConflict: 'organization_id,target_role' })
        .select();
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-role-rules', vars.orgId] });
      toast.success('Role rule saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Guardrails ───

export function useZuraGuardrails(orgId: string | undefined) {
  return useQuery({
    queryKey: ['zura-guardrails', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('zura_guardrails')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ZuraGuardrail[];
    },
    enabled: !!orgId,
  });
}

export function useCreateGuardrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: Partial<ZuraGuardrail> }) => {
      const { error } = await supabase
        .from('zura_guardrails')
        .insert([{ ...data, organization_id: orgId } as any])
        .select();
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-guardrails', vars.orgId] });
      toast.success('Guardrail created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateGuardrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId, data }: { id: string; orgId: string; data: Partial<ZuraGuardrail> }) => {
      const { error } = await supabase.from('zura_guardrails').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-guardrails', vars.orgId] });
      toast.success('Guardrail updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGuardrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase.from('zura_guardrails').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['zura-guardrails', vars.orgId] });
      toast.success('Guardrail deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
