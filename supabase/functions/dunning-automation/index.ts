import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createNotification } from '../_shared/notify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DunningConfig {
  maxRetries: number;
  retryIntervals: number[]; // days between retries
  gracePeriodDays: number;
}

const DEFAULT_CONFIG: DunningConfig = {
  maxRetries: 3,
  retryIntervals: [3, 5, 7], // retry after 3, 5, 7 days
  gracePeriodDays: 14,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Find organizations with failed payments (past_due status)
    const { data: pastDueOrgs, error: orgsError } = await adminClient
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        billing_email,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq('subscription_status', 'past_due');

    if (orgsError) throw orgsError;

    const results = {
      processed: 0,
      retriesScheduled: 0,
      suspensionsScheduled: 0,
      notifications: [] as string[],
    };

    for (const org of pastDueOrgs || []) {
      results.processed++;

      // Get latest failed invoice
      const { data: failedInvoice } = await adminClient
        .from('subscription_invoices')
        .select('*')
        .eq('organization_id', org.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!failedInvoice) continue;

      const failedAt = new Date(failedInvoice.created_at);
      const daysSinceFailure = Math.floor(
        (Date.now() - failedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine retry attempt number
      const retryAttempt = failedInvoice.retry_count || 0;

      if (retryAttempt < DEFAULT_CONFIG.maxRetries) {
        // Check if it's time for next retry
        const nextRetryDay = DEFAULT_CONFIG.retryIntervals[retryAttempt] || 7;
        
        if (daysSinceFailure >= nextRetryDay) {
          // Log retry attempt
          await adminClient.from('billing_changes').insert({
            organization_id: org.id,
            change_type: 'payment_retry',
            notes: `Automated retry attempt ${retryAttempt + 1} of ${DEFAULT_CONFIG.maxRetries}`,
            new_value: { retry_attempt: retryAttempt + 1, days_since_failure: daysSinceFailure },
          });

          // Update retry count
          await adminClient
            .from('subscription_invoices')
            .update({ retry_count: retryAttempt + 1 })
            .eq('id', failedInvoice.id);

          results.retriesScheduled++;

          // Create notification for platform team
          await createNotification(adminClient, {
            type: 'payment_retry',
            severity: 'warning',
            title: `Payment Retry Scheduled: ${org.name}`,
            message: `Retry attempt ${retryAttempt + 1} for ${org.name}. Amount: $${failedInvoice.amount_due / 100}`,
            metadata: {
              organization_id: org.id,
              invoice_id: failedInvoice.id,
              retry_attempt: retryAttempt + 1,
            },
          });

          results.notifications.push(`Retry scheduled for ${org.name}`);
        }
      } else if (daysSinceFailure >= DEFAULT_CONFIG.gracePeriodDays) {
        // Max retries exceeded and grace period ended — flag for manual review.
        // Per autonomy doctrine: suspensions require human approval.
        // We mark as "pending_suspension" and notify; a platform admin must
        // confirm via the Account Management UI to finalize.
        await adminClient
          .from('organizations')
          .update({ subscription_status: 'pending_suspension' })
          .eq('id', org.id);

        await adminClient.from('billing_changes').insert({
          organization_id: org.id,
          change_type: 'suspension_pending',
          notes: `Flagged for suspension after ${DEFAULT_CONFIG.maxRetries} failed payment retries. Awaiting admin review.`,
          previous_value: { status: 'past_due' },
          new_value: { status: 'pending_suspension' },
        });

        await createNotification(adminClient, {
          type: 'suspension_pending',
          severity: 'critical',
          title: `Suspension Review Required: ${org.name}`,
          message: `${org.name} has exhausted ${DEFAULT_CONFIG.maxRetries} payment retries over ${daysSinceFailure} days. Admin approval required to suspend.`,
          metadata: { organization_id: org.id },
        }, { force: true }); // Always surface suspension reviews

        results.suspensionsScheduled++;
        results.notifications.push(`${org.name} flagged for suspension review`);
      }
    }

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'dunning-automation',
      status: 'success',
      metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Dunning automation error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
