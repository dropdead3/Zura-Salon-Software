import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateStatusRequest {
  action: 'status';
  appointment_id: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  tip_amount?: number;
}

interface RescheduleRequest {
  action: 'reschedule';
  appointment_id: string;
  new_date: string; // YYYY-MM-DD
  new_start_time: string; // HH:MM:SS
  new_end_time: string; // HH:MM:SS
  new_staff_user_id?: string;
}

type UpdateRequest = UpdateStatusRequest | RescheduleRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const updateData: UpdateRequest = await req.json();

    if (!updateData.appointment_id) {
      throw new Error("Missing required field: appointment_id");
    }

    console.log("Updating booking:", updateData);

    let result;

    if (updateData.action === 'status') {
      // Update status
      const { data, error } = await supabase.rpc('update_booking_status', {
        p_appointment_id: updateData.appointment_id,
        p_status: updateData.status,
        p_notes: updateData.notes || null,
        p_tip_amount: updateData.tip_amount || null,
      });

      if (error) throw new Error(error.message);
      result = data?.[0];

      // Cross-table sync: update phorest_appointments if linked
      if (result?.success) {
        try {
          const { data: localRow } = await supabase
            .from('appointments')
            .select('external_id')
            .eq('id', updateData.appointment_id)
            .maybeSingle();

          if (localRow?.external_id) {
            await supabase
              .from('phorest_appointments')
              .update({ status: updateData.status, updated_at: new Date().toISOString() })
              .eq('phorest_id', localRow.external_id);
            console.log(`Cross-synced status "${updateData.status}" to phorest_appointments`);
          }
        } catch (syncErr: any) {
          console.warn('Cross-table sync failed (non-fatal):', syncErr.message);
        }
      }
      
    } else if (updateData.action === 'reschedule') {
      // Reschedule
      if (!updateData.new_date || !updateData.new_start_time || !updateData.new_end_time) {
        throw new Error("Missing required fields for reschedule: new_date, new_start_time, new_end_time");
      }

      const { data, error } = await supabase.rpc('reschedule_booking', {
        p_appointment_id: updateData.appointment_id,
        p_new_date: updateData.new_date,
        p_new_start_time: updateData.new_start_time,
        p_new_end_time: updateData.new_end_time,
        p_new_staff_user_id: updateData.new_staff_user_id || null,
      });

      if (error) throw new Error(error.message);
      result = data?.[0];
      
    } else {
      throw new Error("Invalid action. Use 'status' or 'reschedule'");
    }

    if (!result?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error_message || "Failed to update booking",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Booking updated successfully");

    // Trigger email flow updates on status change or reschedule
    try {
      const fnUrl = `${supabaseUrl}/functions/v1/enqueue-service-emails`;
      const emailAction = updateData.action === 'status' && (updateData as any).status === 'cancelled'
        ? 'cancel'
        : updateData.action === 'reschedule' ? 'book' : null;
      
      if (emailAction) {
        await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ appointmentId: updateData.appointment_id, action: emailAction }),
        });
      }
    } catch (e) {
      console.warn("Failed to update service email queue:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: updateData.action === 'reschedule' ? "Booking rescheduled successfully" : "Booking status updated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Booking update error:", error);
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
