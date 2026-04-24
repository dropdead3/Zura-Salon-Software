import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AvailabilityRequest {
  staff_user_id: string;
  date: string; // YYYY-MM-DD
  location_id?: string;
  slot_duration_minutes?: number; // Default: 15
}

interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const requestData: AvailabilityRequest = await req.json();

    if (!requestData.staff_user_id || !requestData.date) {
      throw new Error("Missing required fields: staff_user_id, date");
    }

    console.log("Checking availability:", requestData);

    // Call the database function
    const { data, error } = await supabase.rpc('get_staff_availability', {
      p_staff_user_id: requestData.staff_user_id,
      p_date: requestData.date,
      p_location_id: requestData.location_id || null,
      p_slot_duration_minutes: requestData.slot_duration_minutes || 15,
    });

    if (error) {
      console.error("Database error:", error);
      throw new Error(error.message);
    }

    // Filter to only available slots
    const availableSlots = (data as AvailableSlot[])?.filter(slot => slot.is_available) || [];

    console.log(`Found ${availableSlots.length} available slots`);

    return new Response(
      JSON.stringify({
        success: true,
        date: requestData.date,
        staff_user_id: requestData.staff_user_id,
        available_slots: availableSlots,
        all_slots: data, // Include all slots for UI display
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Availability check error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
