import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Base URLs
const GUSTO_API_BASE = 'https://api.gusto.com/v1';
const QB_PAYROLL_API_BASE = 'https://payroll.api.intuit.com/v1';
const QB_SANDBOX_API_BASE = 'https://sandbox-payroll.api.intuit.com/v1';

// Decryption helper
async function decrypt(encryptedText: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const combined = new Uint8Array(
    atob(encryptedText).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('PAYROLL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: 'PAYROLL_ENCRYPTION_KEY is not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;
    
    const body = await req.json();
    const { organizationId, action, data } = body;
    
    if (!organizationId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get connection and determine provider
    const { data: connection, error: connError } = await supabase
      .from('payroll_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No payroll provider connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (connection.connection_status !== 'connected') {
      return new Response(
        JSON.stringify({ error: 'Payroll provider not connected', status: connection.connection_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferMinutes = connection.provider === 'quickbooks' ? 10 : 30;
    
    if (tokenExpiry.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
      // Token needs refresh - call appropriate OAuth refresh endpoint
      const refreshFn = connection.provider === 'gusto' ? 'gusto-oauth' : 'quickbooks-oauth';
      const refreshResult = await supabase.functions.invoke(refreshFn, {
        body: { organizationId }
      });
      
      if (refreshResult.error) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token', details: refreshResult.error }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Re-fetch updated connection
      const { data: refreshedConnection } = await supabase
        .from('payroll_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (refreshedConnection) {
        Object.assign(connection, refreshedConnection);
      }
    }
    
    // Decrypt access token
    const accessToken = await decrypt(connection.access_token_encrypted, encryptionKey);
    
    // Route to appropriate provider
    if (connection.provider === 'gusto') {
      return await handleGustoAction(action, data, accessToken, connection, supabase, organizationId);
    } else if (connection.provider === 'quickbooks') {
      const useSandbox = connection.metadata?.sandbox === true;
      return await handleQuickBooksAction(action, data, accessToken, connection, supabase, organizationId, useSandbox);
    }
    
    return new Response(
      JSON.stringify({ error: 'Unknown provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Payroll proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGustoAction(
  action: string,
  data: any,
  accessToken: string,
  connection: any,
  supabase: any,
  organizationId: string
) {
  const companyId = connection.external_company_id;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  
  let response: Response;
  let result: any;
  
  switch (action) {
    case 'getCompany':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}`, { headers });
      result = await response.json();
      break;
      
    case 'getEmployees':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}/employees`, { headers });
      result = await response.json();
      break;
      
    case 'getPayrolls':
      const { startDate, endDate } = data || {};
      let payrollsUrl = `${GUSTO_API_BASE}/companies/${companyId}/payrolls`;
      if (startDate && endDate) {
        payrollsUrl += `?start_date=${startDate}&end_date=${endDate}`;
      }
      response = await fetch(payrollsUrl, { headers });
      result = await response.json();
      break;
      
    case 'getPayroll':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}/payrolls/${data.payrollId}`, { headers });
      result = await response.json();
      break;
      
    case 'createPayroll':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}/payrolls`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data.payroll),
      });
      result = await response.json();
      
      // Store in local DB
      if (response.ok && result.uuid) {
        await supabase.from('payroll_runs').insert({
          organization_id: organizationId,
          provider: 'gusto',
          external_payroll_id: result.uuid,
          pay_period_start: result.pay_period?.start_date,
          pay_period_end: result.pay_period?.end_date,
          check_date: result.check_date,
          status: 'draft',
        });
      }
      break;
      
    case 'submitPayroll':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}/payrolls/${data.payrollId}/submit`, {
        method: 'PUT',
        headers,
      });
      result = await response.json();
      
      // Update local record
      if (response.ok) {
        await supabase.from('payroll_runs')
          .update({ 
            status: 'submitted', 
            submitted_at: new Date().toISOString() 
          })
          .eq('external_payroll_id', data.payrollId);
      }
      break;
      
    case 'getPaySchedules':
      response = await fetch(`${GUSTO_API_BASE}/companies/${companyId}/pay_schedules`, { headers });
      result = await response.json();
      break;
      
    default:
      return new Response(
        JSON.stringify({ error: `Unknown Gusto action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
  
  // Update last synced timestamp
  await supabase.from('payroll_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connection.id);
  
  return new Response(
    JSON.stringify({ success: response.ok, data: result }),
    { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleQuickBooksAction(
  action: string,
  data: any,
  accessToken: string,
  connection: any,
  supabase: any,
  organizationId: string,
  useSandbox: boolean
) {
  const realmId = connection.external_company_id;
  const baseUrl = useSandbox ? QB_SANDBOX_API_BASE : QB_PAYROLL_API_BASE;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  let response: Response;
  let result: any;
  
  switch (action) {
    case 'getCompany':
      // QuickBooks company info is from accounting API, not payroll
      response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, { headers });
      result = await response.json();
      break;
      
    case 'getEmployees':
      response = await fetch(`${baseUrl}/employers/${realmId}/employees`, { headers });
      result = await response.json();
      break;
      
    case 'getPayrolls':
      response = await fetch(`${baseUrl}/employers/${realmId}/payroll-runs`, { headers });
      result = await response.json();
      break;
      
    case 'getPayroll':
      response = await fetch(`${baseUrl}/employers/${realmId}/payroll-runs/${data.payrollId}`, { headers });
      result = await response.json();
      break;
      
    case 'createPayroll':
      response = await fetch(`${baseUrl}/employers/${realmId}/payroll-runs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data.payroll),
      });
      result = await response.json();
      
      if (response.ok && result.id) {
        await supabase.from('payroll_runs').insert({
          organization_id: organizationId,
          provider: 'quickbooks',
          external_payroll_id: result.id,
          pay_period_start: result.payPeriod?.startDate,
          pay_period_end: result.payPeriod?.endDate,
          check_date: result.checkDate,
          status: 'draft',
        });
      }
      break;
      
    case 'submitPayroll':
      response = await fetch(`${baseUrl}/employers/${realmId}/payroll-runs/${data.payrollId}/actions/approve`, {
        method: 'POST',
        headers,
      });
      result = await response.json();
      
      if (response.ok) {
        await supabase.from('payroll_runs')
          .update({ 
            status: 'submitted', 
            submitted_at: new Date().toISOString() 
          })
          .eq('external_payroll_id', data.payrollId);
      }
      break;
      
    case 'getPaySchedules':
      response = await fetch(`${baseUrl}/employers/${realmId}/pay-schedules`, { headers });
      result = await response.json();
      break;
      
    default:
      return new Response(
        JSON.stringify({ error: `Unknown QuickBooks action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
  
  await supabase.from('payroll_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connection.id);
  
  return new Response(
    JSON.stringify({ success: response.ok, data: result }),
    { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
