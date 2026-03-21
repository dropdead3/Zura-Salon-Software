import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annually: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  max_locations: number;
  max_users: number;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  organization_id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
    slug: string;
    subscription_tier: string | null;
  };
}

export interface OrganizationSubscription {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_email: string | null;
  trial_ends_at: string | null;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  churnedThisMonth: number;
  averageRevenuePerAccount: number;
  revenueByPlan: { tier: string; revenue: number; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
  });
}

export function useSubscriptionInvoices(limit = 50) {
  return useQuery({
    queryKey: ['subscription-invoices', limit],
    queryFn: async (): Promise<SubscriptionInvoice[]> => {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select(`
          *,
          organization:organizations!subscription_invoices_organization_id_fkey(
            name,
            slug,
            subscription_tier
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as SubscriptionInvoice[];
    },
  });
}

export function useOrganizationSubscriptions() {
  return useQuery({
    queryKey: ['organization-subscriptions'],
    queryFn: async (): Promise<OrganizationSubscription[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          subscription_tier,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          current_period_start,
          current_period_end,
          billing_email,
          trial_ends_at
        `)
        .order('name');

      if (error) throw error;
      return (data || []) as OrganizationSubscription[];
    },
  });
}

export function usePlatformRevenue() {
  const { data: plans } = useSubscriptionPlans();
  const { data: subscriptions } = useOrganizationSubscriptions();
  const { data: invoices } = useSubscriptionInvoices(500);

  return useQuery({
    queryKey: ['platform-revenue-metrics', plans, subscriptions, invoices],
    queryFn: async (): Promise<RevenueMetrics> => {
      // Create plan price lookup
      const planPrices: Record<string, number> = {};
      plans?.forEach(plan => {
        planPrices[plan.tier] = plan.price_monthly;
      });

      // Calculate active subscriptions and MRR
      let mrr = 0;
      let activeCount = 0;
      let trialingCount = 0;
      let pastDueCount = 0;
      const revenueByPlanMap: Record<string, { revenue: number; count: number }> = {};

      subscriptions?.forEach(org => {
        const tier = org.subscription_tier || 'starter';
        const price = planPrices[tier] || 0;
        const status = org.subscription_status || 'inactive';

        if (!revenueByPlanMap[tier]) {
          revenueByPlanMap[tier] = { revenue: 0, count: 0 };
        }

        if (status === 'active') {
          mrr += price;
          activeCount++;
          revenueByPlanMap[tier].revenue += price;
          revenueByPlanMap[tier].count++;
        } else if (status === 'trialing') {
          trialingCount++;
        } else if (status === 'past_due') {
          pastDueCount++;
          mrr += price; // Still count past due in MRR
          revenueByPlanMap[tier].revenue += price;
          revenueByPlanMap[tier].count++;
        }
      });

      // Calculate churn (cancelled in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const churnedThisMonth = subscriptions?.filter(org => 
        org.subscription_status === 'cancelled' && 
        org.current_period_end && 
        new Date(org.current_period_end) >= thirtyDaysAgo
      ).length || 0;

      // Calculate monthly revenue from invoices
      const monthlyRevenueMap: Record<string, number> = {};
      invoices?.filter(inv => inv.status === 'paid').forEach(invoice => {
        const date = new Date(invoice.paid_at || invoice.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + invoice.amount;
      });

      // Get last 6 months
      const monthlyRevenue: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyRevenue.push({
          month: monthName,
          revenue: monthlyRevenueMap[monthKey] || 0,
        });
      }

      // Convert revenueByPlan to array
      const revenueByPlan = Object.entries(revenueByPlanMap).map(([tier, data]) => ({
        tier,
        revenue: data.revenue,
        count: data.count,
      }));

      const totalPaying = activeCount + pastDueCount;

      return {
        mrr,
        arr: mrr * 12,
        activeSubscriptions: activeCount,
        trialingSubscriptions: trialingCount,
        pastDueSubscriptions: pastDueCount,
        churnedThisMonth,
        averageRevenuePerAccount: totalPaying > 0 ? mrr / totalPaying : 0,
        revenueByPlan,
        monthlyRevenue,
      };
    },
    enabled: !!plans && !!subscriptions,
  });
}
