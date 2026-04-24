import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

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

    // Verify caller is authenticated and is admin/manager
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if caller is admin/manager
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const isAdmin = callerRoles?.some(r => ['admin', 'manager', 'super_admin'].includes(r.role));
    const { data: callerProfile } = await supabaseAdmin
      .from('employee_profiles')
      .select('is_super_admin, organization_id')
      .eq('user_id', caller.id)
      .single();

    if (!isAdmin && !callerProfile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Admin or manager access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      email,
      fullName,
      role = 'team_member',
      organizationId,
      locationId,
      startDate,
      payType,
      payRate,
      title,
      // Onboarding config
      assignOnboardingTasks = true,
      // PandaDoc config
      generateOfferLetter = false,
      // Payroll provider config
      triggerPayrollProvider = false,
      payrollProvider = null,
      // Legacy fallback
      triggerGusto = false,
      // Source applicant
      applicantId,
    } = body;

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const orgId = organizationId || callerProfile?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if email already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('employee_profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate password
    const password = generateSecurePassword();

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      }
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = newUser.user!.id;

    // Update employee profile (created by handle_new_user trigger)
    const profileUpdate: Record<string, unknown> = {
      is_approved: true,
      is_active: true,
      approved_by: caller.id,
      approved_at: new Date().toISOString(),
      organization_id: orgId,
      display_name: fullName,
      hire_date: startDate || new Date().toISOString().split('T')[0],
    };

    if (locationId) profileUpdate.location_id = locationId;
    if (title) profileUpdate.title = title;
    if (payType) profileUpdate.pay_type = payType;
    if (payRate) profileUpdate.pay_rate = payRate;

    const { error: updateError } = await supabaseAdmin
      .from('employee_profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Failed to assign role:', roleError);
    }

    // Auto-assign onboarding tasks if enabled
    let assignedTaskCount = 0;
    if (assignOnboardingTasks) {
      // Get active onboarding tasks visible to this role
      const { data: tasks } = await supabaseAdmin
        .from('onboarding_tasks')
        .select('id, visible_to_roles')
        .eq('is_active', true);

      if (tasks) {
        const visibleTasks = tasks.filter(t => 
          t.visible_to_roles && t.visible_to_roles.includes(role)
        );

        for (const task of visibleTasks) {
          await supabaseAdmin
            .from('onboarding_task_completions')
            .insert({
              user_id: userId,
              task_id: task.id,
              completed: false,
            })
            .select();
        }
        assignedTaskCount = visibleTasks.length;
      }
    }

    // If applicant source, update pipeline stage to hired
    if (applicantId) {
      await supabaseAdmin
        .from('job_applications')
        .update({ 
          pipeline_stage: 'hired',
          notes: `Hired on ${new Date().toISOString().split('T')[0]}. Account created.`
        })
        .eq('id', applicantId);
    }

    // Log the action
    await supabaseAdmin
      .from('account_approval_logs')
      .insert({
        user_id: userId,
        action: 'employee_hired',
        performed_by: caller.id,
      });

    // Build response
    const result: Record<string, unknown> = {
      success: true,
      userId,
      email,
      password,
      fullName,
      role,
      organizationId: orgId,
      assignedTaskCount,
      message: `${fullName} has been hired and their account is ready.`,
    };

    // Payroll provider integration status
    const shouldTriggerPayroll = triggerPayrollProvider || triggerGusto;
    if (shouldTriggerPayroll) {
      const effectiveProvider = payrollProvider || (triggerGusto ? 'gusto' : null);
      if (effectiveProvider === 'gusto') {
        result.payrollStatus = 'not_connected';
        result.payrollMessage = 'Employee will be onboarded via Gusto for tax documents, offer letter, and direct deposit.';
      } else if (effectiveProvider === 'quickbooks') {
        result.payrollStatus = 'not_connected';
        result.payrollMessage = 'Employee will be added to QuickBooks Payroll for tax forms and direct deposit.';
      } else {
        result.payrollStatus = 'not_configured';
        result.payrollMessage = 'Payroll provider is not yet configured. Tax documents will need to be handled manually.';
      }
    }

    // PandaDoc offer letter status
    if (generateOfferLetter) {
      result.offerLetterStatus = 'pending_pandadoc';
      result.offerLetterMessage = 'PandaDoc offer letter generation will be triggered separately.';
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
