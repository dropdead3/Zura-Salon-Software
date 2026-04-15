import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailVariable {
  id: string;
  variable_key: string;
  category: string;
  description: string;
  example: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailVariables() {
  return useQuery({
    queryKey: ['email-variables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_variables')
        .select('*')
        .order('category')
        .order('variable_key');
      
      if (error) throw error;
      return data as unknown as EmailVariable[];
    },
  });
}

export function useCreateEmailVariable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (variable: {
      variable_key: string;
      category: string;
      description: string;
      example?: string;
    }) => {
      const { data, error } = await supabase
        .from('email_variables')
        .insert(variable)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-variables'] });
      toast({
        title: 'Variable created',
        description: 'The email variable has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmailVariable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        variable_key: string;
        category: string;
        description: string;
        example: string | null;
        is_active: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('email_variables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-variables'] });
      toast({
        title: 'Variable updated',
        description: 'The email variable has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmailVariable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_variables')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-variables'] });
      toast({
        title: 'Variable deleted',
        description: 'The email variable has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
