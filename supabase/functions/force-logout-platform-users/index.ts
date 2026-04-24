import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as any;

    // Verify the caller is a platform admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has platform role
    const { data: platformRole, error: roleError } = await supabaseAdmin
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['platform_owner', 'platform_admin'])
      .single();

    if (roleError || !platformRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all platform users
    const { data: platformUsers, error: usersError } = await supabaseAdmin
      .from('platform_roles')
      .select('user_id');

    if (usersError) {
      throw usersError;
    }

    const userIds = [...new Set(platformUsers?.map(u => u.user_id) || [])];
    console.log(`Logging out ${userIds.length} platform users`);

    // Sign out each platform user globally
    let loggedOutCount = 0;
    for (const userId of userIds) {
      try {
        // Use the admin API to sign out the user from all sessions
        const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId, 'global');
        if (!signOutError) {
          loggedOutCount++;
        } else {
          console.error(`Failed to sign out user ${userId}:`, signOutError);
        }
      } catch (err) {
        console.error(`Error signing out user ${userId}:`, err);
      }
    }

    // Log the action to audit
    await supabaseAdmin.from('platform_audit_log').insert({
      user_id: user.id,
      action: 'force_logout_all_platform_users',
      entity_type: 'security',
      details: {
        total_users: userIds.length,
        logged_out: loggedOutCount,
        performed_by: user.email,
      },
    });

    console.log(`Force logout completed: ${loggedOutCount}/${userIds.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully logged out ${loggedOutCount} platform users`,
        affected_users: loggedOutCount,
        total_users: userIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in force-logout-platform-users:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to force logout users' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
