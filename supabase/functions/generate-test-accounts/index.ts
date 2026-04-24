import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_ACCOUNTS = [
  { email: 'manager-test@test.com', fullName: 'Manager Test Account', role: 'manager' },
  { email: 'receptionist-test@test.com', fullName: 'Receptionist Test Account', role: 'receptionist' },
  { email: 'stylist-assistant-test@test.com', fullName: 'Stylist Assistant Test Account', role: 'stylist_assistant' },
  { email: 'admin-assistant-test@test.com', fullName: 'Admin Assistant Test Account', role: 'admin_assistant' },
  { email: 'operations-assistant-test@test.com', fullName: 'Operations Assistant Test Account', role: 'operations_assistant' },
];

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

    // Check if user is super admin
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

    const results: Array<{ email: string; status: string; error?: string }> = [];
    const defaultPassword = 'TestAccount123!';

    for (const account of TEST_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingProfile } = await supabaseAdmin
          .from('employee_profiles')
          .select('user_id')
          .eq('email', account.email)
          .single();

        if (existingProfile) {
          results.push({ email: account.email, status: 'already_exists' });
          continue;
        }

        // Create auth user with auto-confirm
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
            role: account.role
          }
        });

        if (createError) {
          // Check if it's a duplicate email error
          if (createError.message?.includes('already been registered')) {
            results.push({ email: account.email, status: 'already_exists' });
          } else {
            results.push({ email: account.email, status: 'error', error: createError.message });
          }
          continue;
        }

        if (newUser.user) {
          // Approve the account
          await supabaseAdmin
            .from('employee_profiles')
            .update({ is_approved: true, is_active: true })
            .eq('user_id', newUser.user.id);

          results.push({ email: account.email, status: 'created' });
        }
      } catch (err) {
        results.push({ email: account.email, status: 'error', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      password: defaultPassword,
      message: `Test accounts processed. Use password: ${defaultPassword}`
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
