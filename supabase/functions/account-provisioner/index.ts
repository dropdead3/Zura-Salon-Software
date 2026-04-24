import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisioningRequest {
  organization_name: string;
  organization_slug: string;
  admin_email: string;
  admin_name: string;
  plan_type?: 'basic' | 'professional' | 'enterprise';
  trial_days?: number;
  is_multi_location?: boolean;
  initial_locations?: Array<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
  }>;
}

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
    // Verify caller is a platform user
    const { data: isPlatform } = await adminClient.rpc('is_platform_user', { _user_id: user.id });
    if (!isPlatform) {
      return new Response(JSON.stringify({ error: 'Forbidden: platform admin required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const request: ProvisioningRequest = await req.json();

    // Validate required fields
    if (!request.organization_name || !request.organization_slug || !request.admin_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_name, organization_slug, admin_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if slug is already taken
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', request.organization_slug)
      .single();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: 'Organization slug already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate trial end date
    const trialDays = request.trial_days || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Plan pricing
    const planPricing = {
      basic: { monthly_price: 99, price_per_user: 10 },
      professional: { monthly_price: 199, price_per_user: 15 },
      enterprise: { monthly_price: 499, price_per_user: 20 },
    };
    const selectedPlan = request.plan_type || 'professional';
    const pricing = planPricing[selectedPlan];

    // Determine multi-location status - explicit flag or based on initial locations count
    const isMultiLocation = request.is_multi_location ?? 
      (request.initial_locations?.length ?? 0) > 1;

    // Create organization
    const { data: newOrg, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: request.organization_name,
        slug: request.organization_slug,
        billing_email: request.admin_email,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        monthly_price: pricing.monthly_price,
        price_per_user: pricing.price_per_user,
        plan_type: selectedPlan,
        is_multi_location: isMultiLocation,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Check if admin user already exists
    const { data: existingUser } = await adminClient
      .from('employee_profiles')
      .select('user_id')
      .eq('email', request.admin_email)
      .single();

    let adminUserId: string;

    if (existingUser) {
      adminUserId = existingUser.user_id;
      
      // Update their profile to link to new org
      await adminClient
        .from('employee_profiles')
        .update({ organization_id: newOrg.id })
        .eq('user_id', adminUserId);
    } else {
      // Create admin user account
      const tempPassword = `Temp${Math.random().toString(36).slice(2)}!`;
      
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: request.admin_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: request.admin_name || request.admin_email.split('@')[0],
          role: 'admin',
        },
      });

      if (authError) throw authError;
      adminUserId = authUser.user.id;

      // Update employee profile with org
      await adminClient
        .from('employee_profiles')
        .update({
          organization_id: newOrg.id,
          full_name: request.admin_name || request.admin_email.split('@')[0],
          is_approved: true,
          is_super_admin: false,
        })
        .eq('user_id', adminUserId);
    }

    // Add as organization admin
    await adminClient.from('organization_admins').insert({
      organization_id: newOrg.id,
      user_id: adminUserId,
      role: 'owner',
    });

    // Ensure admin role
    await adminClient.from('user_roles').upsert({
      user_id: adminUserId,
      role: 'admin',
    }, { onConflict: 'user_id,role' });

    // Create initial locations if provided
    const createdLocations = [];
    if (request.initial_locations?.length) {
      for (const loc of request.initial_locations) {
        const { data: newLoc, error: locError } = await adminClient
          .from('locations')
          .insert({
            organization_id: newOrg.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            is_active: true,
          })
          .select()
          .single();

        if (!locError && newLoc) {
          createdLocations.push(newLoc);
        }
      }
    }

    // Create welcome notification
    await adminClient.from('platform_notifications').insert({
      type: 'account_provisioned',
      severity: 'info',
      title: `New Account Provisioned: ${request.organization_name}`,
      message: `${request.organization_name} has been provisioned with a ${trialDays}-day trial on the ${selectedPlan} plan.`,
      metadata: {
        organization_id: newOrg.id,
        admin_email: request.admin_email,
        plan: selectedPlan,
        trial_ends_at: trialEndsAt.toISOString(),
      },
    });

    // Log provisioning
    await adminClient.from('platform_audit_log').insert({
      organization_id: newOrg.id,
      user_id: adminUserId,
      action: 'account_provisioned',
      entity_type: 'organization',
      entity_id: newOrg.id,
      details: {
        plan: selectedPlan,
        trial_days: trialDays,
        locations_created: createdLocations.length,
      },
    });

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'account-provisioner',
      status: 'success',
      organization_id: newOrg.id,
      metadata: {
        organization_name: request.organization_name,
        plan: selectedPlan,
        locations_created: createdLocations.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        organization: newOrg,
        admin_user_id: adminUserId,
        locations: createdLocations,
        trial_ends_at: trialEndsAt.toISOString(),
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Account provisioning error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
