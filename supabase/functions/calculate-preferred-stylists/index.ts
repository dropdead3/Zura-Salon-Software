import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    console.log("Calculating preferred stylists from appointment history...");

    // Call the database function to calculate and update preferred stylists
    const { data: updateCount, error } = await supabase.rpc('update_preferred_stylists');

    if (error) {
      console.error("Error updating preferred stylists:", error);
      throw error;
    }

    console.log(`Updated ${updateCount} client records with calculated preferred stylist`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updateCount,
        message: `Updated ${updateCount} client records with calculated preferred stylist`
      }),
      { 
        status: 200, 
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error in calculate-preferred-stylists:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } 
      }
    );
  }
});
