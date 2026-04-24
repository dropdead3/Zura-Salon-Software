import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map of allowed functions that can be triggered
const ALLOWED_FUNCTIONS = [
  'sync-phorest-data',
  'sync-phorest-services',
  'sync-callrail-calls',
  'send-daily-reminders',
  'send-birthday-reminders',
  'check-lead-sla',
  'send-inactivity-alerts',
  'record-staffing-snapshot',
  'update-sales-leaderboard',
  'check-expired-assignments',
  'check-reorder-levels',
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    }) as any;

    // Verify user is a platform user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claims.claims.sub as string;

    // Check if user has platform role
    const { data: platformRole } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!platformRole) {
      return new Response(
        JSON.stringify({ error: 'Not a platform user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { functionName } = await req.json();

    if (!functionName || !ALLOWED_FUNCTIONS.includes(functionName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid function name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for logging
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Log the start of the job
    const { data: logEntry, error: logError } = await adminClient
      .from('edge_function_logs')
      .insert({
        function_name: functionName,
        status: 'running',
        triggered_by: 'manual',
        metadata: { triggered_by_user: userId },
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
    }

    const startTime = Date.now();

    try {
      // Invoke the target function
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ manual: true }),
      });

      const duration = Date.now() - startTime;
      const success = response.ok;

      // Update log entry with result
      if (logEntry) {
        await adminClient
          .from('edge_function_logs')
          .update({
            status: success ? 'success' : 'error',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: success ? null : `HTTP ${response.status}`,
          })
          .eq('id', logEntry.id);
      }

      // Log to platform audit log
      await adminClient.from('platform_audit_log').insert({
        user_id: userId,
        action: 'job_manually_triggered',
        entity_type: 'edge_function',
        entity_id: logEntry?.id,
        details: {
          function_name: functionName,
          success,
          duration_ms: duration,
        },
      });

      return new Response(
        JSON.stringify({
          success,
          functionName,
          duration_ms: duration,
          log_id: logEntry?.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (invokeError: any) {
      const duration = Date.now() - startTime;

      // Update log entry with error
      if (logEntry) {
        await adminClient
          .from('edge_function_logs')
          .update({
            status: 'error',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: String(invokeError),
          })
          .eq('id', logEntry.id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: String(invokeError),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Trigger job error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
