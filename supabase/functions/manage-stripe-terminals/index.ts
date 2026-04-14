import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schemas
const ActionSchema = z.enum([
  "list_locations",
  "create_location",
  "delete_location",
  "list_readers",
  "register_reader",
  "delete_reader",
]);

const StripeTerminalLocationIdSchema = z
  .string()
  .regex(/^tml_[a-zA-Z0-9]+$/, "Invalid terminal location ID format");

const StripeReaderIdSchema = z
  .string()
  .regex(/^tmr_[a-zA-Z0-9]+$/, "Invalid reader ID format");

const RequestBodySchema = z
  .object({
    action: ActionSchema,
    location_id: z.string().min(1, "Location ID is required").max(255, "Location ID too long"),
    terminal_location_id: StripeTerminalLocationIdSchema.optional(),
    reader_id: StripeReaderIdSchema.optional(),
    registration_code: z.string().min(1).max(100).optional(),
    label: z.string().max(255).optional(),
    display_name: z.string().max(255).optional(),
    metadata_location_id: z.boolean().optional(),
  })
  .strict();

// Actions that require admin/manager role
const WRITE_ACTIONS = new Set([
  "create_location",
  "delete_location",
  "register_reader",
  "delete_reader",
]);

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

    // Validate input
    const rawBody = await req.json();
    const parsed = RequestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, location_id, ...params } = parsed.data;

    // Look up stripe_account_id from the location
    const { data: locationData, error: locError } = await supabase
      .from("locations")
      .select(
        "stripe_account_id, name, address, city, state_province, country, organization_id, postal_code"
      )
      .eq("id", location_id)
      .single();

    if (locError || !locationData) {
      return new Response(JSON.stringify({ error: "Location not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Verify user is org member — check organization_admins first, fall back to employee_profiles
    let memberRole: string | null = null;

    const { data: adminRow } = await supabase
      .from("organization_admins")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", locationData.organization_id)
      .maybeSingle();

    if (adminRow) {
      memberRole = adminRow.role;
    } else {
      // Fall back to employee_profiles for non-admin staff
      const { data: empRow } = await supabase
        .from("employee_profiles")
        .select("stylist_type, is_super_admin, is_primary_owner")
        .eq("user_id", user.id)
        .eq("organization_id", locationData.organization_id)
        .maybeSingle();

      if (empRow) {
        memberRole = empRow.is_primary_owner
          ? "owner"
          : empRow.is_super_admin
            ? "admin"
            : "member";
      }
    }

    if (!memberRole) {
      return new Response(JSON.stringify({ error: "Not an org member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // S1: Role-based gating — write actions require admin or manager
    if (WRITE_ACTIONS.has(action)) {
      const allowedRoles = ["admin", "manager", "owner"];
      if (!allowedRoles.includes(memberRole)) {
        return new Response(
          JSON.stringify({
            error:
              "Insufficient permissions. Only admins and managers can modify terminal configuration.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
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

        // Parse address components — city field may contain "City, State ZIP"
        let postalCode = (locationData.postal_code || "").trim();
        let stateCode = (locationData.state_province || "").trim();
        const cityParts = (locationData.city || "").split(",");
        const cityName = cityParts[0]?.trim() || "N/A";

        if (!postalCode || !stateCode) {
          // Try parsing "AZ 85203" from the second part of "Mesa, AZ 85203"
          const stateZipPart = cityParts[1]?.trim() || "";
          const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
          if (stateZipMatch) {
            if (!stateCode) stateCode = stateZipMatch[1];
            if (!postalCode) postalCode = stateZipMatch[2];
          } else {
            // Fallback: split by space
            const parts = stateZipPart.split(" ");
            if (!stateCode && parts[0]?.match(/^[A-Z]{2}$/)) stateCode = parts[0];
            if (!postalCode && parts.length > 1) postalCode = parts.slice(1).join(" ").trim();
          }
        }

        if (!postalCode) {
          // Try extracting ZIP from state_province field
          const stateMatch = (locationData.state_province || "").match(/\d{5}(-\d{4})?/);
          if (stateMatch) postalCode = stateMatch[0];
        }

        if (!postalCode) {
          console.warn(`[manage-stripe-terminals] No postal code found for location ${location_id}. Stripe may reject this.`);
        }

        const formParams: Record<string, string> = {
          display_name: displayName,
          "address[line1]": locationData.address || "N/A",
          "address[city]": cityName,
          "address[postal_code]": postalCode || "00000",
          "address[country]": locationData.country || "US",
        };
        // Only include state if we have a value — Stripe rejects empty strings
        if (stateCode) {
          formParams["address[state]"] = stateCode;
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
