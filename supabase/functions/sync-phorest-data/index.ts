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
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const baseUrls = [
    PHOREST_BASE_URL,
    "https://platform-us.phorest.com/third-party-api-server/api",
  ];

  for (const base of baseUrls) {
    const url = `${base}/business/${businessId}${endpoint}`;
    console.log(`Phorest request: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (response.status === 302 || response.status === 301) {
      await response.text();
      continue;
    }

    if (!response.ok) {
      // If 404 and we have another base to try, continue
      if (response.status === 404 && base === PHOREST_BASE_URL) {
        await response.text();
        continue;
      }
      const errorText = await response.text();
      console.error(`Phorest API error (${response.status}):`, errorText);
      throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
  
  throw new Error('Phorest API GET: all base URLs failed');
}

// POST request helper for CSV export jobs
async function phorestPostRequest(endpoint: string, businessId: string, username: string, password: string, body: object) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  const authHeaders = {
    "Authorization": `Basic ${basicAuth}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Try EU first (default), then US if we get a 302
  const baseUrls = [
    PHOREST_BASE_URL,
    "https://platform-us.phorest.com/third-party-api-server/api",
  ];

  for (const base of baseUrls) {
    const url = `${base}/business/${businessId}${endpoint}`;
    console.log(`Phorest POST request: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    if (response.status === 302 || response.status === 301) {
      const errorText = await response.text();
      console.log(`Phorest POST got ${response.status} from ${base}, trying next base URL...`);
      continue; // Try next base URL
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Phorest API POST error (${response.status}):`, errorText);
      throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
  
  throw new Error('Phorest API POST: all base URLs returned redirects');
}

// Fetch raw text (for CSV downloads)
async function phorestRequestText(endpoint: string, businessId: string, username: string, password: string) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);
  
  // Try EU first, then US (CSV download may also need US endpoint)
  const baseUrls = [
    PHOREST_BASE_URL,
    "https://platform-us.phorest.com/third-party-api-server/api",
  ];

  for (const base of baseUrls) {
    const url = `${base}/business/${businessId}${endpoint}`;
    console.log(`Phorest request (text): ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "text/csv,application/json",
      },
    });

    if (response.status === 302 || response.status === 301) {
      await response.text();
      console.log(`Phorest GET text got ${response.status} from ${base}, trying next...`);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Phorest API error (${response.status}):`, errorText);
      throw new Error(`Phorest API error: ${response.status} - ${errorText}`);
    }

    return response.text();
  }
  
  throw new Error('Phorest API GET text: all base URLs returned redirects');
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

    // Log full shape of first staff object to confirm photo field name
    if (uniqueStaff.length > 0) {
      console.log("Sample staff object keys:", Object.keys(uniqueStaff[0]));
      const sample = uniqueStaff[0];
      console.log("Photo field candidates:", {
        photo: sample.photo,
        photoUrl: sample.photoUrl,
        photoURL: sample.photoURL,
        imageUrl: sample.imageUrl,
        image: sample.image,
        avatarUrl: sample.avatarUrl,
        avatar: sample.avatar,
        pictureUrl: sample.pictureUrl,
        picture: sample.picture,
      });
    }

    // Get existing mappings
    const { data: existingMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id, phorest_photo_url");

    const mappingsByPhorestId = new Map(
      (existingMappings || []).map((m: any) => [m.phorest_staff_id, m])
    );

    // Update phorest_photo_url for all mapped staff
    let photosUpdated = 0;
    let profilePhotosPopulated = 0;

    for (const s of uniqueStaff) {
      const phorestId = s.staffId || s.id;
      const photoUrl = s.photo || s.photoUrl || s.photoURL || s.imageUrl || s.image || s.avatarUrl || s.avatar || s.pictureUrl || s.picture || null;

      if (!photoUrl) continue;

      // Update phorest_photo_url on mapping table
      const existing = mappingsByPhorestId.get(phorestId);
      if (existing) {
        // Always refresh the Phorest photo URL
        const { error: updateErr } = await supabase
          .from("phorest_staff_mapping")
          .update({ phorest_photo_url: photoUrl })
          .eq("phorest_staff_id", phorestId);

        if (!updateErr) photosUpdated++;

        // Auto-populate employee_profiles.photo_url if currently null
        if (existing.user_id) {
          const { data: profile } = await supabase
            .from("employee_profiles")
            .select("photo_url")
            .eq("user_id", existing.user_id)
            .maybeSingle();

          if (profile && !profile.photo_url) {
            const { error: profileErr } = await supabase
              .from("employee_profiles")
              .update({ photo_url: photoUrl })
              .eq("user_id", existing.user_id);

            if (!profileErr) profilePhotosPopulated++;
          }
        }
      }
    }

    console.log(`Photo sync: ${photosUpdated} mapping photos updated, ${profilePhotosPopulated} profile photos populated`);

    const mappedIds = new Set(mappingsByPhorestId.keys());

    // Return staff that aren't mapped yet
    const unmappedStaff = uniqueStaff.filter((s: any) => !mappedIds.has(s.staffId || s.id));

    return {
      total_staff: uniqueStaff.length,
      mapped: mappedIds.size,
      unmapped: unmappedStaff.length,
      photos_updated: photosUpdated,
      profile_photos_populated: profilePhotosPopulated,
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
    
    // Split date range into 30-day chunks (Phorest max is 31 days)
    const dateChunks: { from: string; to: string }[] = [];
    {
      let chunkStart = new Date(dateFrom);
      const endDate = new Date(dateTo);
      while (chunkStart < endDate) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setDate(chunkEnd.getDate() + 30);
        if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());
        dateChunks.push({
          from: chunkStart.toISOString().split('T')[0],
          to: chunkEnd.toISOString().split('T')[0],
        });
        chunkStart = new Date(chunkEnd);
        chunkStart.setDate(chunkStart.getDate() + 1);
      }
    }
    if (dateChunks.length > 1) {
      console.log(`Date range split into ${dateChunks.length} chunks (Phorest 31-day limit)`);
    }

    // Fetch appointments per branch with pagination, chunked by date range
    for (const branch of branches) {
      const branchId = branch.branchId || branch.id;
      console.log(`Fetching appointments for branch: ${branch.name} (${branchId})`);
      
      try {
        let branchTotal = 0;
        
        for (const chunk of dateChunks) {
          let page = 0;
          let hasMore = true;
          
          while (hasMore) {
            const appointmentsData = await phorestRequest(
              `/branch/${branchId}/appointment?from_date=${chunk.from}&to_date=${chunk.to}&size=100&page=${page}`,
              businessId,
              username,
              password
            );
            
            const appointments = appointmentsData._embedded?.appointments || 
                                appointmentsData.appointments || 
                                appointmentsData.page?.content || [];
            
            if (appointments.length > 0) {
              const appointmentsWithBranch = appointments.map((apt: any) => ({
                ...apt,
                branchId,
                branchName: branch.name
              }));
              allAppointments = [...allAppointments, ...appointmentsWithBranch];
              branchTotal += appointments.length;
            }
            
            // Check if more pages exist
            const totalPages = appointmentsData.page?.totalPages || 1;
            page++;
            hasMore = page < totalPages;
            
            // Safety: also stop if we got fewer results than page size (last page)
            if (appointments.length < 100) {
              hasMore = false;
            }
          }
        }
        
        if (branchTotal > 0) {
          console.log(`Found ${branchTotal} appointments in branch ${branch.name}`);
        }
      } catch (e: any) {
        console.log(`Appointments fetch failed for branch ${branchId}:`, e.message);
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
      const locNameLower = loc.name.toLowerCase().trim();
      // Map exact location name
      locationMap.set(locNameLower, loc.id);
      // Also map individual words from the location name for fuzzy matching
      // e.g. "North Mesa" → also maps "mesa", "north"
      locNameLower.split(/\s+/).forEach((word: string) => {
        if (word.length > 2 && !locationMap.has(word)) {
          locationMap.set(word, loc.id);
        }
      });
    });

    // Pre-fetch soft-deleted appointment IDs to prevent resurrection
    const { data: deletedAppointments } = await supabase
      .from("phorest_appointments")
      .select("phorest_id")
      .not("deleted_at", "is", null)
      .gte("appointment_date", dateFrom)
      .lte("appointment_date", dateTo);

    const deletedPhorestIds = new Set(
      deletedAppointments?.map((a: any) => a.phorest_id) || []
    );
    console.log(`Found ${deletedPhorestIds.size} soft-deleted appointments to protect`);

    // Pre-fetch all known phorest client IDs in one batch query
    const allClientIds = [...new Set(
      allAppointments
        .map((apt: any) => apt.clientId || apt.client?.clientId)
        .filter(Boolean)
    )];
    
    const knownClientIds = new Set<string>();
    // Query in batches of 500 to avoid URL length limits
    for (let i = 0; i < allClientIds.length; i += 500) {
      const batch = allClientIds.slice(i, i + 500);
      const { data: existingClients } = await supabase
        .from("phorest_clients")
        .select("phorest_client_id")
        .in("phorest_client_id", batch);
      existingClients?.forEach((c: any) => knownClientIds.add(c.phorest_client_id));
    }

    let synced = 0;
    let debugLogged = false;
    const upsertBatch: any[] = [];
    
    for (const apt of allAppointments) {
      const stylistUserId = staffMap.get(apt.staffId) || null;
      
      // Try different field names for appointment ID
      const phorestId = apt.appointmentId || apt.id || apt.appointmentid;

      // Skip soft-deleted appointments to preserve local operational decisions
      if (phorestId && deletedPhorestIds.has(phorestId)) {
        continue;
      }
      
      if (!phorestId) {
        continue;
      }
      
      // Parse date - can come from various fields
      let appointmentDate = apt.date || apt.appointmentDate;
      if (!appointmentDate && apt.startTime) {
        if (apt.startTime.includes('T')) {
          appointmentDate = apt.startTime.split('T')[0];
        }
      }
      
      // Parse time
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
        continue;
      }
      
      // Map Phorest branch name to location ID
      let locationId: string | null = null;
      if (apt.branchName) {
        const match = apt.branchName.match(/\(([^)]+)\)/);
        if (match) {
          const extractedName = match[1].toLowerCase();
          locationId = locationMap.get(extractedName) || null;
        }
        if (!locationId) {
          locationId = locationMap.get(apt.branchName.toLowerCase()) || null;
        }
      }
      
      const phorestClientId = apt.clientId || apt.client?.clientId || null;

      // Debug: log first appointment's raw keys
      if (!debugLogged) {
        console.log(`[DEBUG] First appointment raw keys:`, Object.keys(apt));
        console.log(`[DEBUG] First appointment activationState:`, apt.activationState, `status:`, apt.status);
        if (apt.services && apt.services.length > 1) {
          console.log(`[DEBUG] Multi-service appointment detected: ${apt.services.length} services in appointment ${phorestId}`);
        }
        debugLogged = true;
      }

      // Map status
      let mappedStatus = mapPhorestStatus(apt.activationState || apt.status);
      
      // NOTE: Time-based completion inference removed — Phorest's activationState
      // is the source of truth. new Date() in Deno is UTC which caused premature
      // "completed" badges for appointments still in the org's local future.

      upsertBatch.push({
        phorest_id: phorestId,
        stylist_user_id: stylistUserId,
        phorest_staff_id: apt.staffId || apt.staff?.staffId,
        location_id: locationId,
        phorest_client_id: phorestClientId,
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
      });
    }

    // Batch upsert in chunks of 200
    for (let i = 0; i < upsertBatch.length; i += 200) {
      const chunk = upsertBatch.slice(i, i + 200);
      const { error } = await supabase
        .from("phorest_appointments")
        .upsert(chunk, { onConflict: 'phorest_id' });

      if (error) {
        console.log(`Failed to batch upsert appointments (batch ${Math.floor(i/200)+1}):`, error.message);
      } else {
        synced += chunk.length;
      }
    }
    
    console.log(`Synced ${synced} of ${upsertBatch.length} appointments (${allAppointments.length} fetched from API)`);

    // ── Post-sync: Backfill client names from phorest_clients ──
    try {
      // Find appointments missing client_name but having a phorest_client_id
      const { data: missingNames } = await supabase
        .from('phorest_appointments')
        .select('id, phorest_client_id')
        .is('client_name', null)
        .not('phorest_client_id', 'is', null)
        .limit(1000);

      if (missingNames && missingNames.length > 0) {
        const clientIds = [...new Set(missingNames.map(a => a.phorest_client_id).filter(Boolean))];
        const clientNameMap = new Map<string, string>();

        // Batch-fetch client names
        for (let i = 0; i < clientIds.length; i += 100) {
          const chunk = clientIds.slice(i, i + 100);
          const { data: clients } = await supabase
            .from('phorest_clients')
            .select('phorest_client_id, name, first_name, last_name')
            .in('phorest_client_id', chunk);

          (clients ?? []).forEach(c => {
            const resolvedName = c.name || [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
            if (resolvedName) {
              clientNameMap.set(c.phorest_client_id, resolvedName);
            }
          });
        }

        // Bulk-update appointments with resolved names
        let backfilled = 0;
        for (const apt of missingNames) {
          const name = clientNameMap.get(apt.phorest_client_id!);
          if (name) {
            await supabase
              .from('phorest_appointments')
              .update({ client_name: name })
              .eq('id', apt.id);
            backfilled++;
          }
        }
        console.log(`Backfilled ${backfilled} client names from phorest_clients (${missingNames.length} had missing names)`);
      }

      // Mark true walk-ins (no client ID at all)
      const { count: walkInCount } = await supabase
        .from('phorest_appointments')
        .update({ is_walk_in: true })
        .is('phorest_client_id', null)
        .eq('is_walk_in', false)
        .select('id', { count: 'exact', head: true });

      if (walkInCount && walkInCount > 0) {
        console.log(`Marked ${walkInCount} appointments as walk-ins (no client ID)`);
      }
    } catch (backfillError) {
      console.error('Client name backfill error (non-fatal):', backfillError);
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

    // Process all branches in parallel for CSV export
    const branchResults = await Promise.all(branches.map(async (branch: any) => {
      const branchId = branch.branchId || branch.id;
      const branchName = branch.name || 'Unknown';
      
      console.log(`Fetching sales for branch: ${branchName} (${branchId})`);

      let purchases: any[] = [];
      
      // Try CSV export first, then fall back to other endpoints
      try {
        console.log(`Trying CSV export job for branch ${branchId}...`);
        purchases = await fetchSalesViaCsvExport(branchId, businessId, username, password, dateFrom, dateTo);
        console.log(`CSV export returned ${purchases.length} records`);
        if (purchases.length > 0) {
          console.log(`[CSV Export] Sample record keys: ${JSON.stringify(Object.keys(purchases[0]))}`);
          console.log(`[CSV Export] First 3 records: ${JSON.stringify(purchases.slice(0, 3)).substring(0, 1000)}`);
        }
      } catch (e1: any) {
        console.log(`CSV export failed: ${e1.message}`);
        
        try {
          console.log(`Trying /purchase/search POST endpoint for branch ${branchId}...`);
          const purchaseData = await phorestPostRequest(
            `/branch/${branchId}/purchase/search`,
            businessId,
            username,
            password,
            { startDate: dateFrom, endDate: dateTo, page: 0, size: 500 }
          );
          purchases = purchaseData._embedded?.purchases || purchaseData.purchases || 
                     purchaseData.page?.content || purchaseData.content || [];
          console.log(`/purchase/search endpoint returned ${purchases.length} records`);
        } catch (e2: any) {
          console.log(`/purchase/search endpoint failed: ${e2.message}`);
          
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
            
            try {
              console.log(`Trying /staffperformance endpoint for branch ${branchId}...`);
              const perfData = await phorestRequest(
                `/branch/${branchId}/staffperformance?startDate=${dateFrom}&endDate=${dateTo}`,
                businessId,
                username,
                password
              );
              const staffPerf = perfData._embedded?.staffPerformances || perfData.staffPerformances || perfData.data || [];
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
      
      return { branchId, branchName, purchases };
    }));

    // Process results from all branches
    for (const { branchId, branchName, purchases } of branchResults) {
      console.log(`Processing ${purchases.length} transactions for ${branchName}`);
      totalTransactions += purchases.length;
      
      // Save to detailed transaction items table (batched)
      if (purchases.length > 0) {
        const itemsSaved = await saveTransactionItems(supabase, purchases, branchId, branchName, staffMap);
        console.log(`Saved ${itemsSaved} items to phorest_transaction_items for ${branchName}`);
        
        // Batch payment method propagation (single query instead of per-row)
        try {
          const { data: paymentData, error: pmError } = await supabase
            .from('phorest_transaction_items')
            .select('transaction_date, phorest_staff_id, phorest_client_id, payment_method')
            .eq('location_id', branchId)
            .not('payment_method', 'is', null);
          
          if (!pmError && paymentData && paymentData.length > 0) {
            // Group by unique staff+date+client to minimize updates
            const uniquePM = new Map<string, string>();
            for (const ti of paymentData) {
              const key = `${ti.phorest_staff_id}|${ti.transaction_date}|${ti.phorest_client_id}`;
              uniquePM.set(key, ti.payment_method);
            }
            
            // Batch update: collect all client+date+staff combos, update in one go per combo
            let pmUpdated = 0;
            const pmEntries = Array.from(uniquePM.entries());
            // Process in batches of 50 to avoid overwhelming DB
            for (let i = 0; i < pmEntries.length; i += 50) {
              const batch = pmEntries.slice(i, i + 50);
              const updates = batch.map(([key, pm]) => {
                const [staffId, date, clientId] = key.split('|');
                return supabase
                  .from('phorest_appointments')
                  .update({ payment_method: pm })
                  .eq('phorest_staff_id', staffId)
                  .eq('appointment_date', date)
                  .eq('phorest_client_id', clientId)
                  .is('payment_method', null);
              });
              const results = await Promise.all(updates);
              pmUpdated += results.filter(r => !r.error).length;
            }
            console.log(`Propagated payment method to ${pmUpdated} appointments for ${branchName}`);
          }
        } catch (pmErr: any) {
          console.error(`Payment method propagation failed for ${branchName}:`, pmErr.message);
        }

        // Batch appointment status reconciliation — only for PAST dates
        // Today's appointments are excluded to prevent premature "completed" marking
        // when a client has a transaction but other appointments are still in progress.
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const uniqueClientDates = [...new Set(
            purchases
              .filter((p: any) => p.clientId && p.purchaseDate)
              .map((p: any) => `${p.clientId}|${p.purchaseDate?.split('T')[0]}`)
          )].filter(key => {
            const txDate = key.split('|')[1];
            return txDate && txDate < todayStr; // strictly past dates only
          });

          if (uniqueClientDates.length > 0) {
            let reconciled = 0;
            for (let i = 0; i < uniqueClientDates.length; i += 50) {
              const batch = uniqueClientDates.slice(i, i + 50);
              const updates = batch.map(key => {
                const [clientId, txDate] = key.split('|');
                if (!clientId || !txDate) return Promise.resolve({ data: null });
                return supabase
                  .from('phorest_appointments')
                  .update({ status: 'completed' })
                  .eq('phorest_client_id', clientId)
                  .eq('appointment_date', txDate)
                  .in('status', ['booked', 'confirmed', 'checked_in'])
                  .select('id');
              });
              const results = await Promise.all(updates);
              reconciled += results.reduce((sum, r) => sum + (r.data?.length || 0), 0);
            }
            if (reconciled > 0) {
              console.log(`Reconciled ${reconciled} appointments to completed via transaction match for ${branchName}`);
            }
          }
        } catch (reconErr: any) {
          console.error(`Transaction-based status reconciliation failed for ${branchName}:`, reconErr.message);
        }
      }

      // Collect all transaction records in memory first, then batch upsert
      const allTransactionRecords: any[] = [];

      for (const purchase of purchases) {
        const staffId = purchase.staffId || purchase.staff?.staffId;
        const stylistUserId = staffId ? staffMap.get(staffId) : null;
        const transactionDate = purchase.purchaseDate?.split('T')[0] || purchase.createdAt?.split('T')[0] || purchase.date;
        const transactionTime = purchase.purchaseDate?.split('T')[1]?.substring(0, 8) || null;

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
            tip_amount: item.tip || purchase.tipAmount || 0,
            total_amount: item.totalPrice || item.total || item.price || 0,
            payment_method: purchase.paymentMethod || purchase.payments?.[0]?.type || null,
          };

          allTransactionRecords.push(transactionRecord);

          // Aggregate for daily summary
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
                clientVisits: new Set<string>(),
              });
            }
            
            const summary = dailySummaries.get(summaryKey);
            const amount = parseFloat(transactionRecord.total_amount) || 0;
            const discount = parseFloat(transactionRecord.discount_amount as any) || 0;
            
            const clientId = purchase.clientId || purchase.client?.clientId || transactionRecord.client_name || 'unknown';
            summary.clientVisits.add(clientId);
            
            const tax = parseFloat(transactionRecord.tax_amount as any) || 0;
            if (itemType === 'product') {
              summary.total_products += transactionRecord.quantity;
              summary.product_revenue += amount + tax;
            } else {
              summary.total_services += transactionRecord.quantity;
              summary.service_revenue += amount;
            }
            summary.total_revenue += amount + tax;
            summary.total_transactions = summary.clientVisits.size;
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
            client_name: purchase.clientName || `${purchase.client?.firstName || ''} ${purchase.client?.lastName || ''}`.trim() || null,
            client_phone: null,
            item_type: 'service',
            item_name: purchase.description || 'Transaction',
            item_category: null,
            quantity: 1,
            unit_price: purchase.total || purchase.amount || 0,
            discount_amount: purchase.discountAmount || 0,
            tax_amount: purchase.taxAmount || 0,
            tip_amount: purchase.tipAmount || 0,
            total_amount: purchase.total || purchase.amount || 0,
            payment_method: purchase.paymentMethod || null,
          };

          allTransactionRecords.push(transactionRecord);
          
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

      // Deduplicate by phorest_transaction_id + item_name
      const deduped = new Map<string, any>();
      for (const rec of allTransactionRecords) {
        deduped.set(`${rec.phorest_transaction_id}::${rec.item_name}`, rec);
      }
      const uniqueRecords = Array.from(deduped.values());
      console.log(`Deduped to ${uniqueRecords.length} unique transaction records`);
      
      // Batch upsert in chunks of 200
      const TX_BATCH_SIZE = 200;
      for (let i = 0; i < uniqueRecords.length; i += TX_BATCH_SIZE) {
        const batch = uniqueRecords.slice(i, i + TX_BATCH_SIZE);
        const { error } = await supabase
          .from("phorest_sales_transactions")
          .upsert(batch, { onConflict: 'phorest_transaction_id,item_name' });
        if (error) {
          console.error(`Batch upsert error (batch ${i}): ${error.message}`);
        } else {
          syncedTransactions += batch.length;
        }
      }
      console.log(`Batch upserted ${syncedTransactions} sales transactions for ${branchName}`);
    }

    // Batch upsert daily summaries
    let summariesSynced = 0;
    const summaryRecords = Array.from(dailySummaries.values()).map(s => ({
      ...s,
      average_ticket: s.total_transactions > 0 ? s.total_revenue / s.total_transactions : 0,
    }));
    
    const SUMMARY_BATCH_SIZE = 200;
    for (let i = 0; i < summaryRecords.length; i += SUMMARY_BATCH_SIZE) {
      const batch = summaryRecords.slice(i, i + SUMMARY_BATCH_SIZE);
      const { error } = await supabase
        .from("phorest_daily_sales_summary")
        .upsert(batch, { 
          onConflict: 'phorest_staff_id,location_id,summary_date',
          ignoreDuplicates: false 
        });
      if (error) {
        console.error(`Daily summary upsert error: ${error.message}`);
      } else {
        summariesSynced += batch.length;
      }
    }

    console.log(`Synced ${syncedTransactions} transaction items, ${summariesSynced} daily summaries`);

    // Backfill tip data to phorest_appointments from transaction records
    let tipsBackfilled = 0;
    if (syncedTransactions > 0) {
      try {
        // Find transactions with tips and match to appointments by date + staff + client
        const { data: tippedTransactions } = await supabase
          .from('phorest_transaction_items')
          .select('transaction_date, phorest_staff_id, phorest_client_id, tip_amount')
          .gt('tip_amount', 0)
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo);

        if (tippedTransactions && tippedTransactions.length > 0) {
          console.log(`Found ${tippedTransactions.length} transactions with tips to backfill`);
          
          // Group tips by date + staff + client
          // IMPORTANT: Phorest duplicates the same tip_amount on every line item
          // in a checkout, so we must take the per-item value (MAX/MIN), NOT the SUM.
          const tipMap = new Map<string, number>();
          for (const t of tippedTransactions) {
            const key = `${t.transaction_date}:${t.phorest_staff_id}:${t.phorest_client_id}`;
            // Use Math.max to get the per-checkout tip (all items share the same value)
            const existing = tipMap.get(key);
            const tipVal = Number(t.tip_amount);
            if (existing === undefined || tipVal > existing) {
              tipMap.set(key, tipVal);
            }
          }

          // Batch tip backfill: parallel updates in batches of 50
          const tipEntries = Array.from(tipMap.entries());
          for (let i = 0; i < tipEntries.length; i += 50) {
            const batch = tipEntries.slice(i, i + 50);
            const updates = batch.map(([key, tipTotal]) => {
              const [date, staffId, clientId] = key.split(':');
              if (!date || !staffId) return Promise.resolve({ error: null, count: 0 });

              let query = supabase
                .from('phorest_appointments')
                .update({ tip_amount: tipTotal })
                .eq('appointment_date', date)
                .eq('phorest_staff_id', staffId);
              
              if (clientId && clientId !== 'null') {
                query = query.eq('phorest_client_id', clientId);
              }
              
              return query;
            });
            const results = await Promise.all(updates);
            tipsBackfilled += results.filter(r => !r.error).length;
          }
          console.log(`Backfilled tips to ${tipsBackfilled} appointments`);
        }
      } catch (tipErr: any) {
        console.log(`Tip backfill error (non-fatal): ${tipErr.message}`);
      }
    }

    return { 
      total_transactions: totalTransactions, 
      synced_items: syncedTransactions,
      daily_summaries: summariesSynced,
      tips_backfilled: tipsBackfilled
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
      // Phorest API uses startFilter/finishFilter (not startDate/endDate)
      const jobBody = { 
        jobType,
        startFilter: dateFrom,
        finishFilter: dateTo
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
      
      // Step 2: Poll for completion with exponential backoff (500ms → 1s → 2s → 4s cap)
      let status = "PENDING";
      let attempts = 0;
      const maxAttempts = 60;
      let jobStatusResponse: any = null;
      let pollDelay = 500; // Start at 500ms
      
      while (!["DONE", "COMPLETED", "READY"].includes(status.toUpperCase()) && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, pollDelay));
        pollDelay = Math.min(pollDelay * 2, 4000); // Double each time, cap at 4s
        
        try {
          jobStatusResponse = await phorestRequest(
            `/branch/${branchId}/csvexportjob/${jobId}`,
            businessId,
            username,
            password
          );
          
          // Phorest API returns jobStatus (not status)
          status = (jobStatusResponse.jobStatus || jobStatusResponse.status || jobStatusResponse.state || "").toUpperCase();
          
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
      
      console.log(`[CSV Export] Job ${jobId} completed. totalRows: ${jobStatusResponse?.totalRows}, succeededRows: ${jobStatusResponse?.succeededRows}`);
      
      // Check for 0 rows - no data to download
      if (jobStatusResponse?.totalRows === 0) {
        console.log(`[CSV Export] Job completed with 0 rows for date range, skipping download`);
        continue; // Try next job type or branch
      }
      
      // Use tempCsvExternalUrl (pre-signed S3 URL) from the job status response
      const csvDownloadUrl = jobStatusResponse?.tempCsvExternalUrl;
      
      // Step 3: Download CSV
      let csvText = '';
      let downloadAttempts = 0;
      const maxDownloadAttempts = 3;
      
      if (csvDownloadUrl) {
        console.log(`[CSV Export] Using tempCsvExternalUrl for download`);
        while (downloadAttempts < maxDownloadAttempts) {
          try {
            const dlResponse = await fetch(csvDownloadUrl);
            if (!dlResponse.ok) {
              throw new Error(`S3 download failed: ${dlResponse.status} ${dlResponse.statusText}`);
            }
            csvText = await dlResponse.text();
            console.log(`[CSV Export] Downloaded ${csvText.length} characters from S3`);
            console.log(`[CSV Export] First 500 chars: ${csvText.substring(0, 500)}`);
            break;
          } catch (downloadError: any) {
            downloadAttempts++;
            console.log(`[CSV Export] S3 download attempt ${downloadAttempts} failed: ${downloadError.message}`);
            if (downloadAttempts < maxDownloadAttempts) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      } else {
        // Fallback to constructed path (legacy)
        console.log(`[CSV Export] No tempCsvExternalUrl, trying constructed path...`);
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
              await new Promise(r => setTimeout(r, 1000));
            }
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

// Parse CSV text into transaction records with exact Phorest column mapping
function parseSalesCsv(csvText: string, branchId: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    console.log(`[CSV Parser] Not enough lines in CSV: ${lines.length}`);
    return [];
  }
  
  // Parse header to get column indices
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  console.log(`[CSV Parser] Headers found (${headers.length}): ${headers.join(', ')}`);
  
  // Priority-based column matching: exact > starts-with > contains
  // This prevents "amount" from matching "purchaseonlinediscountamount" before "nettotalamount"
  const getIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 1: Exact match
      const exact = headers.findIndex(h => h === norm);
      if (exact !== -1) return exact;
    }
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 2: Header starts with search term
      const startsWith = headers.findIndex(h => h.startsWith(norm));
      if (startsWith !== -1) return startsWith;
    }
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 3: Search term starts with header (header is substring prefix)
      const reverseStartsWith = headers.findIndex(h => norm.startsWith(h));
      if (reverseStartsWith !== -1) return reverseStartsWith;
    }
    return -1;
  };
  
  // Use exact Phorest CSV column names for critical fields
  const idxTransactionId = getIndex(['transactionitemid', 'transactionid', 'purchaseid', 'receiptno', 'invoiceno']);
  const idxStaffId = getIndex(['staffid', 'employeeid', 'therapistid', 'stylistid']);
  const idxStaffName = getIndex(['staffname', 'employeename', 'therapistname']);
  const idxDate = getIndex(['purchaseddate', 'completeddate', 'transactiondate', 'purchasedate', 'saledate', 'date']);
  const idxTime = getIndex(['purchasetime', 'completedtime', 'transactiontime', 'time']);
  // Amount: use nettotalamount (net revenue, what we want for "Revenue basis: Net")
  const idxAmount = getIndex(['nettotalamount', 'totalamount', 'netprice', 'grossprice']);
  const idxType = getIndex(['itemtype', 'type', 'linetype', 'producttype', 'servicetype', 'category']);
  // Name: use description (the actual item/service name in Phorest CSVs)
  const idxName = getIndex(['description', 'servicename', 'productname', 'itemname']);
  const idxClientId = getIndex(['clientid', 'customerid']);
  const idxClientName = getIndex(['clientname', 'customername']);
  const idxQuantity = getIndex(['quantity', 'qty', 'count']);
  // Discount: use exact column
  const idxDiscount = getIndex(['discountamount', 'simplediscountamount', 'discount']);
  // Tax: use taxamount specifically (not taxrate)
  const idxTax = getIndex(['taxamount']);
  // Tip: use stafftips specifically (not other tip-like columns)
  const idxTip = getIndex(['stafftips', 'phoresttips', 'tipamount', 'gratuity']);
  // Unit price
  const idxUnitPrice = getIndex(['unitprice', 'price']);
  // Payment method
  const idxPaymentType = getIndex(['paymenttypenames', 'paymenttype', 'paymentmethod']);
  
  console.log(`[CSV Parser] Column indices: transactionId=${idxTransactionId}, staffId=${idxStaffId}, date=${idxDate}, amount=${idxAmount}, type=${idxType}, name=${idxName}, tip=${idxTip}, tax=${idxTax}, unitPrice=${idxUnitPrice}, discount=${idxDiscount}, paymentType=${idxPaymentType}`);
  
  const transactions: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 3) continue;
      
      // Extract date - handle various formats
      let transactionDate = idxDate >= 0 ? values[idxDate] : null;
      if (transactionDate) {
        if (transactionDate.includes('/')) {
          const parts = transactionDate.split('/');
          if (parts.length === 3) {
            // Phorest is Irish, so likely DD/MM/YYYY
            if (parseInt(parts[2]) > 100) {
              transactionDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
      }

      // Parse the net total directly from CSV (don't re-derive)
      const netTotal = idxAmount >= 0 ? parseFloat(values[idxAmount]?.replace(/[^0-9.-]/g, '')) || 0 : 0;
      const unitPrice = idxUnitPrice >= 0 ? parseFloat(values[idxUnitPrice]?.replace(/[^0-9.-]/g, '')) || 0 : netTotal;
      
      const transaction = {
        purchaseId: idxTransactionId >= 0 && values[idxTransactionId] 
          ? values[idxTransactionId] 
          : `csv-${branchId}-${i}-${Date.now()}`,
        staffId: idxStaffId >= 0 ? values[idxStaffId] : null,
        staffName: idxStaffName >= 0 ? values[idxStaffName] : null,
        purchaseDate: transactionDate,
        purchaseTime: idxTime >= 0 ? values[idxTime] : null,
        total: netTotal,
        tipAmount: idxTip >= 0 ? Math.abs(parseFloat(values[idxTip]?.replace(/[^0-9.-]/g, '')) || 0) : 0,
        paymentMethod: idxPaymentType >= 0 ? (values[idxPaymentType]?.trim() || null) : null,
        clientId: idxClientId >= 0 ? values[idxClientId] : null,
        clientName: idxClientName >= 0 ? values[idxClientName] : null,
        items: [{
          type: idxType >= 0 ? (values[idxType]?.toLowerCase() || 'service') : 'service',
          name: idxName >= 0 ? (values[idxName] || 'Transaction') : 'Transaction',
          price: unitPrice,
          totalPrice: netTotal,
          quantity: idxQuantity >= 0 ? parseInt(values[idxQuantity]) || 1 : 1,
          discount: idxDiscount >= 0 ? parseFloat(values[idxDiscount]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
          tax: idxTax >= 0 ? parseFloat(values[idxTax]?.replace(/[^0-9.-]/g, '')) || 0 : 0,
          tip: idxTip >= 0 ? Math.abs(parseFloat(values[idxTip]?.replace(/[^0-9.-]/g, '')) || 0) : 0,
        }]
      };
      
      // Only add if we have meaningful data
      if (transaction.purchaseDate || transaction.total > 0) {
        transactions.push(transaction);
      }
    } catch (lineError: any) {
      console.log(`[CSV Parser] Error parsing line ${i}: ${lineError.message}`);
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

// Helper function to save transaction items to the new detailed table (batched)
async function saveTransactionItems(
  supabase: any,
  transactions: any[],
  branchId: string,
  branchName: string,
  staffMap: Map<string, string>
): Promise<number> {
  const allRecords: any[] = [];
  
  for (const transaction of transactions) {
    const staffId = transaction.staffId;
    const stylistUserId = staffId ? staffMap.get(staffId) : null;
    const transactionDate = transaction.purchaseDate?.split('T')[0];
    
    if (!transactionDate) continue;
    
    for (const item of transaction.items || []) {
      const totalAmount = item.totalPrice !== undefined ? item.totalPrice : 
        ((item.price || 0) * (item.quantity || 1) - (item.discount || 0));
      
      allRecords.push({
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
        tax_amount: item.tax || 0,
        tip_amount: item.tip || transaction.tipAmount || 0,
        total_amount: totalAmount,
        payment_method: transaction.paymentMethod || null,
      });
    }
  }
  
  // Batch upsert in chunks of 200
  let savedCount = 0;
  for (let i = 0; i < allRecords.length; i += 200) {
    const batch = allRecords.slice(i, i + 200);
    const { error } = await supabase
      .from('phorest_transaction_items')
      .upsert(batch, { onConflict: 'transaction_id,item_name,item_type' });
    
    if (!error) savedCount += batch.length;
    else console.error(`Transaction items batch upsert error: ${error.message}`);
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
          // Sync yesterday + today: yesterday's sales may finalize after midnight
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          salesFrom = yesterday.toISOString().split('T')[0];
          salesTo = todayStr;
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          salesFrom = date_from || thirtyDaysAgo.toISOString().split('T')[0];
          salesTo = date_to || new Date().toISOString().split('T')[0];
        }
        
        results.sales = await syncSalesTransactions(supabase, businessId, username, password, salesFrom, salesTo);
        const salesStatus = (results.sales.synced_items || 0) === 0 ? 'no_data' : 'success';
        await logSync(supabase, 'sales', salesStatus, results.sales.synced_items, 
          salesStatus === 'no_data' ? 'All sales endpoints returned 0 records' : undefined, 
          { quick });
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