import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";

async function phorestRequest(endpoint: string, businessId: string, username: string, password: string) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const url = `${PHOREST_BASE_URL}/business/${businessId}${endpoint}`;
  console.log(`Phorest request: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    console.log("Syncing services from Phorest...");

    // Get all branches
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || [];
    console.log(`Found ${branches.length} branches`);

    let totalServices = 0;
    let syncedServices = 0;
    let totalQualifications = 0;
    let syncedQualifications = 0;

    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      console.log(`Fetching services for branch: ${branch.name} (${branchId})`);

      try {
        // Fetch services for this branch
        const servicesData = await phorestRequest(
          `/branch/${branchId}/service?size=500`,
          businessId,
          username,
          password
        );
        
        const services = servicesData._embedded?.services || servicesData.services || 
                        servicesData.page?.content || [];
        
        console.log(`Found ${services.length} services in branch ${branch.name}`);
        totalServices += services.length;

        // Track which staff-service combinations we've seen for this branch
        const seenQualifications = new Set<string>();

        for (const service of services) {
          const serviceId = service.serviceId || service.id;
          
          // Log the first service's full structure to understand available fields
          if (totalServices === 1) {
            console.log("Sample service object keys:", Object.keys(service));
            console.log("Sample service object:", JSON.stringify(service, null, 2));
          }
          
          const serviceRecord = {
            phorest_service_id: serviceId,
            phorest_branch_id: branchId,
            name: service.name || 'Unknown Service',
            category: service.category || service.categoryName || null,
            duration_minutes: service.durationMins || service.duration || 60,
            price: service.price || service.defaultPrice || null,
            requires_qualification: service.requiresQualification || false,
            is_active: service.active !== false,
          };

          const { error } = await supabase
            .from("phorest_services")
            .upsert(serviceRecord, { 
              onConflict: 'phorest_service_id',
              ignoreDuplicates: false 
            });

          if (!error) {
            syncedServices++;
          } else {
            console.log(`Failed to upsert service ${serviceId}:`, error.message);
          }

          // Extract staff qualifications from various possible field names
          const qualifiedStaff = service.qualifiedStaffIds || 
                                 service.staffIds || 
                                 service.staffMembers ||
                                 service.qualifiedStaff ||
                                 service.assignedStaff ||
                                 [];
          
          // Handle both array of IDs and array of objects
          const staffIds = Array.isArray(qualifiedStaff) 
            ? qualifiedStaff.map((s: any) => typeof s === 'string' ? s : (s.staffId || s.id))
            : [];

          if (staffIds.length > 0) {
            console.log(`Service "${service.name}" has ${staffIds.length} qualified staff`);
          }

          for (const staffId of staffIds) {
            if (!staffId) continue;
            
            const qualKey = `${staffId}-${serviceId}-${branchId}`;
            seenQualifications.add(qualKey);
            totalQualifications++;

            const qualRecord = {
              phorest_staff_id: staffId,
              phorest_service_id: serviceId,
              phorest_branch_id: branchId,
              is_qualified: true,
              updated_at: new Date().toISOString(),
            };

            const { error: qualError } = await supabase
              .from("phorest_staff_services")
              .upsert(qualRecord, { 
                onConflict: 'phorest_staff_id,phorest_service_id,phorest_branch_id',
                ignoreDuplicates: false 
              });

            if (!qualError) {
              syncedQualifications++;
            } else {
              console.log(`Failed to upsert qualification for staff ${staffId}, service ${serviceId}:`, qualError.message);
            }
          }
        }

        // Mark qualifications not in the current sync as unqualified (soft delete)
        // This handles cases where a staff member's qualification was removed in Phorest
        if (seenQualifications.size > 0) {
          // Get existing qualifications for this branch
          const { data: existingQuals } = await supabase
            .from("phorest_staff_services")
            .select("phorest_staff_id, phorest_service_id")
            .eq("phorest_branch_id", branchId)
            .eq("is_qualified", true);

          if (existingQuals) {
            for (const qual of existingQuals) {
              const qualKey = `${qual.phorest_staff_id}-${qual.phorest_service_id}-${branchId}`;
              if (!seenQualifications.has(qualKey)) {
                // This qualification was not in the current sync, mark as unqualified
                await supabase
                  .from("phorest_staff_services")
                  .update({ is_qualified: false, updated_at: new Date().toISOString() })
                  .eq("phorest_staff_id", qual.phorest_staff_id)
                  .eq("phorest_service_id", qual.phorest_service_id)
                  .eq("phorest_branch_id", branchId);
              }
            }
          }
        }
      } catch (e: any) {
        console.log(`Failed to fetch services for branch ${branchId}:`, e.message);
      }
    }

    console.log(`Services sync complete: ${syncedServices}/${totalServices}`);
    console.log(`Qualifications sync complete: ${syncedQualifications}/${totalQualifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: totalServices,
        synced: syncedServices,
        qualifications: {
          total: totalQualifications,
          synced: syncedQualifications,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Services sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
