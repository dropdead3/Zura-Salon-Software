import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OffboardingRequest {
  organization_id: string;
  reason?: string;
  immediate?: boolean;
  export_data?: boolean;
  performed_by?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    const request: OffboardingRequest = await req.json();

    if (!request.organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', request.organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      organization_id: org.id,
      organization_name: org.name,
      actions_taken: [] as string[],
      data_exported: false,
      users_affected: 0,
    };

    // Get all users in this organization
    const { data: orgUsers, count: userCount } = await adminClient
      .from('employee_profiles')
      .select('user_id, email', { count: 'exact' })
      .eq('organization_id', org.id);

    results.users_affected = userCount || 0;

    // Export data if requested
    if (request.export_data) {
      // Create data export record
      const exportData = {
        organization: org,
        users: orgUsers,
        exported_at: new Date().toISOString(),
      };

      // Store in a data exports table or send to storage
      await adminClient.from('data_exports').insert({
        organization_id: org.id,
        export_type: 'offboarding',
        data: exportData,
        requested_by: request.performed_by,
      });

      results.data_exported = true;
      results.actions_taken.push('Data exported');
    }

    // Update organization status
    await adminClient
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: request.reason,
      })
      .eq('id', org.id);

    results.actions_taken.push('Organization marked as cancelled');

    // Log billing change
    await adminClient.from('billing_changes').insert({
      organization_id: org.id,
      change_type: 'subscription_cancelled',
      notes: request.reason || 'Account offboarding',
      created_by: request.performed_by,
      previous_value: { status: org.subscription_status },
      new_value: { status: 'cancelled' },
    });

    results.actions_taken.push('Billing change logged');

    if (request.immediate) {
      // Immediately revoke access for all users
      for (const user of orgUsers || []) {
        // Remove from organization admins
        await adminClient
          .from('organization_admins')
          .delete()
          .eq('user_id', user.user_id)
          .eq('organization_id', org.id);

        // Clear organization from profile
        await adminClient
          .from('employee_profiles')
          .update({ 
            organization_id: null,
            is_approved: false,
            departure_notes: 'Organization offboarded',
          })
          .eq('user_id', user.user_id)
          .eq('organization_id', org.id);
      }

      results.actions_taken.push('User access revoked immediately');
    } else {
      // Schedule access revocation (e.g., end of billing period)
      const accessEndsAt = new Date();
      accessEndsAt.setDate(accessEndsAt.getDate() + 30); // 30 days grace

      await adminClient
        .from('organizations')
        .update({ access_ends_at: accessEndsAt.toISOString() })
        .eq('id', org.id);

      results.actions_taken.push(`Access scheduled to end on ${accessEndsAt.toISOString().split('T')[0]}`);
    }

    // Create platform notification
    await adminClient.from('platform_notifications').insert({
      type: 'account_offboarded',
      severity: 'info',
      title: `Account Offboarded: ${org.name}`,
      message: `${org.name} has been offboarded. Reason: ${request.reason || 'Not specified'}. Users affected: ${userCount}`,
      metadata: {
        organization_id: org.id,
        reason: request.reason,
        immediate: request.immediate,
        users_affected: userCount,
      },
    });

    // Log audit
    await adminClient.from('platform_audit_log').insert({
      organization_id: org.id,
      user_id: request.performed_by,
      action: 'account_offboarded',
      entity_type: 'organization',
      entity_id: org.id,
      details: {
        reason: request.reason,
        immediate: request.immediate,
        data_exported: results.data_exported,
        users_affected: userCount,
      },
    });

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'account-offboarding',
      status: 'success',
      organization_id: org.id,
      metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Account offboarding error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
