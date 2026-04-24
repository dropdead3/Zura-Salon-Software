import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";

interface AvailabilityRequest {
  branch_id: string;
  staff_id: string;
  service_ids: string[];
  date: string; // YYYY-MM-DD
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
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Phorest API error (${response.status}):`, errorText);
    throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const businessId = Deno.env.get("PHOREST_BUSINESS_ID");
    const username = Deno.env.get("PHOREST_USERNAME");
    const password = Deno.env.get("PHOREST_API_KEY");

    if (!businessId || !username || !password) {
      throw new Error("Missing Phorest credentials");
    }

    const { branch_id, staff_id, service_ids, date }: AvailabilityRequest = await req.json();

    if (!branch_id || !staff_id || !service_ids?.length || !date) {
      throw new Error("Missing required fields: branch_id, staff_id, service_ids, date");
    }

    console.log(`Checking availability for staff ${staff_id} on ${date}`);

    // Try to get availability from Phorest
    // The exact endpoint depends on Phorest API version, trying common patterns
    let availableSlots: { start_time: string; end_time: string }[] = [];

    try {
      // Try the availability endpoint
      const availabilityData = await phorestRequest(
        `/branch/${branch_id}/appointment/availability?staffId=${staff_id}&date=${date}&serviceIds=${service_ids.join(',')}`,
        businessId,
        username,
        password
      );

      const slots = availabilityData._embedded?.availableSlots || 
                   availabilityData.availableSlots || 
                   availabilityData.slots || [];
      
      availableSlots = slots.map((slot: any) => ({
        start_time: slot.startTime || slot.start,
        end_time: slot.endTime || slot.end,
      }));
    } catch (e: any) {
      console.log("Availability endpoint failed, falling back to schedule check:", e.message);
      
      // Fallback: Get existing appointments and calculate gaps
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey) as any;

      // Get staff mapping to find user_id
      const { data: mapping } = await supabase
        .from("phorest_staff_mapping")
        .select("user_id")
        .eq("phorest_staff_id", staff_id)
        .single();

      if (mapping?.user_id) {
        // Get appointments for this day
        const { data: appointments } = await supabase
          .from("phorest_appointments")
          .select("start_time, end_time")
          .eq("stylist_user_id", mapping.user_id)
          .eq("appointment_date", date)
          .neq("status", "cancelled")
          .order("start_time");

        // Calculate service duration
        const { data: services } = await supabase
          .from("phorest_services")
          .select("duration_minutes")
          .in("phorest_service_id", service_ids);

        const totalDuration = services?.reduce((sum: any, s: any) => sum + (s.duration_minutes || 60), 0) || 60;

        // Generate slots from 9am to 7pm with 15-minute intervals
        const startHour = 9;
        const endHour = 19; // 7 PM
        const intervalMinutes = 15;

        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slotEndMinutes = hour * 60 + minute + totalDuration;
            const slotEndHour = Math.floor(slotEndMinutes / 60);
            const slotEndMin = slotEndMinutes % 60;
            const slotEnd = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

            // Check if this slot overlaps with any existing appointment
            const hasConflict = appointments?.some((apt: any) => {
              const aptStart = apt.start_time;
              const aptEnd = apt.end_time;
              return !(slotEnd <= aptStart || slotStart >= aptEnd);
            });

            if (!hasConflict && slotEndHour < 20) { // End by 8 PM
              availableSlots.push({
                start_time: slotStart,
                end_time: slotEnd,
              });
            }
          }
        }
      }
    }

    console.log(`Found ${availableSlots.length} available slots`);

    return new Response(
      JSON.stringify({
        success: true,
        date,
        staff_id,
        available_slots: availableSlots,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Availability check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
