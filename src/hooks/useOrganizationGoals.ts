import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface OrganizationGoal {
  id: string;
  organization_id: string;
  location_id: string | null;
  metric_key: string;
  display_name: string;
  description: string | null;
  category: string;
  target_value: number;
  warning_threshold: number | null;
  critical_threshold: number | null;
  goal_period: string;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalCategory = 'revenue' | 'profitability' | 'client' | 'efficiency' | 'team';

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  revenue: 'Revenue',
  profitability: 'Profitability',
  client: 'Client Health',
  efficiency: 'Efficiency',
  team: 'Team & Staffing',
};

export const GOAL_CATEGORY_DESCRIPTIONS: Record<GoalCategory, string> = {
  revenue: 'Revenue targets, average ticket, and retail goals',
  profitability: 'Labor cost, margin, and cost efficiency targets',
  client: 'Retention, rebooking, and client growth goals',
  efficiency: 'Utilization, no-show rates, and productivity targets',
  team: 'Staff retention, participation, and development goals',
};

export interface GoalTemplate {
  metric_key: string;
  display_name: string;
  description: string;
  category: GoalCategory;
  unit: '$' | '%' | 'count';
  goal_period: 'monthly' | 'weekly';
  suggested_target: number | null;
  suggested_warning: number | null;
  suggested_critical: number | null;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Revenue
  {
    metric_key: 'monthly_revenue',
    display_name: 'Monthly Revenue',
    description: 'Total revenue target for the month.',
    category: 'revenue',
    unit: '$',
    goal_period: 'monthly',
    suggested_target: 50000,
    suggested_warning: 40000,
    suggested_critical: 30000,
  },
  {
    metric_key: 'avg_ticket',
    display_name: 'Average Ticket',
    description: 'Average revenue per completed appointment.',
    category: 'revenue',
    unit: '$',
    goal_period: 'monthly',
    suggested_target: 160,
    suggested_warning: 130,
    suggested_critical: 100,
  },
  {
    metric_key: 'retail_revenue',
    display_name: 'Retail Revenue',
    description: 'Monthly retail product sales target.',
    category: 'revenue',
    unit: '$',
    goal_period: 'monthly',
    suggested_target: 8000,
    suggested_warning: 5000,
    suggested_critical: 3000,
  },
  // Profitability
  {
    metric_key: 'labor_cost_pct',
    display_name: 'Labor Cost %',
    description: 'Total labor cost as a percentage of revenue. Lower is better.',
    category: 'profitability',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 45,
    suggested_warning: 52,
    suggested_critical: 60,
  },
  {
    metric_key: 'net_margin',
    display_name: 'Net Margin',
    description: 'Net operating margin after labor and product costs.',
    category: 'profitability',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 20,
    suggested_warning: 12,
    suggested_critical: 5,
  },
  {
    metric_key: 'product_cost_pct',
    display_name: 'Product Cost %',
    description: 'Backbar and retail COGS as a percentage of revenue. Lower is better.',
    category: 'profitability',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 10,
    suggested_warning: 15,
    suggested_critical: 20,
  },
  // Client Health
  {
    metric_key: 'client_retention',
    display_name: 'Client Retention',
    description: 'Percentage of clients who return within their expected rebooking window.',
    category: 'client',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 80,
    suggested_warning: 65,
    suggested_critical: 50,
  },
  {
    metric_key: 'rebook_rate',
    display_name: 'Rebook at Checkout',
    description: 'Percentage of clients who rebook before leaving the salon.',
    category: 'client',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 70,
    suggested_warning: 50,
    suggested_critical: 35,
  },
  {
    metric_key: 'new_client_pct',
    display_name: 'New Client %',
    description: 'Percentage of appointments from first-time clients.',
    category: 'client',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 20,
    suggested_warning: 10,
    suggested_critical: 5,
  },
  // Efficiency
  {
    metric_key: 'utilization_rate',
    display_name: 'Utilization Rate',
    description: 'Percentage of available appointment slots that are booked.',
    category: 'efficiency',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 85,
    suggested_warning: 70,
    suggested_critical: 55,
  },
  {
    metric_key: 'noshow_rate',
    display_name: 'No-Show Rate',
    description: 'Percentage of booked appointments that result in no-shows. Lower is better.',
    category: 'efficiency',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 3,
    suggested_warning: 5,
    suggested_critical: 10,
  },
  // Team
  {
    metric_key: 'staff_goal_participation',
    display_name: 'Staff Goal Participation',
    description: 'Percentage of team members with active personal goals set.',
    category: 'team',
    unit: '%',
    goal_period: 'monthly',
    suggested_target: 100,
    suggested_warning: 70,
    suggested_critical: 40,
  },
  {
    metric_key: 'revenue_per_stylist',
    display_name: 'Revenue per Stylist',
    description: 'Average monthly revenue generated per active stylist.',
    category: 'team',
    unit: '$',
    goal_period: 'monthly',
    suggested_target: 8000,
    suggested_warning: 6000,
    suggested_critical: 4000,
  },
];

export function useOrganizationGoals() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['organization-goals', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_goals')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('category, metric_key');

      if (error) throw error;
      return (data || []) as OrganizationGoal[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertOrganizationGoal() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (goal: {
      metric_key: string;
      display_name: string;
      description?: string;
      category: string;
      target_value: number;
      warning_threshold?: number;
      critical_threshold?: number;
      goal_period?: string;
      unit?: string;
      location_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('organization_goals')
        .upsert({
          organization_id: orgId!,
          metric_key: goal.metric_key,
          display_name: goal.display_name,
          description: goal.description || null,
          category: goal.category,
          target_value: goal.target_value,
          warning_threshold: goal.warning_threshold ?? null,
          critical_threshold: goal.critical_threshold ?? null,
          goal_period: goal.goal_period || 'monthly',
          unit: goal.unit || '$',
          location_id: goal.location_id || null,
          is_active: true,
        } as any, {
          onConflict: 'organization_id,location_id,metric_key,goal_period',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-goals', orgId] });
      toast.success('Goal saved');
    },
    onError: (error: Error) => {
      toast.error('Failed to save goal', { description: error.message });
    },
  });
}

export function useDeleteOrganizationGoal() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-goals', orgId] });
      toast.success('Goal removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove goal', { description: error.message });
    },
  });
}
