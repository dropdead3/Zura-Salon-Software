import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurrenceRule {
  frequency: string;
  occurrences: number;
}

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonthsToDate(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  // Clamp to last day of month if needed (e.g. Jan 31 -> Feb 28)
  if (result.getMonth() !== ((date.getMonth() + months) % 12 + 12) % 12) {
    result.setDate(0); // go to last day of previous month
  }
  return result;
}

const FREQUENCY_DAYS: Record<string, number | "month"> = {
  weekly: 7,
  every_2_weeks: 14,
  every_4_weeks: 28,
  every_6_weeks: 42,
  every_8_weeks: 56,
  monthly: "month",
};

function generateFutureDates(startDate: Date, frequency: string, count: number): Date[] {
  const dates: Date[] = [];
  const daysOrMonth = FREQUENCY_DAYS[frequency];
  if (!daysOrMonth) return dates;

  for (let i = 1; i < count; i++) {
    if (daysOrMonth === "month") {
      dates.push(addMonthsToDate(startDate, i));
    } else {
      dates.push(addDaysToDate(startDate, daysOrMonth * i));
    }
  }
  return dates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const {
      first_appointment_id,
      recurrence_rule,
      booking_details,
    } = await req.json();

    const rule = recurrence_rule as RecurrenceRule;
    if (!rule || !rule.frequency || !rule.occurrences || rule.occurrences < 2) {
      return new Response(
        JSON.stringify({ error: "Invalid recurrence rule" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the first appointment to copy details
    const { data: firstAppt, error: fetchError } = await supabase
      .from("phorest_appointments")
      .select("*")
      .eq("id", first_appointment_id)
      .single();

    if (fetchError || !firstAppt) {
      return new Response(
        JSON.stringify({ error: "First appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate recurrence group ID
    const recurrenceGroupId = crypto.randomUUID();

    // Update the first appointment with recurrence metadata
    await supabase
      .from("phorest_appointments")
      .update({
        recurrence_rule: rule,
        recurrence_group_id: recurrenceGroupId,
        recurrence_index: 0,
      })
      .eq("id", first_appointment_id);

    // Generate future dates
    const startDate = new Date(firstAppt.appointment_date + "T00:00:00");
    const futureDates = generateFutureDates(startDate, rule.frequency, rule.occurrences);

    const created: string[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (let i = 0; i < futureDates.length; i++) {
      const futureDate = futureDates[i];
      const dateStr = futureDate.toISOString().split("T")[0];

      // Conflict check using the appointments table (not phorest_appointments)
      // We check if the stylist already has something at that time
      if (firstAppt.stylist_user_id) {
        const { data: conflicts } = await supabase
          .from("phorest_appointments")
          .select("id, client_name")
          .eq("stylist_user_id", firstAppt.stylist_user_id)
          .eq("appointment_date", dateStr)
          .neq("status", "cancelled")
          .lt("start_time", firstAppt.end_time)
          .gt("end_time", firstAppt.start_time)
          .limit(1);

        if (conflicts && conflicts.length > 0) {
          skipped.push({
            date: dateStr,
            reason: `Conflict with ${conflicts[0].client_name || "existing appointment"}`,
          });
          continue;
        }
      }

      // Create the recurring appointment
      const newAppt = {
        phorest_id: `recurring-${recurrenceGroupId}-${i + 1}`,
        phorest_client_id: firstAppt.phorest_client_id,
        phorest_staff_id: firstAppt.phorest_staff_id,
        stylist_user_id: firstAppt.stylist_user_id,
        client_name: firstAppt.client_name,
        client_phone: firstAppt.client_phone,
        service_name: firstAppt.service_name,
        service_category: firstAppt.service_category,
        appointment_date: dateStr,
        start_time: firstAppt.start_time,
        end_time: firstAppt.end_time,
        status: "booked",
        location_id: firstAppt.location_id,
        total_price: firstAppt.total_price,
        notes: firstAppt.notes,
        is_new_client: false,
        recurrence_rule: rule,
        recurrence_group_id: recurrenceGroupId,
        recurrence_index: i + 1,
      };

      const { error: insertError } = await supabase
        .from("phorest_appointments")
        .insert(newAppt);

      if (insertError) {
        skipped.push({ date: dateStr, reason: insertError.message });
      } else {
        created.push(dateStr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recurrence_group_id: recurrenceGroupId,
        created_count: created.length + 1, // +1 for the first appointment
        skipped_count: skipped.length,
        total_requested: rule.occurrences,
        skipped,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
