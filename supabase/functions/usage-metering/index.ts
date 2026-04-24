import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsageMetrics {
  organization_id: string;
  period_start: string;
  period_end: string;
  total_users: number;
  active_users: number;
  total_locations: number;
  total_appointments: number;
  total_clients: number;
  storage_used_mb: number;
  api_calls: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get all active organizations
    const { data: organizations, error: orgsError } = await adminClient
      .from('organizations')
      .select('id, name, slug')
      .in('subscription_status', ['active', 'trialing', 'past_due']);

    if (orgsError) throw orgsError;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageRecords: UsageMetrics[] = [];

    for (const org of organizations || []) {
      // Count users
      const { count: totalUsers } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Count active users (logged in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

      // Count locations
      const { count: totalLocations } = await adminClient
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Count appointments this month
      const { count: totalAppointments } = await adminClient
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Count clients
      const { count: totalClients } = await adminClient
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Count edge function calls for this org
      const { count: apiCalls } = await adminClient
        .from('edge_function_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('started_at', periodStart.toISOString());

      const usageRecord: UsageMetrics = {
        organization_id: org.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_locations: totalLocations || 0,
        total_appointments: totalAppointments || 0,
        total_clients: totalClients || 0,
        storage_used_mb: 0, // Would need storage API integration
        api_calls: apiCalls || 0,
      };

      usageRecords.push(usageRecord);

      // Upsert usage record
      await adminClient.from('usage_metrics').upsert(usageRecord, {
        onConflict: 'organization_id,period_start',
      });

      // Check for usage alerts (e.g., approaching limits)
      const planLimits = {
        maxUsers: 50,
        maxLocations: 10,
        maxClients: 10000,
      };

      if ((totalUsers || 0) >= planLimits.maxUsers * 0.9) {
        await adminClient.from('platform_notifications').insert({
          type: 'usage_alert',
          severity: 'warning',
          title: `User Limit Alert: ${org.name}`,
          message: `${org.name} is at ${totalUsers}/${planLimits.maxUsers} users (${Math.round(((totalUsers || 0) / planLimits.maxUsers) * 100)}%)`,
          metadata: { organization_id: org.id, metric: 'users', current: totalUsers, limit: planLimits.maxUsers },
        });
      }
    }

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'usage-metering',
      status: 'success',
      metadata: { 
        organizations_processed: organizations?.length || 0,
        period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: organizations?.length || 0,
        period: { start: periodStart, end: periodEnd },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Usage metering error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
