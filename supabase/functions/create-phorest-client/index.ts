import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOREST_BASE_URL = "https://api-gateway-eu.phorest.com/third-party-api-server/api";

// ── GLOBAL SAFETY KILL SWITCH ──
// When true, ALL Phorest write-back calls are blocked at the code level,
// regardless of the organization's phorest_write_enabled setting.
// Change to false and redeploy when ready to enable Phorest writes.
const PHOREST_WRITES_GLOBALLY_DISABLED = true;

interface CreateClientRequest {
  branch_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string;
  birthday?: string;
  client_since?: string;
  gender?: string;
  landline?: string;
  client_category?: string;
  referred_by?: string;
  external_client_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

async function phorestRequest(
  endpoint: string, 
  businessId: string, 
  username: string, 
  password: string,
  method: string = "GET",
  body?: any
) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const url = `${PHOREST_BASE_URL}/business/${businessId}${endpoint}`;
  console.log(`Phorest ${method} request: ${url}`);
  
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
    console.log("Request body:", JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Phorest API error (${response.status}):`, responseText);
    
    try {
      const errorJson = JSON.parse(responseText);
      const errorCode = errorJson.errorCode || errorJson.code;
      
      if (errorCode === 'CLIENT_ALREADY_EXISTS' || errorCode === 'DUPLICATE_CLIENT') {
        throw new Error('A client with this email or phone already exists.');
      } else if (errorCode === 'INVALID_PHONE_NUMBER') {
        throw new Error('The phone number format is invalid.');
      } else if (errorCode === 'INVALID_EMAIL') {
        throw new Error('The email format is invalid.');
      }
      
      throw new Error(errorJson.message || `Phorest API error: ${response.status}`);
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('invalid')) {
        throw e;
      }
      throw new Error(`Phorest API error: ${response.status} - ${responseText}`);
    }
  }

  return responseText ? JSON.parse(responseText) : {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const phorestUsername = Deno.env.get("PHOREST_USERNAME");
    const phorestPassword = Deno.env.get("PHOREST_API_KEY");
    const phorestBusinessId = Deno.env.get("PHOREST_BUSINESS_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!phorestUsername || !phorestPassword || !phorestBusinessId) {
      throw new Error("Missing Phorest API credentials");
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey) as any;
    const body: CreateClientRequest = await req.json();
    
    const { branch_id, first_name, last_name, email, phone, notes, birthday, client_since,
            gender, landline, client_category, referred_by, external_client_id,
            address_line1, address_line2, city, state, zip, country } = body;

    if (!branch_id || !first_name || !last_name) {
      throw new Error("branch_id, first_name, and last_name are required");
    }
    if (!email && !phone) {
      throw new Error("Either email or phone is required");
    }

    console.log(`Creating client: ${first_name} ${last_name} at branch ${branch_id}`);

    // Check write-gate from org settings
    let phorestWriteEnabled = false;
    try {
      const { data: locData } = await supabase
        .from("locations")
        .select("organization_id")
        .eq("phorest_branch_id", branch_id)
        .maybeSingle();

      if (locData?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("settings")
          .eq("id", locData.organization_id)
          .single();
        const settings = (orgData?.settings || {}) as Record<string, any>;
      phorestWriteEnabled = settings.phorest_write_enabled === true;
      }
    } catch (e) {
      console.log("Could not resolve org for write-gate check, defaulting to disabled");
    }

    // GLOBAL SAFETY OVERRIDE
    if (PHOREST_WRITES_GLOBALLY_DISABLED) {
      phorestWriteEnabled = false;
      console.warn("GLOBAL SAFETY: Phorest writes are disabled at code level");
    }

    // Build the Phorest client object
    const phorestClient: Record<string, any> = {
      firstName: first_name,
      lastName: last_name,
    };

    if (email) phorestClient.email = email;
    if (phone) {
      const cleanedPhone = phone.replace(/[^\d+]/g, '').replace(/^\+?/, '+1');
      phorestClient.mobile = cleanedPhone;
    }
    if (landline) phorestClient.landline = landline;
    if (notes) phorestClient.notes = notes;
    if (gender) phorestClient.gender = gender;

    // Create client in Phorest (only if write-back is enabled)
    let phorestClientId: string;
    if (phorestWriteEnabled) {
      const phorestResponse = await phorestRequest(
        `/branch/${branch_id}/client`,
        phorestBusinessId,
        phorestUsername,
        phorestPassword,
        "POST",
        phorestClient
      );

      console.log("Phorest response:", JSON.stringify(phorestResponse, null, 2));

      phorestClientId = phorestResponse.clientId || phorestResponse.id;
      if (!phorestClientId) {
        throw new Error("Failed to get client ID from Phorest response");
      }
    } else {
      console.log("Phorest write-back disabled for this organization, local-only client created");
      phorestClientId = `local-${crypto.randomUUID()}`;
    }

    // Get the location for this branch
    const { data: location } = await supabase
      .from("locations")
      .select("id, name")
      .eq("phorest_branch_id", branch_id)
      .single();

    // Check for existing duplicate before inserting
    const { data: existingDupes } = await supabase.rpc('find_duplicate_phorest_clients', {
      p_email: email || null,
      p_phone: phone || null,
      p_exclude_phorest_client_id: phorestClientId,
    });

    if (existingDupes && existingDupes.length > 0) {
      // Return the existing client instead of creating a duplicate
      console.log(`Duplicate found for ${first_name} ${last_name}, returning existing client: ${existingDupes[0].name}`);
      return new Response(
        JSON.stringify({
          success: true,
          duplicate_detected: true,
          client: {
            id: existingDupes[0].id,
            phorest_client_id: existingDupes[0].phorest_client_id,
            name: existingDupes[0].name,
            email: existingDupes[0].email,
            phone: existingDupes[0].phone,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create local record
    const clientRecord: Record<string, any> = {
      phorest_client_id: phorestClientId,
      name: `${first_name} ${last_name}`,
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      phorest_branch_id: branch_id,
      branch_name: location?.name || null,
      location_id: location?.id || null,
      visit_count: 0,
      total_spend: 0,
      birthday: birthday || null,
      client_since: client_since || new Date().toISOString().split('T')[0],
      gender: gender || null,
      landline: landline || null,
      client_category: client_category || null,
      referred_by: referred_by || null,
      external_client_id: external_client_id || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      country: country || null,
      is_duplicate: false,
      canonical_client_id: null,
    };

    const { data: insertedClient, error: insertError } = await supabase
      .from("phorest_clients")
      .insert(clientRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting client locally:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          id: insertedClient?.id || null,
          phorest_client_id: phorestClientId,
          name: `${first_name} ${last_name}`,
          email,
          phone,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating client:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
