import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArchivalConfig {
  appointments_older_than_days: number;
  logs_older_than_days: number;
  notifications_older_than_days: number;
  dry_run: boolean;
}

const DEFAULT_CONFIG: ArchivalConfig = {
  appointments_older_than_days: 365, // 1 year
  logs_older_than_days: 90, // 3 months
  notifications_older_than_days: 60, // 2 months
  dry_run: false,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // ── Auth: require platform admin ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: isPlatform } = await adminClient.rpc('is_platform_user', { _user_id: user.id });
    if (!isPlatform) {
      return new Response(JSON.stringify({ error: 'Forbidden: platform admin required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const requestConfig = await req.json().catch(() => ({}));
    const config: ArchivalConfig = { ...DEFAULT_CONFIG, ...requestConfig };

    const now = new Date();
    const results = {
      archived: {
        appointments: 0,
        logs: 0,
        notifications: 0,
      },
      storage_freed_mb: 0,
      dry_run: config.dry_run,
    };

    // Calculate cutoff dates
    const appointmentsCutoff = new Date(now);
    appointmentsCutoff.setDate(appointmentsCutoff.getDate() - config.appointments_older_than_days);

    const logsCutoff = new Date(now);
    logsCutoff.setDate(logsCutoff.getDate() - config.logs_older_than_days);

    const notificationsCutoff = new Date(now);
    notificationsCutoff.setDate(notificationsCutoff.getDate() - config.notifications_older_than_days);

    // Archive old appointments
    const { data: oldAppointments, count: appointmentCount } = await adminClient
      .from('appointments')
      .select('*', { count: 'exact' })
      .lt('appointment_date', appointmentsCutoff.toISOString().split('T')[0])
      .limit(1000);

    if (oldAppointments && oldAppointments.length > 0) {
      // Store in archive table
      if (!config.dry_run) {
        await adminClient.from('archived_appointments').insert(
          oldAppointments.map((apt: any) => ({
            ...apt,
            archived_at: now.toISOString(),
          }))
        );

        // Delete from main table
        await adminClient
          .from('appointments')
          .delete()
          .lt('appointment_date', appointmentsCutoff.toISOString().split('T')[0])
          .limit(1000);
      }
      results.archived.appointments = oldAppointments.length;
    }

    // Archive old edge function logs
    const { data: oldLogs, count: logsCount } = await adminClient
      .from('edge_function_logs')
      .select('*', { count: 'exact' })
      .lt('started_at', logsCutoff.toISOString())
      .limit(5000);

    if (oldLogs && oldLogs.length > 0) {
      if (!config.dry_run) {
        // Store compressed summary instead of full logs
        const summary = {
          period_start: logsCutoff.toISOString(),
          period_end: now.toISOString(),
          total_logs: oldLogs.length,
          by_function: {} as Record<string, number>,
          by_status: {} as Record<string, number>,
        };

        for (const log of oldLogs) {
          summary.by_function[log.function_name] = (summary.by_function[log.function_name] || 0) + 1;
          summary.by_status[log.status] = (summary.by_status[log.status] || 0) + 1;
        }

        await adminClient.from('archived_log_summaries').insert({
          period_start: summary.period_start,
          period_end: summary.period_end,
          summary: summary,
          archived_at: now.toISOString(),
        });

        // Delete from main table
        await adminClient
          .from('edge_function_logs')
          .delete()
          .lt('started_at', logsCutoff.toISOString())
          .limit(5000);
      }
      results.archived.logs = oldLogs.length;
    }

    // Archive old notifications
    const { data: oldNotifications } = await adminClient
      .from('platform_notifications')
      .select('*')
      .lt('created_at', notificationsCutoff.toISOString())
      .not('resolved_at', 'is', null) // Only archive resolved notifications
      .limit(1000);

    if (oldNotifications && oldNotifications.length > 0) {
      if (!config.dry_run) {
        await adminClient.from('archived_notifications').insert(
          oldNotifications.map((n: any) => ({
            ...n,
            archived_at: now.toISOString(),
          }))
        );

        await adminClient
          .from('platform_notifications')
          .delete()
          .lt('created_at', notificationsCutoff.toISOString())
          .not('resolved_at', 'is', null)
          .limit(1000);
      }
      results.archived.notifications = oldNotifications.length;
    }

    // Estimate storage freed (rough estimate)
    results.storage_freed_mb = Math.round(
      (results.archived.appointments * 0.002 +
       results.archived.logs * 0.001 +
       results.archived.notifications * 0.001) * 100
    ) / 100;

    // Create summary notification
    if (!config.dry_run && (results.archived.appointments > 0 || results.archived.logs > 0 || results.archived.notifications > 0)) {
      await adminClient.from('platform_notifications').insert({
        type: 'archival_completed',
        severity: 'info',
        title: 'Data Archival Completed',
        message: `Archived ${results.archived.appointments} appointments, ${results.archived.logs} logs, and ${results.archived.notifications} notifications. Estimated storage freed: ${results.storage_freed_mb}MB`,
        metadata: results,
      });
    }

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'backup-archival',
      status: 'success',
      metadata: {
        ...results,
        config: {
          appointments_cutoff: appointmentsCutoff.toISOString(),
          logs_cutoff: logsCutoff.toISOString(),
          notifications_cutoff: notificationsCutoff.toISOString(),
        },
      },
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backup archival error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
