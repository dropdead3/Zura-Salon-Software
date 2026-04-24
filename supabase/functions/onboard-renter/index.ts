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

    const isAdmin = callerRoles?.some((r: any) => ['admin', 'manager', 'super_admin'].includes(r.role));
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
      createNewAccount = false,
      email,
      fullName,
      userId,
      organizationId,
      locationId,
      rentalModel = 'monthly',
      // Business fields
      businessName,
      ein,
      startDate,
      // License fields
      licenseNumber,
      licenseState,
      // Insurance fields
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
      // Contract fields (not used for daily model)
      rentAmount,
      rentFrequency = 'monthly',
      dueDay,
      securityDeposit,
      contractStartDate,
      contractEndDate,
      includesUtilities = false,
      includesWifi = false,
      includesProducts = false,
      retailCommissionEnabled = false,
      retailCommissionRate,
      // Station (not used for daily model or when booth assignment disabled)
      stationId,
      // PandaDoc
      generateRentalAgreement = false,
    } = body;

    const orgId = organizationId || callerProfile?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let targetUserId = userId;
    let password: string | null = null;
    let createdNewAccount = false;

    // Step 1: Create new account or validate existing user
    if (createNewAccount) {
      if (!email || !fullName) {
        return new Response(JSON.stringify({ error: 'Email and full name required for new account' }), {
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

      password = generateSecurePassword();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'booth_renter',
        }
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      targetUserId = newUser.user!.id;
      createdNewAccount = true;

      // Update employee profile (created by handle_new_user trigger)
      await supabaseAdmin
        .from('employee_profiles')
        .update({
          is_approved: true,
          is_active: true,
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
          organization_id: orgId,
          display_name: fullName,
          hire_date: startDate || new Date().toISOString().split('T')[0],
        })
        .eq('user_id', targetUserId);
    } else if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Either createNewAccount or userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Assign booth_renter role
    await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: targetUserId, role: 'booth_renter' },
        { onConflict: 'user_id,role' }
      );

    // Step 3: Create booth_renter_profiles record
    const profileData: Record<string, unknown> = {
      user_id: targetUserId,
      organization_id: orgId,
      business_name: businessName || null,
      ein_number: ein || null,
      business_license_number: licenseNumber || null,
      license_state: licenseState || null,
      insurance_provider: insuranceProvider || null,
      insurance_policy_number: insurancePolicyNumber || null,
      insurance_expiry_date: insuranceExpiryDate || null,
      start_date: startDate || new Date().toISOString().split('T')[0],
      status: 'pending',
      onboarding_complete: false,
    };

    const { data: boothRenterProfile, error: profileError } = await supabaseAdmin
      .from('booth_renter_profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: `Failed to create renter profile: ${profileError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const boothRenterId = boothRenterProfile.id;
    let contractId: string | null = null;

    // Step 4: Create booth_rental_contracts record (skip for daily renters)
    if (rentAmount && rentalModel !== 'daily') {
      const contractData: Record<string, unknown> = {
        booth_renter_id: boothRenterId,
        organization_id: orgId,
        contract_name: `${businessName || fullName || 'Renter'} - Booth Rental Agreement`,
        rent_amount: rentAmount,
        rent_frequency: rentFrequency,
        start_date: contractStartDate || startDate || new Date().toISOString().split('T')[0],
        end_date: contractEndDate || null,
        security_deposit: securityDeposit || null,
        includes_utilities: includesUtilities,
        includes_wifi: includesWifi,
        includes_products: includesProducts,
        retail_commission_enabled: retailCommissionEnabled,
        retail_commission_rate: retailCommissionRate || null,
        status: 'active',
      };

      if (rentFrequency === 'monthly' && dueDay) {
        contractData.due_day_of_month = dueDay;
      } else if (rentFrequency === 'weekly' && dueDay !== undefined) {
        contractData.due_day_of_week = dueDay;
      }

      const { data: contract, error: contractError } = await supabaseAdmin
        .from('booth_rental_contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractError) {
        console.error('Failed to create contract:', contractError);
      } else {
        contractId = contract.id;
      }
    }

    // Step 5: Station assignment (if provided)
    let stationAssigned = false;
    if (stationId) {
      // End any existing active assignment on this station
      await supabaseAdmin
        .from('station_assignments')
        .update({ is_active: false, end_date: new Date().toISOString().split('T')[0] })
        .eq('station_id', stationId)
        .eq('is_active', true);

      // Create new assignment
      const { error: assignError } = await supabaseAdmin
        .from('station_assignments')
        .insert({
          station_id: stationId,
          booth_renter_id: boothRenterId,
          assigned_date: startDate || new Date().toISOString().split('T')[0],
          is_active: true,
          assigned_by: caller.id,
        });

      if (!assignError) {
        stationAssigned = true;
        // Update station availability
        await supabaseAdmin
          .from('rental_stations')
          .update({ is_available: false })
          .eq('id', stationId);
      } else {
        console.error('Failed to assign station:', assignError);
      }
    }

    // Step 6: Seed onboarding task completions
    const { data: onboardingTasks } = await supabaseAdmin
      .from('renter_onboarding_tasks')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (onboardingTasks && onboardingTasks.length > 0) {
      const completionRecords = onboardingTasks.map((task: any) => ({
        booth_renter_id: boothRenterId,
        task_id: task.id,
      }));

      // Note: We don't insert completions -- the progress query checks which tasks exist
      // vs which completions exist. Not having a completion means "not completed".
      // Onboarding progress is already handled by useRenterOnboardingProgress.
    }

    // Log the action
    await supabaseAdmin
      .from('account_approval_logs')
      .insert({
        user_id: targetUserId,
        action: 'booth_renter_onboarded',
        performed_by: caller.id,
      });

    // Build response
    const result: Record<string, unknown> = {
      success: true,
      boothRenterId,
      userId: targetUserId,
      contractId,
      stationAssigned,
      createdNewAccount,
      message: `Booth renter has been onboarded successfully.`,
    };

    if (createdNewAccount && password) {
      result.email = email;
      result.password = password;
      result.fullName = fullName;
    }

    if (generateRentalAgreement) {
      result.rentalAgreementStatus = 'pending_pandadoc';
      result.rentalAgreementMessage = 'PandaDoc rental agreement generation will be triggered separately.';
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
