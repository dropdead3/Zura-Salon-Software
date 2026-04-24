import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) as any;

    // Verify caller is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('employee_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find all test accounts by email pattern
    const { data: testProfiles, error: fetchError } = await supabaseAdmin
      .from('employee_profiles')
      .select('user_id, email, full_name')
      .or('email.ilike.%test@test.com%,email.ilike.%-test@%');

    if (fetchError) {
      throw new Error(`Failed to fetch test profiles: ${fetchError.message}`);
    }

    if (!testProfiles || testProfiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No test accounts found',
        results: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const tp of testProfiles) {
      try {
        // 1. Delete user_roles
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', tp.user_id);

        // 2. Delete employee_profiles
        await supabaseAdmin
          .from('employee_profiles')
          .delete()
          .eq('user_id', tp.user_id);

        // 3. Delete auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(tp.user_id);
        
        if (deleteError) {
          results.push({ email: tp.email || tp.user_id, status: 'partial', error: `Auth delete failed: ${deleteError.message}` });
        } else {
          results.push({ email: tp.email || tp.user_id, status: 'deleted' });
        }
      } catch (err) {
        results.push({ email: tp.email || tp.user_id, status: 'error', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Processed ${results.length} test account(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
