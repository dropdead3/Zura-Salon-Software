import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  location_id: string;
  staff_user_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  service_id?: string;
  service_name?: string;
  total_price?: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const bookingData: BookingRequest = await req.json();

    // Validate required fields
    if (!bookingData.location_id || !bookingData.staff_user_id || 
        !bookingData.appointment_date || !bookingData.start_time || !bookingData.end_time) {
      throw new Error("Missing required fields: location_id, staff_user_id, appointment_date, start_time, end_time");
    }

    console.log("Creating booking:", bookingData);

    // Call the database function to create the booking
    const { data, error } = await supabase.rpc('create_booking', {
      p_location_id: bookingData.location_id,
      p_staff_user_id: bookingData.staff_user_id,
      p_appointment_date: bookingData.appointment_date,
      p_start_time: bookingData.start_time,
      p_end_time: bookingData.end_time,
      p_client_id: bookingData.client_id || null,
      p_client_name: bookingData.client_name || null,
      p_client_email: bookingData.client_email || null,
      p_client_phone: bookingData.client_phone || null,
      p_service_id: bookingData.service_id || null,
      p_service_name: bookingData.service_name || null,
      p_total_price: bookingData.total_price || null,
      p_notes: bookingData.notes || null,
    });

    if (error) {
      console.error("Database error:", error);
      throw new Error(error.message);
    }

    const result = data?.[0];

    if (!result?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error_message || "Failed to create booking",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Booking created successfully:", result.appointment_id);

    // Enqueue service-specific email flow for this appointment
    try {
      const fnUrl = `${supabaseUrl}/functions/v1/enqueue-service-emails`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ appointmentId: result.appointment_id, action: "book" }),
      });
    } catch (e: any) {
      console.warn("Failed to enqueue service emails:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: result.appointment_id,
        message: "Booking created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Booking creation error:", error);
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
