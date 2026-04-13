import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, location_id, ...params } = body;

    if (!location_id) {
      return new Response(
        JSON.stringify({ error: "location_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Look up stripe_account_id from the location
    const { data: locationData, error: locError } = await supabase
      .from("locations")
      .select("stripe_account_id, name, address_line1, address_line2, city, state, zip_code, country, organization_id")
      .eq("id", location_id)
      .single();

    if (locError || !locationData) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!locationData.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Location is not connected to Zura Pay" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is org member
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", locationData.organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not an org member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeAccountId = locationData.stripe_account_id;

    // Helper to call Stripe API
    async function stripeRequest(
      method: string,
      path: string,
      bodyParams?: Record<string, string>
    ) {
      const url = `https://api.stripe.com${path}`;
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Stripe-Account": stripeAccountId,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      if (bodyParams && (method === "POST" || method === "PUT")) {
        options.body = new URLSearchParams(bodyParams).toString();
      }
      const resp = await fetch(url, options);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(
          data.error?.message || `Stripe API error: ${resp.status}`
        );
      }
      return data;
    }

    let result: unknown;

    switch (action) {
      case "list_locations": {
        result = await stripeRequest("GET", "/v1/terminal/locations?limit=100");
        break;
      }

      case "create_location": {
        const displayName =
          params.display_name || locationData.name || "Terminal Location";
        const formParams: Record<string, string> = {
          display_name: displayName,
          "address[line1]": locationData.address_line1 || "N/A",
          "address[city]": locationData.city || "N/A",
          "address[state]": locationData.state || "",
          "address[postal_code]": locationData.zip_code || "00000",
          "address[country]": locationData.country || "US",
        };
        if (locationData.address_line2) {
          formParams["address[line2]"] = locationData.address_line2;
        }
        if (params.metadata_location_id) {
          formParams["metadata[zura_location_id]"] = location_id;
        }
        result = await stripeRequest(
          "POST",
          "/v1/terminal/locations",
          formParams
        );
        break;
      }

      case "delete_location": {
        if (!params.terminal_location_id) {
          throw new Error("terminal_location_id is required");
        }
        result = await stripeRequest(
          "DELETE",
          `/v1/terminal/locations/${params.terminal_location_id}`
        );
        break;
      }

      case "list_readers": {
        let path = "/v1/terminal/readers?limit=100";
        if (params.terminal_location_id) {
          path += `&location=${params.terminal_location_id}`;
        }
        result = await stripeRequest("GET", path);
        break;
      }

      case "register_reader": {
        if (!params.registration_code || !params.terminal_location_id) {
          throw new Error(
            "registration_code and terminal_location_id are required"
          );
        }
        const readerParams: Record<string, string> = {
          registration_code: params.registration_code,
          location: params.terminal_location_id,
        };
        if (params.label) {
          readerParams.label = params.label;
        }
        result = await stripeRequest(
          "POST",
          "/v1/terminal/readers",
          readerParams
        );
        break;
      }

      case "delete_reader": {
        if (!params.reader_id) {
          throw new Error("reader_id is required");
        }
        result = await stripeRequest(
          "DELETE",
          `/v1/terminal/readers/${params.reader_id}`
        );
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
