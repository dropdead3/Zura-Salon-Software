import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RollbackRequest {
  job_id: string;
}

// Map entity types to their table names
const ENTITY_TABLE_MAP: Record<string, string> = {
  clients: 'clients',
  appointments: 'appointments',
  services: 'services',
  staff: 'imported_staff',
  locations: 'locations',
  products: 'products',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    if (!userId) {
      throw new Error("Authentication required");
    }

    const { job_id }: RollbackRequest = await req.json();

    if (!job_id) {
      throw new Error("job_id is required");
    }

    console.log(`Starting rollback for job: ${job_id}`);

    // Fetch the job to verify it exists and is eligible for rollback
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error("Import job not found");
    }

    // Check if job is eligible for rollback
    if (job.rolled_back_at) {
      throw new Error("This import has already been rolled back");
    }

    if (job.is_dry_run) {
      throw new Error("Cannot rollback a dry run import - no data was inserted");
    }

    if (!['completed', 'failed'].includes(job.status)) {
      throw new Error(`Cannot rollback job with status: ${job.status}`);
    }

    // Check time limit (30 days)
    const jobDate = new Date(job.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (jobDate < thirtyDaysAgo) {
      throw new Error("Rollback is only available for imports within the last 30 days");
    }

    // Get the target table
    const targetTable = ENTITY_TABLE_MAP[job.entity_type];
    if (!targetTable) {
      throw new Error(`Unknown entity type: ${job.entity_type}`);
    }

    // Count records to be deleted
    const { count: recordCount, error: countError } = await supabase
      .from(targetTable)
      .select('*', { count: 'exact', head: true })
      .eq('import_job_id', job_id);

    if (countError) {
      console.error("Error counting records:", countError);
      throw new Error("Failed to count records for rollback");
    }

    console.log(`Found ${recordCount} records to delete from ${targetTable}`);

    // Delete records associated with this job
    const { error: deleteError } = await supabase
      .from(targetTable)
      .delete()
      .eq('import_job_id', job_id);

    if (deleteError) {
      console.error("Error deleting records:", deleteError);
      throw new Error(`Failed to delete records: ${deleteError.message}`);
    }

    // Update job status to rolled_back
    const { error: updateError } = await supabase
      .from('import_jobs')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: userId,
      })
      .eq('id', job_id);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      // Don't throw here - records are already deleted
    }

    console.log(`Rollback completed: ${recordCount} records deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        deleted_count: recordCount || 0,
        entity_type: job.entity_type,
        message: `Successfully rolled back ${recordCount || 0} ${job.entity_type} records`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Rollback error:", error);
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
