import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  organization_id: string;
  export_type: 'full' | 'users' | 'appointments' | 'clients' | 'billing';
  format?: 'json' | 'csv';
  requested_by?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // ── Auth: require authenticated org admin ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const request: ExportRequest = await req.json();

    if (!request.organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin of the target org
    const { data: isAdmin } = await adminClient.rpc('is_org_admin', { _user_id: user.id, _org_id: request.organization_id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: must be org admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const format = request.format || 'json';
    const exportData: Record<string, any> = {
      export_metadata: {
        organization_id: request.organization_id,
        export_type: request.export_type,
        format,
        exported_at: new Date().toISOString(),
        requested_by: request.requested_by,
      },
    };

    // Get organization info
    const { data: org } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', request.organization_id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    exportData.organization = org;

    // Export based on type
    if (request.export_type === 'full' || request.export_type === 'users') {
      const { data: users } = await adminClient
        .from('employee_profiles')
        .select('*')
        .eq('organization_id', request.organization_id);
      exportData.users = users || [];
    }

    if (request.export_type === 'full' || request.export_type === 'appointments') {
      const { data: appointments } = await adminClient
        .from('appointments')
        .select('*')
        .eq('organization_id', request.organization_id)
        .order('appointment_date', { ascending: false })
        .limit(10000);
      exportData.appointments = appointments || [];
    }

    if (request.export_type === 'full' || request.export_type === 'clients') {
      const { data: clients } = await adminClient
        .from('clients')
        .select('*')
        .eq('organization_id', request.organization_id)
        .limit(50000);
      exportData.clients = clients || [];
    }

    if (request.export_type === 'full' || request.export_type === 'billing') {
      const { data: invoices } = await adminClient
        .from('subscription_invoices')
        .select('*')
        .eq('organization_id', request.organization_id)
        .order('created_at', { ascending: false });
      exportData.invoices = invoices || [];

      const { data: billingChanges } = await adminClient
        .from('billing_changes')
        .select('*')
        .eq('organization_id', request.organization_id)
        .order('created_at', { ascending: false });
      exportData.billing_changes = billingChanges || [];
    }

    // Store export record
    const { data: exportRecord, error: insertError } = await adminClient
      .from('data_exports')
      .insert({
        organization_id: request.organization_id,
        export_type: request.export_type,
        format,
        requested_by: request.requested_by,
        status: 'completed',
        record_count: Object.values(exportData).reduce((sum: any, val: any) => {
          if (Array.isArray(val)) return sum + val.length;
          return sum;
        }, 0),
        data: exportData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store export:', insertError);
    }

    // Create notification
    await adminClient.from('platform_notifications').insert({
      type: 'data_export',
      severity: 'info',
      title: `Data Export Completed: ${org.name}`,
      message: `${request.export_type} export for ${org.name} has been generated.`,
      metadata: {
        organization_id: org.id,
        export_id: exportRecord?.id,
        export_type: request.export_type,
      },
    });

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'data-export',
      status: 'success',
      organization_id: request.organization_id,
      metadata: {
        export_type: request.export_type,
        format,
        export_id: exportRecord?.id,
      },
    });

    // Return based on format
    if (format === 'csv') {
      // Convert to CSV (simplified - just for the main data array)
      const mainData = exportData[request.export_type] || exportData.users || [];
      if (Array.isArray(mainData) && mainData.length > 0) {
        const headers = Object.keys(mainData[0]).join(',');
        const rows = mainData.map(row => 
          Object.values(row).map(v => 
            typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
          ).join(',')
        ).join('\n');
        
        return new Response(
          `${headers}\n${rows}`,
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="${org.slug}-${request.export_type}-export.csv"`,
            } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        export_id: exportRecord?.id,
        data: exportData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Data export error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
