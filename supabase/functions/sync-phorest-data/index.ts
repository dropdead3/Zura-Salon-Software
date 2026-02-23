import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  sync_type: 'staff' | 'appointments' | 'clients' | 'reports' | 'sales' | 'all';
  date_from?: string;
  date_to?: string;
  quick?: boolean; // For lightweight syncs (e.g., appointments for next 7 days only)
}

// Phorest API configuration - Global endpoint works
const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";

async function phorestRequest(endpoint: string, businessId: string, username: string, password: string) {
  // Ensure username has global/ prefix
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

// POST request helper for CSV export jobs
async function phorestPostRequest(endpoint: string, businessId: string, username: string, password: string, body: object) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const url = `${PHOREST_BASE_URL}/business/${businessId}${endpoint}`;
  console.log(`Phorest POST request: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Phorest API POST error (${response.status}):`, errorText);
    throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Fetch raw text (for CSV downloads)
async function phorestRequestText(endpoint: string, businessId: string, username: string, password: string) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const url = `${PHOREST_BASE_URL}/business/${businessId}${endpoint}`;
  console.log(`Phorest request (text): ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Accept": "text/csv,application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Phorest API error (${response.status}):`, errorText);
    throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
  }

  return response.text();
}

async function syncStaff(supabase: any, businessId: string, username: string, password: string) {
  console.log("Syncing staff data...");
  
  try {
    let allStaff: any[] = [];
    
    // Get branches first - staff endpoints require branchId per the API docs
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || 
                     (Array.isArray(branchData) ? branchData : []);
    console.log(`Found ${branches.length} branches`);
    
    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      console.log(`Fetching staff for branch: ${branch.name} (${branchId})`);
      
      // Correct endpoint per API docs: /api/business/{businessId}/branch/{branchId}/staff
      try {
        const staffResponse = await phorestRequest(`/branch/${branchId}/staff`, businessId, username, password);
        console.log(`Staff response for ${branchId}:`, JSON.stringify(staffResponse).substring(0, 300));
        
        // API returns "staffs" (plural) in _embedded
        const staffList = staffResponse._embedded?.staffs || staffResponse._embedded?.staff || 
                         staffResponse.staffs || staffResponse.staff || 
                         staffResponse.page?.content || (Array.isArray(staffResponse) ? staffResponse : []);
        
        if (staffList.length > 0) {
          console.log(`Found ${staffList.length} staff in branch ${branch.name}`);
          // Add branchId to each staff member for reference
          const staffWithBranch = staffList.map((s: any) => ({ ...s, branchId, branchName: branch.name }));
          allStaff = [...allStaff, ...staffWithBranch];
        }
      } catch (e: any) {
        console.log(`Staff fetch failed for branch ${branchId}:`, e.message);
      }
    }
    
    // Deduplicate by staffId (staff may work at multiple branches)
    const uniqueStaff = Array.from(
      new Map(allStaff.map((s: any) => [s.staffId || s.id, s])).values()
    );
    
    console.log(`Found ${uniqueStaff.length} unique staff members total`);

    // Get existing mappings
    const { data: existingMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id");

    const mappedIds = new Set(existingMappings?.map((m: any) => m.phorest_staff_id) || []);

    // Return staff that aren't mapped yet
    const unmappedStaff = uniqueStaff.filter((s: any) => !mappedIds.has(s.staffId || s.id));

    return {
      total_staff: uniqueStaff.length,
      mapped: mappedIds.size,
      unmapped: unmappedStaff.length,
      unmapped_staff: unmappedStaff.map((s: any) => ({
        phorest_id: s.staffId || s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
        email: s.email,
      })),
    };
  } catch (error) {
    console.error("Staff sync error:", error);
    throw error;
  }
}

async function syncAppointments(
  supabase: any, 
  businessId: string, 
  username: string,
  password: string,
  dateFrom: string,
  dateTo: string
) {
  console.log(`Syncing appointments from ${dateFrom} to ${dateTo}...`);

  try {
    let allAppointments: any[] = [];
    
    // Get branches first - appointments require branchId per the API
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || 
                     (Array.isArray(branchData) ? branchData : []);
    console.log(`Found ${branches.length} branches for appointment sync`);
    
    // Fetch appointments per branch
    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      console.log(`Fetching appointments for branch: ${branch.name} (${branchId})`);
      
      try {
        const appointmentsData = await phorestRequest(
          `/branch/${branchId}/appointment?from_date=${dateFrom}&to_date=${dateTo}`,
          businessId,
          username,
          password
        );
        
        const appointments = appointmentsData._embedded?.appointments || 
                            appointmentsData.appointments || 
                            appointmentsData.page?.content || [];
        
        if (appointments.length > 0) {
          console.log(`Found ${appointments.length} appointments in branch ${branch.name}`);
          // Add branch info to each appointment
          const appointmentsWithBranch = appointments.map((apt: any) => ({
            ...apt,
            branchId,
            branchName: branch.name
          }));
          allAppointments = [...allAppointments, ...appointmentsWithBranch];
        }
      } catch (e: any) {
        console.log(`Appointments fetch failed for branch ${branchId}:`, e.message);
        // Continue with other branches even if one fails
      }
    }
    
    console.log(`Found ${allAppointments.length} total appointments across all branches`);

    // Get staff mappings
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id");

    const staffMap = new Map(staffMappings?.map((m: any) => [m.phorest_staff_id, m.user_id]) || []);

    // Get locations to map branch names to location IDs
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name");
    
    const locationMap = new Map<string, string>();
    locations?.forEach((loc: any) => {
      // Map various name formats to location ID
      locationMap.set(loc.name.toLowerCase(), loc.id);
      // Also try extracting location from Phorest branch name format: "Salon Name (North Mesa)"
      if (loc.name.toLowerCase().includes('mesa')) {
        locationMap.set('north mesa', loc.id);
        locationMap.set('mesa', loc.id);
      }
      if (loc.name.toLowerCase().includes('val vista') || loc.name.toLowerCase().includes('lakes')) {
        locationMap.set('val vista lakes', loc.id);
        locationMap.set('val vista', loc.id);
        locationMap.set('lakes', loc.id);
      }
    });

    let synced = 0;
    for (const apt of allAppointments) {
      const stylistUserId = staffMap.get(apt.staffId) || null;
      
      // Try different field names for appointment ID
      const phorestId = apt.appointmentId || apt.id || apt.appointmentid;
      
      if (!phorestId) {
        console.log(`Skipping appointment with no ID:`, JSON.stringify(apt).substring(0, 200));
        continue;
      }
      
      // Parse date - can come from various fields
      let appointmentDate = apt.date || apt.appointmentDate;
      if (!appointmentDate && apt.startTime) {
        // Check if startTime includes date (ISO format)
        if (apt.startTime.includes('T')) {
          appointmentDate = apt.startTime.split('T')[0];
        }
      }
      
      // Parse time - handle both ISO datetime and plain time formats
      let startTime = '09:00';
      let endTime = '10:00';
      
      if (apt.startTime) {
        if (apt.startTime.includes('T')) {
          startTime = apt.startTime.split('T')[1]?.substring(0, 5) || '09:00';
        } else if (apt.startTime.includes(':')) {
          startTime = apt.startTime.substring(0, 5);
        }
      }
      
      if (apt.endTime) {
        if (apt.endTime.includes('T')) {
          endTime = apt.endTime.split('T')[1]?.substring(0, 5) || '10:00';
        } else if (apt.endTime.includes(':')) {
          endTime = apt.endTime.substring(0, 5);
        }
      }
      
      if (!appointmentDate) {
        console.log(`Skipping appointment ${phorestId} - no date found`);
        continue;
      }
      
      // Map Phorest branch name to location ID
      let locationId: string | null = null;
      if (apt.branchName) {
        // Try to extract location from branch name like "Salon Name (North Mesa)"
        const match = apt.branchName.match(/\(([^)]+)\)/);
        if (match) {
          const extractedName = match[1].toLowerCase();
          locationId = locationMap.get(extractedName) || null;
        }
        if (!locationId) {
          locationId = locationMap.get(apt.branchName.toLowerCase()) || null;
        }
      }
      
      // Proactively look up if client exists in our database before inserting
      const phorestClientId = apt.clientId || apt.client?.clientId || null;
      let localClientId: string | null = null;
      
      if (phorestClientId) {
        const { data: existingClient } = await supabase
          .from("phorest_clients")
          .select("phorest_client_id")
          .eq("phorest_client_id", phorestClientId)
          .maybeSingle();
        
        if (existingClient) {
          localClientId = phorestClientId;
        } else {
          console.log(`Client ${phorestClientId} not found in local DB - appointment will have null client link`);
        }
      }

      // Debug: log first appointment's raw keys to identify available fields
      if (synced === 0) {
        console.log(`[DEBUG] First appointment raw keys:`, Object.keys(apt));
        console.log(`[DEBUG] First appointment activationState:`, apt.activationState, `status:`, apt.status);
      }

      // Map status using activationState (Phorest's actual field) with fallback to status
      let mappedStatus = mapPhorestStatus(apt.activationState || apt.status);
      
      // Time-based inference: if appointment is ACTIVE but in the past, mark as completed
      if (mappedStatus === 'booked' && appointmentDate) {
        const aptDateTime = new Date(`${appointmentDate}T${endTime || '23:59'}:00`);
        if (aptDateTime < new Date()) {
          mappedStatus = 'completed';
        }
      }

      const appointmentRecord: any = {
        phorest_id: phorestId,
        stylist_user_id: stylistUserId,
        phorest_staff_id: apt.staffId || apt.staff?.staffId,
        location_id: locationId,
        phorest_client_id: phorestClientId, // Always store raw Phorest client ID for analytics grouping
        client_name: apt.clientName || `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() || null,
        client_phone: apt.client?.mobile || apt.client?.phone || null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        service_name: apt.services?.[0]?.name || apt.serviceName || 'Unknown Service',
        service_category: apt.services?.[0]?.category || null,
        status: mappedStatus,
        total_price: apt.totalPrice || apt.price || null,
        notes: apt.notes || null,
        is_new_client: apt.isNewClient || false,
      };

      let { error } = await supabase
        .from("phorest_appointments")
        .upsert(appointmentRecord, { onConflict: 'phorest_id' });

      if (error) {
        console.log(`Failed to upsert appointment ${phorestId}:`, error.message);
      } else {
        synced++;
      }
    }

    return { total: allAppointments.length, synced };
  } catch (error) {
    console.error("Appointments sync error:", error);
    throw error;
  }
}

function mapPhorestStatus(phorestStatus: string): string {
  const statusMap: Record<string, string> = {
    // Phorest activationState values
    'ACTIVE': 'booked',
    'RESERVED': 'booked',
    'CANCELED': 'cancelled',
    // Legacy/future mappings (in case API changes)
    'CONFIRMED': 'confirmed',
    'CHECKED_IN': 'checked_in',
    'STARTED': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
    'NO_SHOW': 'no_show',
  };
  return statusMap[phorestStatus] || phorestStatus?.toLowerCase() || 'unknown';
}

async function syncClients(
  supabase: any, 
  businessId: string, 
  username: string,
  password: string
) {
  console.log("Syncing client data with branch/location info...");

  try {
    // Get branches first to fetch clients per-branch for location tracking
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || 
                     (Array.isArray(branchData) ? branchData : []);
    console.log(`Found ${branches.length} branches for client sync`);

    // Get staff mappings for preferred stylist
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id");

    const staffMap = new Map(staffMappings?.map((m: any) => [m.phorest_staff_id, m.user_id]) || []);

    // Fetch locations to map branch IDs to our location IDs
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name");
    
    // Create a map of branch names to location IDs (case-insensitive matching)
    const locationMap = new Map<string, string>();
    locations?.forEach((loc: any) => {
      locationMap.set(loc.name.toLowerCase(), loc.id);
    });

    // Track all clients across branches (client may visit multiple branches)
    const clientDataMap = new Map<string, any>();

    // Fetch clients from each branch to get branch-specific data
    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      const branchName = branch.name || 'Unknown';
      
      // Try to match branch to our locations table
      const locationId = locationMap.get(branchName.toLowerCase()) || null;
      
      console.log(`Fetching clients for branch: ${branchName} (${branchId}), mapped location: ${locationId}`);

      try {
        // Fetch clients for this branch with pagination
        let page = 0;
        let hasMore = true;
        let branchClientCount = 0;
        let totalExpected = 0;

        while (hasMore) {
          const clientsData = await phorestRequest(
            `/branch/${branchId}/client?size=200&page=${page}`, 
            businessId, 
            username, 
            password
          );
          const clients = clientsData._embedded?.clients || clientsData.clients || [];
          const pageInfo = clientsData.page || {};
          const totalPages = pageInfo.totalPages || 1;
          totalExpected = pageInfo.totalElements || totalExpected;

          branchClientCount += clients.length;
          console.log(`Branch ${branchName}: fetched page ${page + 1} of ${totalPages} (${clients.length} clients)`);

          for (const client of clients) {
            const clientId = client.clientId || client.id;
            
            if (clientDataMap.has(clientId)) {
              const existing = clientDataMap.get(clientId);
              const existingLastVisit = existing.lastAppointmentDate ? new Date(existing.lastAppointmentDate) : null;
              const newLastVisit = client.lastAppointmentDate ? new Date(client.lastAppointmentDate) : null;
              
              if (newLastVisit && (!existingLastVisit || newLastVisit > existingLastVisit)) {
                clientDataMap.set(clientId, {
                  ...client,
                  _branchId: branchId,
                  _branchName: branchName,
                  _locationId: locationId,
                });
              }
            } else {
              clientDataMap.set(clientId, {
                ...client,
                _branchId: branchId,
                _branchName: branchName,
                _locationId: locationId,
              });
            }
          }

          // Check if there are more pages
          if (clients.length === 0 || page + 1 >= totalPages || page >= 100) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(`Branch ${branchName}: ${branchClientCount} clients fetched (expected ${totalExpected})`);
      } catch (e: any) {
        console.log(`Failed to fetch clients for branch ${branchId}:`, e.message);
      }
    }

    // If no clients found via branch endpoints, fall back to global endpoint
    if (clientDataMap.size === 0) {
      console.log("Falling back to global client endpoint with pagination...");
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const clientsData = await phorestRequest(`/client?size=200&page=${page}`, businessId, username, password);
        const clients = clientsData._embedded?.clients || clientsData.clients || [];
        const pageInfo = clientsData.page || {};
        const totalPages = pageInfo.totalPages || 1;

        console.log(`Global endpoint: fetched page ${page + 1} of ${totalPages} (${clients.length} clients)`);

        for (const client of clients) {
          clientDataMap.set(client.clientId || client.id, client);
        }

        if (clients.length === 0 || page + 1 >= totalPages || page >= 100) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    console.log(`Total unique clients to sync: ${clientDataMap.size}`);

    let synced = 0;
    for (const [clientId, client] of clientDataMap) {
      const preferredStylistId = client.preferredStaffId 
        ? staffMap.get(client.preferredStaffId) 
        : null;

      const clientRecord: Record<string, any> = {
        phorest_client_id: clientId,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown',
        first_name: client.firstName || null,
        last_name: client.lastName || null,
        email: client.email || null,
        phone: client.mobile || client.phone || null,
        gender: client.gender || null,
        landline: client.landline || null,
        birthday: client.dateOfBirth || client.birthday || null,
        client_since: client.createdAt || null,
        visit_count: client.appointmentCount || 0,
        last_visit: client.lastAppointmentDate || null,
        first_visit: client.createdAt || null,
        preferred_stylist_id: preferredStylistId,
        total_spend: client.totalSpend || 0,
        is_vip: client.isVip || client.vipStatus === 'VIP' || false,
        notes: client.notes || null,
        client_category: client.clientCategory || null,
        referred_by: client.referredBy || null,
        address_line1: client.address?.streetAddress1 || client.streetAddress1 || null,
        address_line2: client.address?.streetAddress2 || client.streetAddress2 || null,
        city: client.address?.city || client.city || null,
        state: client.address?.state || client.state || null,
        zip: client.address?.zip || client.zip || null,
        country: client.address?.country || client.country || null,
        // Location fields
        location_id: client._locationId || null,
        phorest_branch_id: client._branchId || null,
        branch_name: client._branchName || null,
      };

      // Check for duplicates before upserting
      try {
        const { data: dupes } = await supabase.rpc('find_duplicate_phorest_clients', {
          p_email: clientRecord.email || null,
          p_phone: clientRecord.phone || null,
          p_exclude_phorest_client_id: clientId,
        });

        if (dupes && dupes.length > 0) {
          // This is a duplicate — flag it and link to canonical
          clientRecord.is_duplicate = true;
          clientRecord.canonical_client_id = dupes[0].id;
          console.log(`Duplicate detected: ${clientRecord.name} matches ${dupes[0].name} (${dupes[0].match_type})`);
        } else {
          clientRecord.is_duplicate = false;
          clientRecord.canonical_client_id = null;
        }
      } catch (dupErr: any) {
        console.log(`Dedup check failed for ${clientId}, proceeding without flag:`, dupErr.message);
        clientRecord.is_duplicate = false;
        clientRecord.canonical_client_id = null;
      }

      const { error } = await supabase
        .from("phorest_clients")
        .upsert(clientRecord, { onConflict: 'phorest_client_id' });

      if (!error) synced++;
      else console.log(`Failed to upsert client ${clientId}:`, error.message);
    }

    return { total: clientDataMap.size, synced };
  } catch (error) {
    console.error("Clients sync error:", error);
    throw error;
  }
}

async function syncPerformanceReports(
  supabase: any,
  businessId: string,
  username: string,
  password: string,
  weekStart: string
) {
  console.log(`Syncing performance reports for week starting ${weekStart}...`);

  try {
    // Calculate week end
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];

    // Get branches first - reports require branchId per the API
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || 
                     (Array.isArray(branchData) ? branchData : []);
    console.log(`Found ${branches.length} branches for performance report sync`);

    // Aggregate staff performance across all branches
    const staffPerformanceMap = new Map<string, any>();

    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      console.log(`Fetching performance report for branch: ${branch.name} (${branchId})`);

      try {
        const reportData = await phorestRequest(
          `/branch/${branchId}/report/staff-performance?from_date=${weekStart}&to_date=${weekEnd}`,
          businessId,
          username,
          password
        );

        const staffPerformance = reportData._embedded?.staffPerformance || 
                                 reportData.staffPerformance || 
                                 reportData.data || [];

        console.log(`Found ${staffPerformance.length} staff performance records in branch ${branch.name}`);

        for (const perf of staffPerformance) {
          const staffId = perf.staffId;
          if (staffPerformanceMap.has(staffId)) {
            // Aggregate metrics across branches
            const existing = staffPerformanceMap.get(staffId);
            staffPerformanceMap.set(staffId, {
              staffId,
              newClientCount: (existing.newClientCount || 0) + (perf.newClientCount || 0),
              clientRetentionRate: perf.clientRetentionRate || existing.clientRetentionRate || 0,
              retailSales: (existing.retailSales || 0) + (perf.retailSales || 0),
              extensionClientCount: (existing.extensionClientCount || 0) + (perf.extensionClientCount || 0),
              totalRevenue: (existing.totalRevenue || 0) + (perf.totalRevenue || perf.serviceRevenue || 0),
              appointmentCount: (existing.appointmentCount || 0) + (perf.appointmentCount || perf.serviceCount || 0),
              averageTicket: perf.averageTicket || existing.averageTicket || 0,
              rebookingRate: perf.rebookingRate || existing.rebookingRate || 0,
            });
          } else {
            staffPerformanceMap.set(staffId, perf);
          }
        }
      } catch (e: any) {
        console.log(`Performance report fetch failed for branch ${branchId}:`, e.message);
        // Continue with other branches
      }
    }

    console.log(`Found performance data for ${staffPerformanceMap.size} staff across all branches`);

    // Get staff mappings
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id");

    const staffMap = new Map(staffMappings?.map((m: any) => [m.phorest_staff_id, m.user_id]) || []);

    let synced = 0;
    for (const [staffId, perf] of staffPerformanceMap) {
      // Store data for ALL staff, not just mapped ones
      const userId = staffMap.get(staffId) || null;

      const metricsRecord = {
        phorest_staff_id: staffId,  // Always store with Phorest ID
        user_id: userId,            // Optional - linked later if mapped
        week_start: weekStart,
        new_clients: perf.newClientCount || 0,
        retention_rate: perf.clientRetentionRate || 0,
        retail_sales: perf.retailSales || 0,
        extension_clients: perf.extensionClientCount || 0,
        total_revenue: perf.totalRevenue || perf.serviceRevenue || 0,
        service_count: perf.appointmentCount || perf.serviceCount || 0,
        average_ticket: perf.averageTicket || 0,
        rebooking_rate: perf.rebookingRate || 0,
      };

      // Use phorest_staff_id + week_start as the unique key
      const { error } = await supabase
        .from("phorest_performance_metrics")
        .upsert(metricsRecord, { 
          onConflict: 'phorest_staff_id,week_start',
          ignoreDuplicates: false 
        });

      if (!error) synced++;
    }

    return { total: staffPerformanceMap.size, synced };
  } catch (error) {
    console.error("Performance reports sync error:", error);
    throw error;
  }
}

async function syncSalesTransactions(
  supabase: any,
  businessId: string,
  username: string,
  password: string,
  dateFrom: string,
  dateTo: string
) {
  console.log(`Syncing sales transactions from ${dateFrom} to ${dateTo}...`);

  try {
    // Get branches first
    const branchData = await phorestRequest("/branch", businessId, username, password);
    const branches = branchData._embedded?.branches || branchData.branches || [];
    
    // Get staff mappings
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id, phorest_branch_id");

    const staffMap = new Map<string, string>(staffMappings?.map((m: any) => [m.phorest_staff_id, m.user_id]) || []);

    let totalTransactions = 0;
    let syncedTransactions = 0;
    const dailySummaries = new Map<string, any>();

    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      const branchName = branch.name || 'Unknown';
      
      console.log(`Fetching sales for branch: ${branchName} (${branchId})`);

      let purchases: any[] = [];
      
      // Try multiple endpoints in order of preference
      // Phorest API has various endpoint formats depending on account permissions
      
      // 1. Try /purchase/search POST endpoint (requires POST with date filter)
      try {
        console.log(`Trying /purchase/search POST endpoint for branch ${branchId}...`);
        const purchaseData = await phorestPostRequest(
          `/branch/${branchId}/purchase/search`,
          businessId,
          username,
          password,
          { 
            startDate: dateFrom, 
            endDate: dateTo,
            page: 0,
            size: 500
          }
        );
        purchases = purchaseData._embedded?.purchases || purchaseData.purchases || 
                   purchaseData.page?.content || purchaseData.content || [];
        console.log(`/purchase/search endpoint returned ${purchases.length} records`);
      } catch (e1: any) {
        console.log(`/purchase/search endpoint failed: ${e1.message}`);
        
        // 2. Try CSV export job approach
        try {
          console.log(`Trying CSV export job for branch ${branchId}...`);
          purchases = await fetchSalesViaCsvExport(branchId, businessId, username, password, dateFrom, dateTo);
          console.log(`CSV export returned ${purchases.length} records`);
        } catch (e2: any) {
          console.log(`CSV export failed: ${e2.message}`);
          
          // 3. Try /report/sales endpoint 
          try {
            console.log(`Trying /report/sales endpoint for branch ${branchId}...`);
            const reportData = await phorestRequest(
              `/branch/${branchId}/report/sales?startDate=${dateFrom}&endDate=${dateTo}`,
              businessId,
              username,
              password
            );
            const salesItems = reportData.items || reportData.data || reportData._embedded?.items || [];
            purchases = salesItems.map((item: any) => ({
              purchaseId: item.id || item.transactionId || `${branchId}-${item.date}-${Math.random()}`,
              staffId: item.staffId,
              purchaseDate: item.date || item.saleDate,
              total: item.total || item.amount || item.revenue,
              items: [{
                type: item.type || 'service',
                name: item.name || item.description || 'Sale',
                price: item.total || item.amount || item.revenue,
                quantity: item.quantity || 1,
              }]
            }));
            console.log(`/report/sales endpoint returned ${purchases.length} records`);
          } catch (e3: any) {
            console.log(`/report/sales endpoint failed: ${e3.message}`);
            
            // 4. Try /staffperformance for aggregated sales data
            try {
              console.log(`Trying /staffperformance endpoint for branch ${branchId}...`);
              const perfData = await phorestRequest(
                `/branch/${branchId}/staffperformance?startDate=${dateFrom}&endDate=${dateTo}`,
                businessId,
                username,
                password
              );
              const staffPerf = perfData._embedded?.staffPerformances || perfData.staffPerformances || perfData.data || [];
              // staffperformance gives aggregates per staff, not individual transactions
              // But we can still track retail revenue per staff
              for (const perf of staffPerf) {
                if (perf.productRevenue > 0 || perf.retailRevenue > 0) {
                  purchases.push({
                    purchaseId: `${branchId}-${perf.staffId}-${dateFrom}-retail`,
                    staffId: perf.staffId,
                    purchaseDate: dateFrom,
                    total: perf.productRevenue || perf.retailRevenue || 0,
                    items: [{
                      type: 'product',
                      name: 'Retail Products (aggregated)',
                      price: perf.productRevenue || perf.retailRevenue || 0,
                      quantity: 1,
                    }]
                  });
                }
              }
              console.log(`/staffperformance endpoint found ${purchases.length} retail entries`);
            } catch (e4: any) {
              console.log(`All sales endpoints failed for branch ${branchId}. API permissions may not include transaction data export.`);
            }
          }
        }
      }
      
      console.log(`Processing ${purchases.length} transactions for ${branchName}`);
      totalTransactions += purchases.length;
      
      // Also save to detailed transaction items table
      if (purchases.length > 0) {
        const itemsSaved = await saveTransactionItems(supabase, purchases, branchId, branchName, staffMap);
        console.log(`Saved ${itemsSaved} items to phorest_transaction_items for ${branchName}`);
      }

      for (const purchase of purchases) {
        const staffId = purchase.staffId || purchase.staff?.staffId;
        const stylistUserId = staffId ? staffMap.get(staffId) : null;
        const transactionDate = purchase.purchaseDate?.split('T')[0] || purchase.createdAt?.split('T')[0] || purchase.date;
        const transactionTime = purchase.purchaseDate?.split('T')[1]?.substring(0, 8) || null;

        // Process line items
        const items = purchase.items || purchase.lineItems || purchase.services || [];
        
        for (const item of items) {
          const itemType = item.type?.toLowerCase() || 
                         (item.productId ? 'product' : 'service');
          const itemName = item.name || item.description || 'Unknown Item';
          const transactionId = `${purchase.purchaseId || purchase.id}-${item.itemId || item.id || itemName}`;

          const transactionRecord = {
            phorest_transaction_id: transactionId,
            stylist_user_id: stylistUserId,
            phorest_staff_id: staffId,
            location_id: branchId,
            branch_name: branchName,
            transaction_date: transactionDate,
            transaction_time: transactionTime,
            client_name: purchase.clientName || `${purchase.client?.firstName || ''} ${purchase.client?.lastName || ''}`.trim() || null,
            client_phone: purchase.client?.mobile || purchase.client?.phone || null,
            item_type: itemType,
            item_name: itemName,
            item_category: item.category || item.categoryName || null,
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || item.price || 0,
            discount_amount: item.discountAmount || item.discount || 0,
            tax_amount: item.taxAmount || item.tax || 0,
            total_amount: item.totalPrice || item.total || item.price || 0,
            payment_method: purchase.paymentMethod || purchase.payments?.[0]?.type || null,
          };

          const { error } = await supabase
            .from("phorest_sales_transactions")
            .upsert(transactionRecord, { onConflict: 'phorest_transaction_id,item_name' });

          if (!error) syncedTransactions++;

          // Aggregate for daily summary - store for ALL staff, not just mapped ones
          if (staffId && transactionDate) {
            const summaryKey = `${staffId}:${branchId}:${transactionDate}`;
            if (!dailySummaries.has(summaryKey)) {
              dailySummaries.set(summaryKey, {
                phorest_staff_id: staffId,   // Always store with Phorest ID
                user_id: stylistUserId || null, // Optional - linked later if mapped
                location_id: branchId,
                branch_name: branchName,
                summary_date: transactionDate,
                total_services: 0,
                total_products: 0,
                service_revenue: 0,
                product_revenue: 0,
                total_revenue: 0,
                total_transactions: 0,
                total_discounts: 0,
              });
            }
            
            const summary = dailySummaries.get(summaryKey);
            const amount = parseFloat(transactionRecord.total_amount) || 0;
            const discount = parseFloat(transactionRecord.discount_amount as any) || 0;
            
            if (itemType === 'product') {
              summary.total_products += transactionRecord.quantity;
              summary.product_revenue += amount;
            } else {
              summary.total_services += transactionRecord.quantity;
              summary.service_revenue += amount;
            }
            summary.total_revenue += amount;
            summary.total_transactions += 1;
            summary.total_discounts += discount;
          }
        }

        // If no line items, create a single transaction record
        if (items.length === 0 && (purchase.total || purchase.amount)) {
          const transactionRecord = {
            phorest_transaction_id: purchase.purchaseId || purchase.id,
            stylist_user_id: stylistUserId,
            phorest_staff_id: staffId,
            location_id: branchId,
            branch_name: branchName,
            transaction_date: transactionDate,
            transaction_time: transactionTime,
            client_name: purchase.clientName || null,
            client_phone: null,
            item_type: 'service',
            item_name: purchase.description || 'Transaction',
            item_category: null,
            quantity: 1,
            unit_price: purchase.total || purchase.amount || 0,
            discount_amount: purchase.discountAmount || 0,
            tax_amount: purchase.taxAmount || 0,
            total_amount: purchase.total || purchase.amount || 0,
            payment_method: purchase.paymentMethod || null,
          };

          const { error } = await supabase
            .from("phorest_sales_transactions")
            .upsert(transactionRecord, { onConflict: 'phorest_transaction_id,item_name' });

          if (!error) syncedTransactions++;
          
          // Also add to daily summary
          if (staffId && transactionDate) {
            const summaryKey = `${staffId}:${branchId}:${transactionDate}`;
            if (!dailySummaries.has(summaryKey)) {
              dailySummaries.set(summaryKey, {
                phorest_staff_id: staffId,
                user_id: stylistUserId || null,
                location_id: branchId,
                branch_name: branchName,
                summary_date: transactionDate,
                total_services: 0,
                total_products: 0,
                service_revenue: 0,
                product_revenue: 0,
                total_revenue: 0,
                total_transactions: 0,
                total_discounts: 0,
              });
            }
            const summary = dailySummaries.get(summaryKey);
            summary.total_services += 1;
            summary.service_revenue += (purchase.total || purchase.amount || 0);
            summary.total_revenue += (purchase.total || purchase.amount || 0);
            summary.total_transactions += 1;
          }
        }
      }
    }

    // Upsert daily summaries
    let summariesSynced = 0;
    for (const summary of dailySummaries.values()) {
      // Calculate average ticket
      summary.average_ticket = summary.total_transactions > 0 
        ? summary.total_revenue / summary.total_transactions 
        : 0;

      // Use phorest_staff_id + location + date as the unique key
      const { error } = await supabase
        .from("phorest_daily_sales_summary")
        .upsert(summary, { 
          onConflict: 'phorest_staff_id,location_id,summary_date',
          ignoreDuplicates: false 
        });

      if (!error) summariesSynced++;
    }

    console.log(`Synced ${syncedTransactions} transaction items, ${summariesSynced} daily summaries`);

    return { 
      total_transactions: totalTransactions, 
      synced_items: syncedTransactions,
      daily_summaries: summariesSynced 
    };
  } catch (error) {
    console.error("Sales sync error:", error);
    throw error;
  }
}

// Helper function to fetch sales via CSV export job with multiple job type fallbacks
async function fetchSalesViaCsvExport(
  branchId: string,
  businessId: string,
  username: string,
  password: string,
  dateFrom: string,
  dateTo: string
): Promise<any[]> {
  // Valid CSV export job types per Phorest API documentation:
  // TRANSACTIONS_CSV is the main one for transaction data
  // Other valid types: SUNDRIES_CSV, CLIENT_COURSES_CSV, DATEV_CSV
  const jobTypesToTry = ['TRANSACTIONS_CSV'];
  
  let lastError: Error | null = null;
  
  for (const jobType of jobTypesToTry) {
    try {
      console.log(`[CSV Export] Attempting job type: ${jobType} for branch ${branchId}`);
      console.log(`[CSV Export] Date range: ${dateFrom} to ${dateTo}`);
      
      // Step 1: Create CSV export job
      const jobBody = { 
        jobType,
        startDate: dateFrom,
        endDate: dateTo
      };
      
      console.log(`[CSV Export] Creating job with body:`, JSON.stringify(jobBody));
      
      const exportJob = await phorestPostRequest(
        `/branch/${branchId}/csvexportjob`,
        businessId,
        username,
        password,
        jobBody
      );
      
      console.log(`[CSV Export] Job creation response:`, JSON.stringify(exportJob).substring(0, 500));
      
      const jobId = exportJob.jobId || exportJob.id;
      if (!jobId) {
        console.log(`[CSV Export] No job ID in response for type ${jobType}, trying next...`);
        continue;
      }
      
      console.log(`[CSV Export] Job created successfully: ${jobId} (type: ${jobType})`);
      
      // Step 2: Poll for completion with enhanced logging
      let status = "PENDING";
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max (60 * 2s)
      let jobStatusResponse: any = null;
      
      while (!["DONE", "COMPLETED", "READY"].includes(status.toUpperCase()) && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
        
        try {
          jobStatusResponse = await phorestRequest(
            `/branch/${branchId}/csvexportjob/${jobId}`,
            businessId,
            username,
            password
          );
          
          status = (jobStatusResponse.status || jobStatusResponse.state || "").toUpperCase();
          
          if (attempts % 5 === 0) { // Log every 10 seconds
            console.log(`[CSV Export] Job ${jobId} status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
          }
          
          if (["FAILED", "ERROR", "CANCELLED"].includes(status)) {
            const errorMsg = jobStatusResponse.errorMessage || jobStatusResponse.error || 'Unknown error';
            console.log(`[CSV Export] Job failed with status ${status}: ${errorMsg}`);
            throw new Error(`CSV export job failed: ${errorMsg}`);
          }
        } catch (pollError: any) {
          console.log(`[CSV Export] Poll request failed: ${pollError.message}`);
          // Continue polling - might be a transient error
        }
        
        attempts++;
      }
      
      if (!["DONE", "COMPLETED", "READY"].includes(status.toUpperCase())) {
        console.log(`[CSV Export] Job ${jobId} timed out after ${maxAttempts * 2} seconds with status: ${status}`);
        continue; // Try next job type
      }
      
      console.log(`[CSV Export] Job ${jobId} completed successfully, downloading CSV...`);
      
      // Step 3: Download CSV with retry
      let csvText = '';
      let downloadAttempts = 0;
      const maxDownloadAttempts = 3;
      
      while (downloadAttempts < maxDownloadAttempts) {
        try {
          csvText = await phorestRequestText(
            `/branch/${branchId}/csvexportjob/${jobId}/download`,
            businessId,
            username,
            password
          );
          
          console.log(`[CSV Export] Downloaded ${csvText.length} characters`);
          console.log(`[CSV Export] First 500 chars: ${csvText.substring(0, 500)}`);
          break;
        } catch (downloadError: any) {
          downloadAttempts++;
          console.log(`[CSV Export] Download attempt ${downloadAttempts} failed: ${downloadError.message}`);
          if (downloadAttempts < maxDownloadAttempts) {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!csvText || csvText.length === 0) {
        console.log(`[CSV Export] Empty CSV response for job type ${jobType}`);
        continue; // Try next job type
      }
      
      // Step 4: Parse CSV
      const transactions = parseSalesCsv(csvText, branchId);
      console.log(`[CSV Export] Parsed ${transactions.length} transactions from CSV (job type: ${jobType})`);
      
      if (transactions.length > 0) {
        return transactions;
      }
      
      // If no transactions found, try next job type
      console.log(`[CSV Export] No transactions found with job type ${jobType}, trying next...`);
      
    } catch (error: any) {
      lastError = error;
      console.log(`[CSV Export] Job type ${jobType} failed: ${error.message}`);
      // Continue to next job type
    }
  }
  
  // All job types failed
  throw lastError || new Error('All CSV export job types failed');
}

// Parse CSV text into transaction records with flexible column mapping
function parseSalesCsv(csvText: string, branchId: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    console.log(`[CSV Parser] Not enough lines in CSV: ${lines.length}`);
    return [];
  }
  
  // Parse header to get column indices
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  console.log(`[CSV Parser] Headers found: ${headers.join(', ')}`);
  
  // Flexible column mapping - try multiple possible names
  const getIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = headers.findIndex(h => h.includes(normalizedName) || normalizedName.includes(h));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  
  // Column mappings with multiple possible Phorest CSV header names
  const idxTransactionId = getIndex(['transactionid', 'transaction', 'purchaseid', 'purchase', 'saleid', 'sale', 'id', 'receiptno', 'invoiceno']);
  const idxStaffId = getIndex(['staffid', 'staff', 'employeeid', 'employee', 'therapistid', 'therapist', 'stylistid', 'stylist']);
  const idxStaffName = getIndex(['staffname', 'employeename', 'therapistname', 'stylistname']);
  const idxDate = getIndex(['date', 'transactiondate', 'purchasedate', 'saledate', 'completeddate', 'created']);
  const idxTime = getIndex(['time', 'transactiontime']);
  const idxAmount = getIndex(['amount', 'total', 'price', 'revenue', 'value', 'nettotal', 'grosstotal', 'totalamount']);
  const idxType = getIndex(['type', 'itemtype', 'category', 'producttype', 'servicetype', 'linetype']);
  const idxName = getIndex(['name', 'description', 'item', 'service', 'product', 'itemname', 'servicename', 'productname']);
  const idxClientId = getIndex(['clientid', 'client', 'customerid', 'customer']);
  const idxClientName = getIndex(['clientname', 'customername', 'firstname', 'fullname']);
  const idxQuantity = getIndex(['quantity', 'qty', 'count']);
  const idxDiscount = getIndex(['discount', 'discountamount', 'discountvalue']);
  const idxTax = getIndex(['tax', 'taxamount', 'vat']);
  
  console.log(`[CSV Parser] Column indices: transactionId=${idxTransactionId}, staffId=${idxStaffId}, date=${idxDate}, amount=${idxAmount}, type=${idxType}, name=${idxName}`);
  
  const transactions: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 3) continue;
      
      // Extract date - handle various formats
      let transactionDate = idxDate >= 0 ? values[idxDate] : null;
      if (transactionDate) {
        // Try to normalize date format (could be DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
        if (transactionDate.includes('/')) {
          const parts = transactionDate.split('/');
          if (parts.length === 3) {
            // Assume DD/MM/YYYY for UK/EU or MM/DD/YYYY for US
            // Phorest is Irish, so likely DD/MM/YYYY
            if (parseInt(parts[2]) > 100) {
              transactionDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
      }
      
      const transaction = {
        purchaseId: idxTransactionId >= 0 && values[idxTransactionId] 
          ? values[idxTransactionId] 
          : `csv-${branchId}-${i}-${Date.now()}`,
        staffId: idxStaffId >= 0 ? values[idxStaffId] : null,
        staffName: idxStaffName >= 0 ? values[idxStaffName] : null,
        purchaseDate: transactionDate,
        purchaseTime: idxTime >= 0 ? values[idxTime] : null,
        total: idxAmount >= 0 ? parseFloat(values[idxAmount]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
        clientId: idxClientId >= 0 ? values[idxClientId] : null,
        clientName: idxClientName >= 0 ? values[idxClientName] : null,
        items: [{
          type: idxType >= 0 ? (values[idxType]?.toLowerCase() || 'service') : 'service',
          name: idxName >= 0 ? (values[idxName] || 'Transaction') : 'Transaction',
          price: idxAmount >= 0 ? parseFloat(values[idxAmount]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
          quantity: idxQuantity >= 0 ? parseInt(values[idxQuantity]) || 1 : 1,
          discount: idxDiscount >= 0 ? parseFloat(values[idxDiscount]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
          tax: idxTax >= 0 ? parseFloat(values[idxTax]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
        }]
      };
      
      // Only add if we have meaningful data
      if (transaction.purchaseDate || transaction.total > 0) {
        transactions.push(transaction);
      }
    } catch (lineError: any) {
      console.log(`[CSV Parser] Error parsing line ${i}: ${lineError.message}`);
      // Continue with next line
    }
  }
  
  return transactions;
}

// Helper to parse CSV line handling quoted values and escaped quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function logSync(
  supabase: any,
  syncType: string,
  status: string,
  recordsSynced: number,
  errorMessage?: string,
  metadata?: any,
  apiEndpoint?: string,
  responseSample?: string,
  retryCount?: number
) {
  await supabase.from("phorest_sync_log").insert({
    sync_type: syncType,
    status,
    records_synced: recordsSynced,
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
    metadata: metadata || {},
    api_endpoint: apiEndpoint,
    response_sample: responseSample?.substring(0, 1000), // Limit sample size
    retry_count: retryCount || 0,
  });
}

// Helper function to save transaction items to the new detailed table
async function saveTransactionItems(
  supabase: any,
  transactions: any[],
  branchId: string,
  branchName: string,
  staffMap: Map<string, string>
): Promise<number> {
  let savedCount = 0;
  
  for (const transaction of transactions) {
    const staffId = transaction.staffId;
    const stylistUserId = staffId ? staffMap.get(staffId) : null;
    const transactionDate = transaction.purchaseDate?.split('T')[0];
    
    if (!transactionDate) continue;
    
    for (const item of transaction.items || []) {
      const itemRecord = {
        transaction_id: transaction.purchaseId,
        phorest_staff_id: staffId,
        stylist_user_id: stylistUserId,
        phorest_client_id: transaction.clientId,
        client_name: transaction.clientName,
        location_id: branchId,
        branch_name: branchName,
        transaction_date: transactionDate,
        item_type: item.type || 'service',
        item_name: item.name || 'Unknown Item',
        item_category: item.category || null,
        quantity: item.quantity || 1,
        unit_price: item.price || 0,
        discount: item.discount || 0,
        total_amount: (item.price || 0) * (item.quantity || 1) - (item.discount || 0),
      };
      
      const { error } = await supabase
        .from('phorest_transaction_items')
        .upsert(itemRecord, { onConflict: 'transaction_id,item_name,item_type' });
      
      if (!error) savedCount++;
    }
  }
  
  return savedCount;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const businessId = Deno.env.get("PHOREST_BUSINESS_ID")!;
    const username = Deno.env.get("PHOREST_USERNAME")!;
    const password = Deno.env.get("PHOREST_API_KEY")!;

    if (!businessId || !username || !password) {
      return new Response(
        JSON.stringify({ error: "Phorest API credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { sync_type, date_from, date_to, quick }: SyncRequest = await req.json();

    console.log(`Starting Phorest sync: ${sync_type}${quick ? ' (quick mode)' : ''}`);

    // Default date range for appointments
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Quick mode: only sync today + 7 days for appointments (for frequent syncs)
    // Full mode: use provided dates or default range
    let defaultFrom: string;
    let defaultTo: string;
    
    if (quick) {
      defaultFrom = todayStr;
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      defaultTo = weekFromNow.toISOString().split('T')[0];
    } else {
      defaultFrom = date_from || todayStr;
      const defaultToDate = new Date(today);
      defaultToDate.setDate(defaultToDate.getDate() + 7);
      defaultTo = date_to || defaultToDate.toISOString().split('T')[0];
    }

    // Get the Monday of this week for performance reports
    const thisMonday = new Date();
    thisMonday.setDate(thisMonday.getDate() - thisMonday.getDay() + 1);
    const weekStart = thisMonday.toISOString().split('T')[0];

    const results: any = {};

    // Helper function to notify on failure (called in background, doesn't block)
    const notifyFailure = async (syncType: string, errorMsg: string) => {
      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-sync-failure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            sync_type: syncType,
            error_message: errorMsg,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error('Failed to send failure notification:', e);
      }
    };

    if (sync_type === 'staff' || sync_type === 'all') {
      try {
        results.staff = await syncStaff(supabase, businessId, username, password);
        await logSync(supabase, 'staff', 'success', results.staff.mapped);
      } catch (error: any) {
        results.staff = { error: error.message };
        await logSync(supabase, 'staff', 'failed', 0, error.message);
        notifyFailure('staff', error.message);
      }
    }

    if (sync_type === 'appointments' || sync_type === 'all') {
      try {
        results.appointments = await syncAppointments(supabase, businessId, username, password, defaultFrom, defaultTo);
        await logSync(supabase, 'appointments', 'success', results.appointments.synced);
      } catch (error: any) {
        results.appointments = { error: error.message };
        await logSync(supabase, 'appointments', 'failed', 0, error.message);
        notifyFailure('appointments', error.message);
      }
    }

    if (sync_type === 'clients' || sync_type === 'all') {
      try {
        results.clients = await syncClients(supabase, businessId, username, password);
        await logSync(supabase, 'clients', 'success', results.clients.synced);
        
        // Auto-calculate preferred stylists after client sync
        try {
          const { data: updateCount, error: calcError } = await supabase.rpc('update_preferred_stylists');
          if (calcError) {
            console.error('Failed to calculate preferred stylists:', calcError.message);
          } else {
            console.log(`Updated ${updateCount} clients with calculated preferred stylist`);
            results.clients.preferred_stylists_updated = updateCount;
          }
        } catch (calcErr: any) {
          console.error('Preferred stylist calculation failed:', calcErr.message);
        }
      } catch (error: any) {
        results.clients = { error: error.message };
        await logSync(supabase, 'clients', 'failed', 0, error.message);
        notifyFailure('clients', error.message);
      }
    }

    if (sync_type === 'reports' || sync_type === 'all') {
      try {
        results.reports = await syncPerformanceReports(supabase, businessId, username, password, weekStart);
        await logSync(supabase, 'reports', 'success', results.reports.synced);
      } catch (error: any) {
        results.reports = { error: error.message };
        await logSync(supabase, 'reports', 'failed', 0, error.message);
        notifyFailure('reports', error.message);
      }
    }

    if (sync_type === 'sales' || sync_type === 'all') {
      try {
        // Quick mode: just today's sales
        // Full mode: last 30 days for sales
        let salesFrom: string;
        let salesTo: string;
        
        if (quick) {
          salesFrom = todayStr;
          salesTo = todayStr;
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          salesFrom = date_from || thirtyDaysAgo.toISOString().split('T')[0];
          salesTo = date_to || new Date().toISOString().split('T')[0];
        }
        
        results.sales = await syncSalesTransactions(supabase, businessId, username, password, salesFrom, salesTo);
        await logSync(supabase, 'sales', 'success', results.sales.synced_items, undefined, { quick });
      } catch (error: any) {
        results.sales = { error: error.message };
        await logSync(supabase, 'sales', 'failed', 0, error.message);
        notifyFailure('sales', error.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in sync-phorest-data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});