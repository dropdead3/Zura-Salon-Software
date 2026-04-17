import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface StripePaymentsHealth {
  subscriptions: {
    active: number;
    pastDue: number;
    trialing: number;
    cancelled: number;
    total: number;
  };
  locations: {
    active: number;
    pending: number;
    issues: number;
    suspended: number;
    notConnected: number;
    total: number;
  };
  atRiskOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    billing_email: string | null;
    lastInvoice?: {
      amount: number;
      status: string;
      created_at: string;
    };
  }>;
  locationsWithIssues: Array<{
    id: string;
    name: string;
    organization_id: string;
    organization_name: string;
    organization_slug: string;
    stripe_status: string;
    stripe_account_id: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    organization_name: string;
    location_name?: string;
    amount?: number;
    message: string;
    created_at: string;
  }>;
  revenueAtRisk: number;
}

async function fetchStripePaymentsHealth(): Promise<StripePaymentsHealth> {
  // Fetch organization subscription counts
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, slug, subscription_status, billing_email');

  if (orgsError) throw orgsError;

  const subscriptions = {
    active: 0,
    pastDue: 0,
    trialing: 0,
    cancelled: 0,
    total: orgs?.length || 0,
  };

  orgs?.forEach(org => {
    const status = org.subscription_status || 'active';
    if (status === 'active') subscriptions.active++;
    else if (status === 'past_due') subscriptions.pastDue++;
    else if (status === 'trialing') subscriptions.trialing++;
    else if (status === 'cancelled') subscriptions.cancelled++;
  });

  // Fetch location payment status counts
  const { data: locs, error: locsError } = await supabase
    .from('locations')
    .select('id, name, organization_id, stripe_status, stripe_account_id');

  if (locsError) throw locsError;

  const locations = {
    active: 0,
    pending: 0,
    issues: 0,
    suspended: 0,
    notConnected: 0,
    total: locs?.length || 0,
  };

  locs?.forEach(loc => {
    const status = loc.stripe_status || 'not_connected';
    if (status === 'active') locations.active++;
    else if (status === 'pending') locations.pending++;
    else if (status === 'issues') locations.issues++;
    else if (status === 'suspended') locations.suspended++;
    else locations.notConnected++;
  });

  // Fetch at-risk organizations (past_due or cancelled)
  const atRiskOrgs = orgs?.filter(o => 
    o.subscription_status === 'past_due' || o.subscription_status === 'cancelled'
  ) || [];

  // Get last invoice for at-risk orgs
  const atRiskOrgIds = atRiskOrgs.map(o => o.id);
  let invoicesMap: Record<string, { amount: number; status: string; created_at: string }> = {};
  
  if (atRiskOrgIds.length > 0) {
    const { data: invoices } = await supabase
      .from('subscription_invoices')
      .select('organization_id, amount, status, created_at')
      .in('organization_id', atRiskOrgIds)
      .order('created_at', { ascending: false });

    invoices?.forEach(inv => {
      if (!invoicesMap[inv.organization_id]) {
        invoicesMap[inv.organization_id] = {
          amount: inv.amount || 0,
          status: inv.status,
          created_at: inv.created_at,
        };
      }
    });
  }

  const atRiskOrganizations = atRiskOrgs.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    subscription_status: org.subscription_status || 'active',
    billing_email: org.billing_email,
    lastInvoice: invoicesMap[org.id],
  }));

  // Calculate revenue at risk
  const revenueAtRisk = Object.values(invoicesMap).reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Fetch locations with issues
  const locationsWithIssues = locs?.filter(l => 
    l.stripe_status === 'issues' || l.stripe_status === 'suspended' || l.stripe_status === 'pending'
  ) || [];

  // Map org names
  const orgMap = new Map(orgs?.map(o => [o.id, { name: o.name, slug: o.slug }]) || []);

  const locationsWithIssuesMapped = locationsWithIssues.map(loc => ({
    id: loc.id,
    name: loc.name,
    organization_id: loc.organization_id,
    organization_name: orgMap.get(loc.organization_id)?.name || 'Unknown',
    organization_slug: orgMap.get(loc.organization_id)?.slug || '',
    stripe_status: loc.stripe_status || 'not_connected',
    stripe_account_id: loc.stripe_account_id,
  }));

  // Fetch recent payment events from platform_notifications
  const { data: events } = await supabase
    .from('platform_notifications')
    .select('id, type, title, message, metadata, created_at')
    .in('type', ['payment_failed', 'payment_recovered'])
    .order('created_at', { ascending: false })
    .limit(20);

  const recentEvents = (events || []).map(e => {
    const metadata = e.metadata as Record<string, unknown> | null;
    return {
      id: e.id,
      type: e.type,
      organization_name: (metadata?.organization_name as string) || 'Unknown',
      location_name: metadata?.location_name as string | undefined,
      amount: metadata?.amount as number | undefined,
      message: e.message,
      created_at: e.created_at,
    };
  });

  return {
    subscriptions,
    locations,
    atRiskOrganizations,
    locationsWithIssues: locationsWithIssuesMapped,
    recentEvents,
    revenueAtRisk,
  };
}

export function useStripePaymentsHealth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stripe-payments-health'],
    queryFn: fetchStripePaymentsHealth,
    staleTime: 60000, // Has realtime subscription, no polling needed
  });

  // Set up real-time subscription for payment events
  useEffect(() => {
    const channel = supabase
      .channel('stripe-health-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_notifications',
        },
        (payload) => {
          const newNotif = payload.new as { type?: string };
          if (newNotif.type === 'payment_failed' || newNotif.type === 'payment_recovered') {
            queryClient.invalidateQueries({ queryKey: ['stripe-payments-health'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stripe-payments-health'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stripe-payments-health'] });
          // Wave 22.2 — webhook-driven Connect status flips refresh any
          // open checkout sheets via the bulk-fetch hook key.
          queryClient.invalidateQueries({ queryKey: ['location-stripe-status'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
