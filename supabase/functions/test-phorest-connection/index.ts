import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phorest API base URLs for different regions
const PHOREST_BASE_URLS = [
  { name: "Global", url: "https://platform.phorest.com/third-party-api-server/api" },
  { name: "US", url: "https://platform-us.phorest.com/third-party-api-server/api" },
  { name: "EU", url: "https://api-gateway-eu.phorest.com/third-party-api-server/api" },
];

// Different endpoints to test connection - try staff first since business endpoint may not exist
const TEST_ENDPOINTS = [
  { path: "/staff", description: "staff list" },
  { path: "", description: "business info" },
  { path: "/branch", description: "branches" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const businessId = Deno.env.get("PHOREST_BUSINESS_ID");
    const username = Deno.env.get("PHOREST_USERNAME");
    const password = Deno.env.get("PHOREST_API_KEY");

    if (!businessId || !username || !password) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "Phorest API credentials not configured",
          details: {
            has_business_id: !!businessId,
            has_username: !!username,
            has_password: !!password,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try username with and without global/ prefix
    const usernamesToTry = [
      username,
      username.startsWith('global/') ? username : `global/${username}`,
    ];

    let successfulConfig: { baseUrl: string; regionName: string; username: string } | null = null;
    let responseData: any = null;

    // Try each base URL, endpoint, and username combination
    outer: for (const region of PHOREST_BASE_URLS) {
      for (const endpoint of TEST_ENDPOINTS) {
        for (const usernameAttempt of usernamesToTry) {
          const basicAuth = btoa(`${usernameAttempt}:${password}`);
          const url = `${region.url}/business/${businessId}${endpoint.path}`;
          
          console.log(`Trying ${region.name} - ${endpoint.description}: ${url}`);
          
          try {
            const response = await fetch(url, {
              headers: {
                "Authorization": `Basic ${basicAuth}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            });

            console.log(`Response: ${response.status}`);

            if (response.ok) {
              responseData = await response.json();
              successfulConfig = { 
                baseUrl: region.url, 
                regionName: region.name,
                username: usernameAttempt 
              };
              console.log(`SUCCESS with ${region.name} using ${endpoint.description}!`);
              break outer;
            } else {
              const errorText = await response.text();
              console.log(`${response.status}: ${errorText.substring(0, 100)}`);
            }
          } catch (e: any) {
            console.log(`Connection error:`, e);
          }
        }
      }
    }

    if (!successfulConfig) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: "Could not connect to Phorest with any endpoint. Please verify your credentials.",
          details: "Tried Global, US, and EU endpoints with multiple API paths.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Staff must be fetched per-branch - return each staff with their branch info
    // so users can map the same person at multiple branches
    let staffList: Array<{ id: string; name: string; email?: string; branchId?: string; branchName?: string }> = [];
    let staffCount = 0;
    let branchList: Array<{ id: string; name: string }> = [];
    
    try {
      const basicAuth = btoa(`${successfulConfig.username}:${password}`);
      
      // First get branches
      const branchResponse = await fetch(`${successfulConfig.baseUrl}/business/${businessId}/branch`, {
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      
      if (branchResponse.ok) {
        const branchData = await branchResponse.json();
        const branches = branchData._embedded?.branches || branchData.branches || [];
        
        // Store branch list for reference
        branchList = branches.map((b: any) => ({
          id: b.branchId || b.id,
          name: b.name || b.branchName || 'Unknown Branch',
        }));
        
        // Fetch staff for each branch - include branch info with each staff
        // Same person at different branches = separate entries for mapping
        for (const branch of branches) {
          const branchId = branch.branchId || branch.id;
          const branchName = branch.name || branch.branchName || 'Unknown Branch';
          
          try {
            const staffResponse = await fetch(`${successfulConfig.baseUrl}/business/${businessId}/branch/${branchId}/staff`, {
              headers: {
                "Authorization": `Basic ${basicAuth}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            });
            
            if (staffResponse.ok) {
              const staffData = await staffResponse.json();
              // API returns "staffs" (plural) in _embedded
              const staffArray = staffData._embedded?.staffs || staffData._embedded?.staff || 
                                staffData.staffs || staffData.staff || [];
              
              for (const s of staffArray) {
                const staffId = s.staffId || s.id;
                // Include branch info - same staff at different branches are separate entries
                staffList.push({
                  id: staffId,
                  name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Unknown',
                  email: s.email,
                  branchId: branchId,
                  branchName: branchName,
                });
              }
            }
          } catch (e: any) {
            console.log(`Could not fetch staff for branch ${branchId}:`, e);
          }
        }
        
        staffCount = staffList.length;
      }
    } catch (e: any) {
      console.log("Could not fetch staff:", e);
    }

    return new Response(
      JSON.stringify({ 
        connected: true,
        business: {
          name: responseData?.name || responseData?.businessName || "Unknown",
          id: businessId,
        },
        region: successfulConfig.regionName,
        staff_count: staffCount,
        staff_list: staffList,
        branch_list: branchList,
        api_version: "v3",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error testing Phorest connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ connected: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});