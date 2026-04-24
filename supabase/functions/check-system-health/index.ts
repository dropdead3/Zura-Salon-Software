import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Services to check
const SERVICES = [
  {
    name: 'supabase',
    check: async (supabaseUrl: string, serviceKey: string) => {
      const start = Date.now();
      try {
        const client = createClient(supabaseUrl, serviceKey) as any;
        await client.from('organizations').select('id').limit(1);
        return { healthy: true, responseTime: Date.now() - start };
      } catch (error) {
        return { healthy: false, responseTime: Date.now() - start, error: String(error) };
      }
    },
  },
  {
    name: 'phorest',
    check: async () => {
      const start = Date.now();
      const businessId = Deno.env.get('PHOREST_BUSINESS_ID');
      const apiKey = Deno.env.get('PHOREST_API_KEY');
      const username = Deno.env.get('PHOREST_USERNAME');
      
      if (!businessId || !apiKey || !username) {
        return { healthy: false, responseTime: 0, error: 'Missing Phorest credentials' };
      }

      try {
        const response = await fetch(
          `https://platform.phorest.com/third-party-api-server/api/business/${businessId}/branch`,
          {
            headers: {
              'Authorization': 'Basic ' + btoa(`${username}:${apiKey}`),
              'Accept': 'application/json',
            },
          }
        );
        const responseTime = Date.now() - start;
        return {
          healthy: response.ok,
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (error) {
        return { healthy: false, responseTime: Date.now() - start, error: String(error) };
      }
    },
  },
  {
    name: 'resend',
    check: async () => {
      const start = Date.now();
      const apiKey = Deno.env.get('RESEND_API_KEY');
      
      if (!apiKey) {
        return { healthy: false, responseTime: 0, error: 'Missing Resend API key' };
      }

      try {
        const response = await fetch('https://api.resend.com/domains', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        const responseTime = Date.now() - start;
        return {
          healthy: response.ok || response.status === 401,
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (error) {
        return { healthy: false, responseTime: Date.now() - start, error: String(error) };
      }
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    const results: Array<{
      service_name: string;
      status: 'healthy' | 'degraded' | 'down';
      response_time_ms: number;
      error_message: string | null;
    }> = [];

    for (const service of SERVICES) {
      console.log(`Checking ${service.name}...`);
      const result = await service.check(supabaseUrl, supabaseServiceKey);
      
      let status: 'healthy' | 'degraded' | 'down';
      if (!result.healthy) {
        status = 'down';
      } else if (result.responseTime > 2000) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      results.push({
        service_name: service.name,
        status,
        response_time_ms: result.responseTime,
        error_message: result.error || null,
      });
    }

    // Upsert all health status records
    for (const result of results) {
      await adminClient
        .from('system_health_status')
        .upsert({
          service_name: result.service_name,
          status: result.status,
          response_time_ms: result.response_time_ms,
          last_checked_at: new Date().toISOString(),
          error_message: result.error_message,
        }, {
          onConflict: 'service_name',
        });
    }

    const hasDown = results.some(r => r.status === 'down');
    const hasDegraded = results.some(r => r.status === 'degraded');
    const overallStatus = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

    // If there are critical issues, create a platform notification
    if (hasDown) {
      const downServices = results.filter(r => r.status === 'down');
      await adminClient.from('platform_notifications').insert({
        type: 'critical_error',
        severity: 'critical',
        title: 'Service Outage Detected',
        message: `The following services are down: ${downServices.map(s => s.service_name).join(', ')}`,
        metadata: { services: downServices },
      });
    }

    // --- Auto-create / auto-resolve platform incidents ---
    // Check for existing active auto-created incident
    const { data: activeAutoIncident } = await adminClient
      .from('platform_incidents')
      .select('id, status')
      .eq('is_auto_created', true)
      .in('status', ['active', 'monitoring'])
      .limit(1)
      .maybeSingle();

    if (hasDown && !activeAutoIncident) {
      // Auto-create a new incident
      const downServices = results.filter(r => r.status === 'down');
      const serviceNames = downServices.map(s => s.service_name).join(', ');
      await adminClient.from('platform_incidents').insert({
        status: 'active',
        severity: 'critical',
        title: 'Service Outage Detected',
        message: `We're experiencing issues with ${serviceNames}. Our team is investigating.`,
        is_auto_created: true,
      });
      console.log('Auto-created platform incident for down services:', serviceNames);
    } else if (!hasDown && activeAutoIncident) {
      // All services recovered — auto-resolve the incident
      await adminClient
        .from('platform_incidents')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', activeAutoIncident.id);
      console.log('Auto-resolved platform incident:', activeAutoIncident.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overallStatus,
        services: results,
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
