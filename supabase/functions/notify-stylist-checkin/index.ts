import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckinNotificationRequest {
  appointment_id: string;
  stylist_user_id: string;
  client_name: string;
  service_name: string;
  scheduled_time: string;
  location_id: string;
  is_walk_in?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;
    
    const { 
      appointment_id,
      stylist_user_id, 
      client_name, 
      service_name,
      scheduled_time,
      location_id,
      is_walk_in = false,
    }: CheckinNotificationRequest = await req.json();

    console.log(`Client check-in notification for stylist: ${stylist_user_id}`);
    console.log(`Client: ${client_name}, Service: ${service_name}, Time: ${scheduled_time}`);

    // Format the time for display
    let formattedTime = scheduled_time;
    try {
      const [hours, minutes] = scheduled_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      formattedTime = `${hour12}:${minutes} ${ampm}`;
    } catch {
      // Keep original if parsing fails
    }

    // Get location name for notification
    let locationName = '';
    if (location_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('name')
        .eq('id', location_id)
        .single();
      locationName = location?.name || '';
    }

    // Build notification content
    const title = is_walk_in ? '🚶 Walk-In Client' : '📍 Client Checked In';
    const body = is_walk_in 
      ? `${client_name} is here as a walk-in${service_name ? ` for ${service_name}` : ''}`
      : `${client_name} is here for their ${formattedTime} ${service_name}`;

    // Call the existing send-push-notification function
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: stylist_user_id,
        title,
        body,
        url: '/dashboard/schedule',
        tag: `checkin-${appointment_id}`,
      },
    });

    if (error) {
      console.error('Failed to send push notification:', error);
      // Don't throw - we still want to record the check-in
    } else {
      console.log('Push notification sent:', data);
    }

    // Update check-in record with notification status
    await supabase
      .from('appointment_check_ins')
      .update({
        stylist_notified_at: new Date().toISOString(),
        notification_status: error ? 'failed' : 'sent',
      })
      .eq('phorest_appointment_id', appointment_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_sent: !error,
        message: error ? 'Check-in recorded, notification failed' : 'Stylist notified successfully',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error in notify-stylist-checkin:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

