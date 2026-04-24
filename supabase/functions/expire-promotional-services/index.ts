import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const now = new Date().toISOString();

    // Find expired promotional services that need deactivation
    const { data: expiredServices, error: fetchError } = await supabase
      .from('promotional_services')
      .select('id, service_id, organization_id')
      .lte('expires_at', now)
      .eq('auto_deactivate', true)
      .is('deactivated_at', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredServices || expiredServices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired promotional services to deactivate',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let deactivatedCount = 0;
    const errors: string[] = [];

    for (const promoService of expiredServices) {
      try {
        // Deactivate the service in the services table
        const { error: serviceError } = await supabase
          .from('services')
          .update({ is_active: false })
          .eq('id', promoService.service_id);

        if (serviceError) {
          errors.push(`Service ${promoService.service_id}: ${serviceError.message}`);
          continue;
        }

        // Mark the promotional_services record as deactivated
        const { error: promoError } = await supabase
          .from('promotional_services')
          .update({ deactivated_at: now })
          .eq('id', promoService.id);

        if (promoError) {
          errors.push(`PromoService ${promoService.id}: ${promoError.message}`);
          continue;
        }

        deactivatedCount++;
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing ${promoService.id}: ${errMessage}`);
      }
    }

    // Log the operation
    console.log(`Deactivated ${deactivatedCount} promotional services`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deactivated ${deactivatedCount} expired promotional services`,
        count: deactivatedCount,
        total: expiredServices.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
