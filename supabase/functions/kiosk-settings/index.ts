import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, location_id, settings, admin_pin } = await req.json();

    if (!organization_id || !admin_pin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for PIN validation and settings update
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ) as any;

    // Validate admin PIN using the existing database function
    const { data: pinResult, error: pinError } = await supabase
      .rpc('validate_user_pin', {
        _organization_id: organization_id,
        _pin: admin_pin,
      });

    if (pinError) {
      console.error('PIN validation error:', pinError);
      return new Response(
        JSON.stringify({ error: 'PIN validation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pinResult || pinResult.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = pinResult[0];
    
    // Check if user has admin privileges
    if (!admin.is_super_admin && !admin.is_primary_owner) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if settings already exist for this org/location
    const { data: existing, error: fetchError } = await supabase
      .from('organization_kiosk_settings')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('location_id', location_id ?? null)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch existing settings error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    
    if (existing) {
      // Update existing settings
      result = await supabase
        .from('organization_kiosk_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new settings
      result = await supabase
        .from('organization_kiosk_settings')
        .insert({
          organization_id,
          location_id: location_id ?? null,
          ...settings,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Settings upsert error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
