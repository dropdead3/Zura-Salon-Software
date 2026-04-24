import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  sync_type: 'staff' | 'appointments' | 'clients' | 'reports' | 'sales' | 'all';
  date_from?: string;
  date_to?: string;
  quick?: boolean | 'far'; // 'far' = d+90 to d+180 hourly tail; true = d-1 to d+90 every 15min
}

// Phorest API configuration - Global endpoint works
const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";
const PHOREST_BASE_URL_US = "https://platform-us.phorest.com/third-party-api-server/api";

/**
 * GET helper. By default tries EU then US, falling through on 404 from EU.
 * Pass `preferredBase` to skip the wrong region entirely — required for
 * per-branch lookups, where calling the wrong region returns a misleading 404
 * that the caller would otherwise interpret as "client doesn't exist."
 *
 * SIGNAL PRESERVATION: throws ONLY when every base URL has been definitively
 * tried; the error message preserves whether we ever saw a non-404 response so
 * the caller can distinguish "really not found" from "transient/auth/etc."
 */
async function phorestRequest(
  endpoint: string,
  businessId: string,
  username: string,
  password: string,
  preferredBase?: string,
) {
  const formattedUsername = username.startsWith('global/') ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);

  const baseUrls = preferredBase
    ? [preferredBase]
    : [PHOREST_BASE_URL, PHOREST_BASE_URL_US];

  let lastNon404Status = 0;
  let lastNon404Error = "";

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

    if (response.status === 404) {
      // Fall through to the next base — but if this is the last base, the
      // caller still needs to know it was a 404 (not a transient error).
      await response.text();
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      lastNon404Status = response.status;
      lastNon404Error = errorText;
      console.error(`Phorest API error (${response.status}):`, errorText);
      continue;
    }

    return response.json();
  }

  // Exhausted bases. Surface a 404 only if we never saw a non-404 — otherwise
  // the caller was experiencing a transient/auth/region failure, not a true
  // "not found." Distinguishing these prevents the negative-cache anti-pattern.
  if (lastNon404Status === 0) {
    throw new Error(`Phorest API error: 404 - exhausted base URLs`);
  }
  throw new Error(`Phorest API error: ${lastNon404Status} - ${lastNon404Error}`);
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

    const mappingsByPhorestId = new Map<string, any>(
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
  } catch (error: any) {
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
  console.log(`[SYNC WINDOW] Appointments: dateFrom=${dateFrom} dateTo=${dateTo}`);

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
            // ?expand=client requests inline client expansion so the appointment
            // payload carries firstName/lastName/email — eliminating the need
            // for the per-client GET (which 404s for many real clients).
            // If Phorest ignores the param, the response is unchanged and the
            // legacy fallback paths (apt.clientName etc.) still work.
            const appointmentsData = await phorestRequest(
              `/branch/${branchId}/appointment?from_date=${chunk.from}&to_date=${chunk.to}&size=100&page=${page}&expand=client`,
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
      
      const phorestClientId = apt.clientId || apt.client?.clientId || apt.customer?.clientId || null;

      // SIGNAL PRESERVATION: read every candidate path Phorest may use for the
      // client name. The single-resource client fetch (/branch/{id}/client/{id})
      // returns 404 for many clients visible in Phorest's UI — but the
      // appointment payload itself often carries the name inline. Capturing it
      // here means we never need the per-client fallback for those cases.
      const extractedClientName =
        apt.clientName ||
        apt.client_name ||
        `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() ||
        apt.client?.name ||
        apt.client?.fullName ||
        `${apt.customer?.firstName || ''} ${apt.customer?.lastName || ''}`.trim() ||
        apt.customer?.name ||
        apt.customer?.fullName ||
        null;

      const extractedClientPhone =
        apt.client?.mobile || apt.client?.phone ||
        apt.customer?.mobile || apt.customer?.phone || null;

      // Debug: log first appointment's raw keys + nested client/customer shape
      // once per sync run so we can see exactly what Phorest is sending.
      if (!debugLogged) {
        console.log(`[DEBUG] First appointment raw keys:`, Object.keys(apt));
        console.log(`[DEBUG] First appointment activationState:`, apt.activationState, `status:`, apt.status, `confirmed:`, apt.confirmed);
        console.log(`[DEBUG] First appointment client shape:`, JSON.stringify({
          clientId: apt.clientId,
          clientName: apt.clientName,
          client: apt.client,
          customer: apt.customer,
        }));
        console.log(`[DEBUG] Extracted client_name="${extractedClientName}" client_id="${phorestClientId}"`);
        if (apt.services && apt.services.length > 1) {
          console.log(`[DEBUG] Multi-service appointment detected: ${apt.services.length} services in appointment ${phorestId}`);
        }
        debugLogged = true;
      }

      // Map status
      let mappedStatus = mapPhorestStatus(apt.activationState || apt.status);

      // If Phorest says ACTIVE but client confirmed via SMS/email, mark as confirmed
      if (mappedStatus === 'booked' && apt.confirmed === true) {
        mappedStatus = 'confirmed';
      }

      // NOTE: Time-based completion inference removed — Phorest's activationState
      // is the source of truth. new Date() in Deno is UTC which caused premature
      // "completed" badges for appointments still in the org's local future.

      // SIGNAL PRESERVATION (R6a): if Phorest's payload doesn't carry a name,
      // omit the client_name/client_phone keys entirely so a previously-resolved
      // value (set by the post-sync backfill or a prior payload that did include
      // it) is NOT clobbered to NULL on every subsequent sync. Same logic for
      // phone. The upsert receives a row shape without those keys → Postgres
      // leaves the existing column values alone.
      const baseRow: Record<string, unknown> = {
        phorest_id: phorestId,
        stylist_user_id: stylistUserId,
        phorest_staff_id: apt.staffId || apt.staff?.staffId,
        location_id: locationId,
        // S2: persist the upstream branch on every synced row so reconciliation
        // and on-demand client probes can target the appointment's real branch.
        phorest_branch_id: apt.branchId || null,
        phorest_client_id: phorestClientId,
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
      if (extractedClientName) baseRow.client_name = extractedClientName;
      if (extractedClientPhone) baseRow.client_phone = extractedClientPhone;
      upsertBatch.push(baseRow);
    }

    // Batch upsert via RPC that COALESCEs client_name/client_phone so a
    // missing-from-payload value never null-overwrites a previously resolved
    // one. Chunked at 200 rows/call to keep payloads bounded.
    for (let i = 0; i < upsertBatch.length; i += 200) {
      const chunk = upsertBatch.slice(i, i + 200);
      const { error } = await supabase.rpc(
        'upsert_phorest_appointments_preserve_names',
        { p_rows: chunk },
      );

      if (error) {
        console.log(`Failed to batch upsert appointments (batch ${Math.floor(i/200)+1}):`, error.message);
      } else {
        synced += chunk.length;
      }
    }
    
    console.log(`Synced ${synced} of ${upsertBatch.length} appointments (${allAppointments.length} fetched from API)`);

    // ── S1: Stale-appointment reconciliation ──
    // For each branch we just fetched, soft-delete any active local Phorest
    // rows in the same date window that were NOT returned by the upstream
    // fetch. This closes the drift gap that produced "ghost" appointments
    // (e.g. an upstream edit replaced the row but the old local row stayed
    // active and kept rendering on the schedule).
    //
    // Bounded to (branch × window) so a partial fetch failure for one branch
    // can't false-delete rows from another branch.
    try {
      const seenByBranch = new Map<string, Set<string>>();
      for (const apt of allAppointments) {
        const bId = apt.branchId;
        const phId = apt.appointmentId || apt.id || apt.appointmentid;
        if (!bId || !phId) continue;
        if (!seenByBranch.has(bId)) seenByBranch.set(bId, new Set());
        seenByBranch.get(bId)!.add(phId);
      }

      // Only reconcile branches we actually attempted to fetch (i.e. we have
      // an entry in seenByBranch OR the branch was in the original branches
      // list and the fetch returned zero rows — empty Set is correct here).
      const branchIdsToReconcile = new Set<string>();
      for (const branch of branches) {
        const id = branch.branchId || branch.id;
        if (id) branchIdsToReconcile.add(id);
      }

      let totalSoftDeleted = 0;
      const allSampleIds: string[] = [];
      for (const bId of branchIdsToReconcile) {
        const seen = Array.from(seenByBranch.get(bId) || []);

        // SAFETY: if the branch returned zero rows AND we have a meaningful
        // count of existing local rows in the window, skip reconciliation
        // for this branch. A truly-empty calendar is rare; an empty fetch
        // is more likely an upstream error than a real wipe.
        if (seen.length === 0) {
          const { count: existingCount } = await supabase
            .from('phorest_appointments')
            .select('id', { count: 'exact', head: true })
            .eq('phorest_branch_id', bId)
            .gte('appointment_date', dateFrom)
            .lte('appointment_date', dateTo)
            .is('deleted_at', null);
          if ((existingCount || 0) > 5) {
            console.log(`[RECONCILE] Skip branch ${bId}: 0 fetched but ${existingCount} active locally — treating as transient fetch failure`);
            continue;
          }
        }

        const { data: rec, error: recErr } = await supabase.rpc(
          'reconcile_phorest_appointments',
          {
            p_branch_id: bId,
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_seen_phorest_ids: seen,
          },
        );
        if (recErr) {
          console.log(`[RECONCILE] branch ${bId} failed:`, recErr.message);
          continue;
        }
        const row = Array.isArray(rec) ? rec[0] : rec;
        const cnt = row?.soft_deleted_count || 0;
        const samples = (row?.sample_ids || []) as string[];
        if (cnt > 0) {
          totalSoftDeleted += cnt;
          allSampleIds.push(...samples);
          console.log(`[RECONCILE] branch ${bId}: soft-deleted ${cnt} stale rows. Samples: ${samples.join(',')}`);
        }
      }
      if (totalSoftDeleted > 0) {
        console.log(`[SYNC HEALTH] Stale reconciliation removed ${totalSoftDeleted} mirrored appointments across ${branchIdsToReconcile.size} branches.`);
      } else {
        console.log(`[SYNC HEALTH] Stale reconciliation: 0 stale rows across ${branchIdsToReconcile.size} branches.`);
      }
    } catch (reconErr: any) {
      console.error('Stale reconciliation error (non-fatal):', reconErr?.message || reconErr);
    }

    // ── Post-sync: Backfill client names from phorest_clients ──
    // Two passes: (1) resolve from local table, (2) on-demand fetch the
    // residual set directly from Phorest. Doctrine: a phorest_client_id
    // with no name is a sync gap, not a walk-in — closing it is the whole
    // point of this block.
    //
    // CONTRACT-VALIDATING WRITES: only upsert client rows when the Phorest
    // response actually carries a name. Empty rows in `phorest_clients` are
    // worse than no rows — they satisfy schema but violate purpose, and they
    // hide IDs from the next residual scan (which is keyed on "no name").
    try {
      // S3: snapshot name coverage in the visible window BEFORE backfill
      // so we can detect coverage regressions in subsequent syncs.
      const visibleWindowFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { count: visibleTotalBefore } = await supabase
        .from('phorest_appointments')
        .select('id', { count: 'exact', head: true })
        .gte('appointment_date', visibleWindowFrom)
        .is('deleted_at', null)
        .not('phorest_client_id', 'is', null);
      const { count: visibleMissingBefore } = await supabase
        .from('phorest_appointments')
        .select('id', { count: 'exact', head: true })
        .gte('appointment_date', visibleWindowFrom)
        .is('deleted_at', null)
        .is('client_name', null)
        .not('phorest_client_id', 'is', null);

      // S2: prioritize current/upcoming appointments. Includes phorest_branch_id
      // so we can probe the appointment's actual branch first instead of relying
      // on sibling-client hints that might point to the wrong branch.
      const { data: missingNames } = await supabase
        .from('phorest_appointments')
        .select('id, phorest_client_id, appointment_date, phorest_branch_id')
        .is('client_name', null)
        .not('phorest_client_id', 'is', null)
        .gte('appointment_date', visibleWindowFrom)
        .order('appointment_date', { ascending: true })
        .limit(1000);

      if (missingNames && missingNames.length > 0) {
        const clientIds = [...new Set(missingNames.map((a: any) => a.phorest_client_id).filter(Boolean))] as string[];
        const clientNameMap = new Map<string, string>();
        // IDs whose existing client row is empty (no name) and must be re-probed
        // even though a row exists. The original logic skipped these.
        const emptyExistingIds = new Set<string>();
        // IDs whose existing row is the negative-cache `[Deleted Client]` placeholder.
        // Don't re-probe; treat as resolved-deleted so we don't keep retrying.
        const negativelyCachedIds = new Set<string>();

        // Pass 1: batch-fetch from local phorest_clients
        for (let i = 0; i < clientIds.length; i += 100) {
          const chunk = clientIds.slice(i, i + 100);
          const { data: clients } = await supabase
            .from('phorest_clients')
            .select('phorest_client_id, name, first_name, last_name')
            .in('phorest_client_id', chunk);

          (clients ?? []).forEach((c: any) => {
            if (c.name === '[Deleted Client]') {
              negativelyCachedIds.add(c.phorest_client_id);
              return;
            }
            const resolvedName = (c.name && c.name.trim()) || [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
            if (resolvedName) {
              clientNameMap.set(c.phorest_client_id, resolvedName);
            } else {
              // Row exists but has no usable name — flag for re-probe.
              emptyExistingIds.add(c.phorest_client_id);
            }
          });
        }

        // Pass 2: identify still-unresolved IDs and fetch on-demand from Phorest.
        // Includes both "no row at all" and "row exists but empty" cases.
        // Cap at 200/run to protect rate budget; remainder picks up next sync.
        const unresolved = clientIds
          .filter((id: any) => !clientNameMap.has(id) && !negativelyCachedIds.has(id))
          .slice(0, 200);
        const reprobeCount = unresolved.filter((id: any) => emptyExistingIds.has(id)).length;
        if (unresolved.length > 0) {
          console.log(`On-demand resolution needed for ${unresolved.length} client IDs (${reprobeCount} re-probes of empty rows)`);
        }

        // Need a branchId to call /branch/{id}/client/{clientId}.
        // Resolve the working REGION for each branch up-front so per-client
        // lookups never cross-region (cross-region 404s are what produced the
        // false [Deleted Client] flagging — same client, wrong base URL).
        let branchIds: string[] = [];
        const branchRegion = new Map<string, string>(); // branchId -> base URL that works
        try {
          // Try EU first to enumerate branches.
          let euBranches: any[] = [];
          let usBranches: any[] = [];
          try {
            const euData = await phorestRequest('/branch', businessId, username, password, PHOREST_BASE_URL);
            euBranches = euData._embedded?.branches || euData.branches ||
                         (Array.isArray(euData) ? euData : []);
          } catch (e: any) {
            console.log('On-demand: EU /branch enumeration failed:', e.message);
          }
          try {
            const usData = await phorestRequest('/branch', businessId, username, password, PHOREST_BASE_URL_US);
            usBranches = usData._embedded?.branches || usData.branches ||
                         (Array.isArray(usData) ? usData : []);
          } catch (e: any) {
            console.log('On-demand: US /branch enumeration failed:', e.message);
          }

          for (const b of euBranches) {
            const id = b.branchId || b.id;
            if (id && !branchRegion.has(id)) branchRegion.set(id, PHOREST_BASE_URL);
          }
          for (const b of usBranches) {
            const id = b.branchId || b.id;
            if (id && !branchRegion.has(id)) branchRegion.set(id, PHOREST_BASE_URL_US);
          }
          branchIds = Array.from(branchRegion.keys());
        } catch (e: any) {
          console.log('On-demand client fetch: failed to list branches, skipping pass 2:', e.message);
        }

        // Build branch hints for unresolved client IDs.
        // PRIORITY 1 (S2): the appointment's own phorest_branch_id is the
        // strongest signal — that's the branch the upstream record lives in.
        // PRIORITY 2: sibling phorest_clients rows already pointing at a branch.
        const branchHintMap = new Map<string, string>(); // clientId -> branchId hint

        // S2 priority 1: appointment's own branch
        for (const apt of missingNames) {
          if (apt.phorest_client_id && apt.phorest_branch_id && !branchHintMap.has(apt.phorest_client_id)) {
            branchHintMap.set(apt.phorest_client_id, apt.phorest_branch_id);
          }
        }

        // S2 priority 2: sibling client rows (only when no appointment-branch hint)
        if (unresolved.length > 0) {
          const stillNeedHint = unresolved.filter((id: string) => !branchHintMap.has(id));
          if (stillNeedHint.length > 0) {
            const { data: hintRows } = await supabase
              .from('phorest_clients')
              .select('phorest_client_id, phorest_branch_id')
              .in('phorest_client_id', stillNeedHint)
              .not('phorest_branch_id', 'is', null);
            (hintRows || []).forEach((r: any) => {
              if (r.phorest_branch_id && !branchHintMap.has(r.phorest_client_id)) {
                branchHintMap.set(r.phorest_client_id, r.phorest_branch_id);
              }
            });
          }
        }

        let onDemandFetched = 0;
        let onDemandUnresolved = 0;
        let onDemandErrors = 0;

        // PHOREST QUIRK: GET /branch/{id}/client/{clientId} returns 404 for many
        // clients that visibly exist in Phorest's UI — the third-party single-
        // resource endpoint is permissioned/scoped differently from the list
        // endpoint that powers their calendar. Strategy: paginate the list
        // endpoint per branch (in the branch's own region), match locally
        // against the unresolved set, stop early when all are resolved. This
        // also costs ~5 list calls per branch instead of 200 single fetches.
        if (unresolved.length > 0 && branchIds.length > 0) {
          const remainingIds = new Set(unresolved);

          // Probe order: branches that already have hints (= we know real
          // clients live there) first, since they're more likely to contain
          // the unresolved IDs too.
          const hintedBranches = new Set(branchHintMap.values());
          const orderedBranchProbe = [
            ...branchIds.filter((b: any) => hintedBranches.has(b)),
            ...branchIds.filter((b: any) => !hintedBranches.has(b)),
          ];

          for (const branchId of orderedBranchProbe) {
            if (remainingIds.size === 0) break;
            const region = branchRegion.get(branchId) || PHOREST_BASE_URL;

            let page = 0;
            let hasMore = true;
            // Cap pages to bound the rate budget — large client books should
            // still resolve over a few sync cycles even if not in one pass.
            const maxPages = 20;

            while (hasMore && page < maxPages && remainingIds.size > 0) {
              try {
                const data: any = await phorestRequest(
                  `/branch/${branchId}/client?size=200&page=${page}`,
                  businessId, username, password,
                  region,
                );

                const clients =
                  data?._embedded?.clients ||
                  data?.clients ||
                  data?.page?.content ||
                  (Array.isArray(data) ? data : []);

                if (!clients.length) {
                  hasMore = false;
                  break;
                }

                const upserts: any[] = [];
                for (const c of clients) {
                  const cid = c.clientId || c.id;
                  if (!cid || !remainingIds.has(cid)) continue;

                  const first = c.firstName || null;
                  const last = c.lastName || null;
                  const name = `${first || ''} ${last || ''}`.trim() || c.name || null;
                  // CONTRACT VALIDATION: skip empty rows.
                  if (!name) continue;

                  upserts.push({
                    phorest_client_id: cid,
                    name,
                    first_name: first,
                    last_name: last,
                    email: c.email || null,
                    phone: c.mobile || c.phone || null,
                    phorest_branch_id: branchId,
                  });
                  clientNameMap.set(cid, name);
                  remainingIds.delete(cid);
                  onDemandFetched++;
                }

                if (upserts.length > 0) {
                  await supabase
                    .from('phorest_clients')
                    .upsert(upserts, { onConflict: 'phorest_client_id' });
                }

                const totalPages = data?.page?.totalPages || 1;
                page++;
                hasMore = page < totalPages && clients.length >= 200;
              } catch (e: any) {
                const msg = String(e?.message || '');
                if (!msg.includes('404')) {
                  onDemandErrors++;
                  console.log(`Paginated client list (branch ${branchId}, page ${page}): ${msg}`);
                }
                hasMore = false;
              }
            }
          }

          onDemandUnresolved = remainingIds.size;
          if (onDemandUnresolved > 0) {
            // SIGNAL PRESERVATION: log IDs that remain unresolved after the
            // paginated sweep — they will render as "Client #ABCD" in the UI.
            // Do NOT write any placeholder row.
            console.log(`On-demand paginated sweep: ${onDemandUnresolved} IDs still unresolved after probing ${orderedBranchProbe.length} branches`);
          }
        }

        if (onDemandFetched > 0 || onDemandUnresolved > 0 || onDemandErrors > 0) {
          console.log(`On-demand (paginated): ${onDemandFetched} resolved, ${onDemandUnresolved} unresolved, ${onDemandErrors} transient errors (NO negative-cache writes)`);
        }

        // Bulk-update appointments with all resolved real names (skip [Deleted Client]).
        let backfilled = 0;
        for (const apt of missingNames) {
          const name = clientNameMap.get(apt.phorest_client_id!);
          if (name && name !== '[Deleted Client]') {
            await supabase
              .from('phorest_appointments')
              .update({ client_name: name })
              .eq('id', apt.id);
            backfilled++;
          }
        }
        console.log(`Backfilled ${backfilled} client names (${missingNames.length} missing; ${unresolved.length} on-demand; ${negativelyCachedIds.size} negatively cached)`);
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
    } catch (backfillError: any) {
      console.error('Client name backfill error (non-fatal):', backfillError);
    }

    return { total: allAppointments.length, synced };
  } catch (error: any) {
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
        // NOTE: visit_count, total_spend, last_visit, first_visit are
        // intentionally NOT written here. Zura derives them locally from
        // phorest_appointments via v_client_visit_stats and writes them via
        // refresh_client_visit_stats() at the end of this sync run.
        // Phorest's appointmentCount/totalSpend/lastAppointmentDate fields
        // were always returning falsy for this org, which silently zeroed
        // out every client. See plan: derive at the source, mirror at the
        // consumer.
        preferred_stylist_id: preferredStylistId,
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
  } catch (error: any) {
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
  } catch (error: any) {
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
              pmUpdated += results.filter((r: any) => !r.error).length;
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
          )].filter((key: any) => {
            const txDate = key.split('|')[1];
            return txDate && txDate < todayStr; // strictly past dates only
          });

          if (uniqueClientDates.length > 0) {
            let reconciled = 0;
            for (let i = 0; i < uniqueClientDates.length; i += 50) {
              const batch = uniqueClientDates.slice(i, i + 50);
              const updates = batch.map((key: any) => {
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
              reconciled += results.reduce((sum: any, r: any) => sum + (r.data?.length || 0), 0);
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
    const summaryRecords = Array.from(dailySummaries.values()).map((s: any) => ({
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
            tipsBackfilled += results.filter((r: any) => !r.error).length;
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
  } catch (error: any) {
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
  const lines = csvText.split('\n').filter((line: any) => line.trim());
  if (lines.length < 2) {
    console.log(`[CSV Parser] Not enough lines in CSV: ${lines.length}`);
    return [];
  }
  
  // Parse header to get column indices
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h: any) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  console.log(`[CSV Parser] Headers found (${headers.length}): ${headers.join(', ')}`);
  
  // Priority-based column matching: exact > starts-with > contains
  // This prevents "amount" from matching "purchaseonlinediscountamount" before "nettotalamount"
  const getIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 1: Exact match
      const exact = headers.findIndex((h: any) => h === norm);
      if (exact !== -1) return exact;
    }
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 2: Header starts with search term
      const startsWith = headers.findIndex((h: any) => h.startsWith(norm));
      if (startsWith !== -1) return startsWith;
    }
    for (const name of possibleNames) {
      const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Priority 3: Search term starts with header (header is substring prefix)
      const reverseStartsWith = headers.findIndex((h: any) => norm.startsWith(h));
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
  retryCount?: number,
  startedAt?: Date,
) {
  // Ensure started_at <= completed_at. If caller didn't pass startedAt,
  // fall back to "now minus 1ms" so the row still has a coherent ordering.
  const completed = new Date();
  const started = startedAt ?? new Date(completed.getTime() - 1);
  await supabase.from("phorest_sync_log").insert({
    sync_type: syncType,
    status,
    records_synced: recordsSynced,
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
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

/**
 * Sync breaks from Phorest for each branch using the /break endpoint.
 * Each break is a flat object with breakId, breakDate, startTime, endTime, staffId, label.
 */
async function syncRoster(supabase: any, businessId: string, username: string, password: string, dateFrom: string, dateTo: string) {
  console.log(`Syncing breaks from ${dateFrom} to ${dateTo}...`);

  // Get branches
  const branchData = await phorestRequest("/branch", businessId, username, password);
  const branches = branchData._embedded?.branches || branchData.branches || (Array.isArray(branchData) ? branchData : []);

  // Get staff mappings to resolve phorest_staff_id -> user_id
  const { data: staffMappings } = await supabase
    .from('phorest_staff_mapping')
    .select('phorest_staff_id, user_id');

  // Get organization_id for each user from employee_profiles
  const userIds = [...new Set((staffMappings || []).map((m: any) => m.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('employee_profiles').select('user_id, organization_id').in('user_id', userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.organization_id]));

  const staffMap = new Map<string, { user_id: string; organization_id: string | null }>(
    (staffMappings || []).map((m: any) => [
      m.phorest_staff_id,
      { user_id: m.user_id, organization_id: profileMap.get(m.user_id) || null },
    ])
  );
  console.log(`Staff mapping has ${staffMap.size} entries (${profileMap.size} with org). Keys: ${[...staffMap.keys()].slice(0, 5).join(', ')}...`);

  // Build branch-to-location map: phorest_branch_id -> app location id
  const { data: locations } = await supabase
    .from('locations')
    .select('id, phorest_branch_id')
    .not('phorest_branch_id', 'is', null);
  const branchToLocationMap = new Map((locations || []).map((l: any) => [l.phorest_branch_id, l.id]));
  console.log(`Branch-to-location map: ${branchToLocationMap.size} entries. Mappings: ${[...branchToLocationMap.entries()].map(([k, v]) => `${k}->${v}`).join(', ')}`);

  let totalBlocks = 0;

  const normalizeTime = (t: string) => {
    if (!t) return t;
    if (t.length === 5) return t + ':00'; // HH:MM -> HH:MM:SS
    return t;
  };

  for (const branch of branches) {
    const branchId = branch.branchId || branch.id;
    const appLocationId = branchToLocationMap.get(branchId);
    if (!appLocationId) {
      console.log(`No app location mapping for branch ${branchId}, skipping break sync for this branch`);
      continue;
    }
    try {
      // Paginate through the /break endpoint (max 100 per page)
      let page = 0;
      let totalPages = 1;
      const blocks: any[] = [];
      let skippedMissingFields = 0;
      let skippedUnmapped = 0;
      const unmappedStaffIds = new Set<string>();
      let loggedFirstBreak = false;

      while (page < totalPages) {
        const breakData = await phorestRequest(
          `/branch/${branchId}/break?from_date=${dateFrom}&to_date=${dateTo}&size=100&page=${page}`,
          businessId, username, password
        );

        // Update pagination info
        if (breakData.page) {
          totalPages = breakData.page.totalPages || 1;
        }

        // Extract flat break entries
        const breaks = breakData._embedded?.breaks || breakData.breaks || (Array.isArray(breakData) ? breakData : []);
        console.log(`Branch ${branchId}, page ${page}: ${breaks.length} breaks`);

        // Log first break object for field name verification
        if (!loggedFirstBreak && breaks.length > 0) {
          console.log(`First break object keys: ${JSON.stringify(Object.keys(breaks[0]))}`);
          console.log(`First break object: ${JSON.stringify(breaks[0])}`);
          loggedFirstBreak = true;
        }

        for (const brk of breaks) {
          const staffId = brk.staffId || brk.staff_id;
          const breakDate = brk.breakDate || brk.break_date;
          const startTime = brk.startTime || brk.start_time;
          const endTime = brk.endTime || brk.end_time;
          const breakId = brk.breakId || brk.break_id || brk.id;

          if (!staffId || !breakDate || !startTime || !endTime) {
            skippedMissingFields++;
            continue;
          }

          const mapping = staffMap.get(staffId);
          const orgId = mapping?.organization_id;
          if (!orgId) {
            skippedUnmapped++;
            unmappedStaffIds.add(staffId);
            continue;
          }

          const labelRaw = brk.label || brk.name || 'Break';
          const blockType = labelRaw.toLowerCase().includes('lunch') ? 'lunch' : 'break';

          blocks.push({
            user_id: mapping.user_id,
            phorest_staff_id: staffId,
            location_id: appLocationId,
            block_date: breakDate,
            start_time: normalizeTime(startTime),
            end_time: normalizeTime(endTime),
            block_type: blockType,
            label: labelRaw,
            source: 'phorest',
            phorest_id: breakId,
            organization_id: orgId,
          });
        }

        page++;
      }

      console.log(`Branch ${branchId} break diagnostics: ${blocks.length} valid, ${skippedMissingFields} skipped (missing fields), ${skippedUnmapped} skipped (unmapped staff)`);
      if (unmappedStaffIds.size > 0) {
        console.log(`Unmapped staffIds for branch ${branchId}: ${[...unmappedStaffIds].join(', ')}`);
      }

      if (blocks.length > 0) {
        // Delete existing phorest-sourced blocks for this branch + date range, then insert fresh
        // Delete by app location ID (and also legacy branchId for cleanup)
        const { error: deleteError } = await supabase
          .from('staff_schedule_blocks')
          .delete()
          .in('location_id', [appLocationId, branchId])
          .eq('source', 'phorest')
          .gte('block_date', dateFrom)
          .lte('block_date', dateTo);

        if (deleteError) {
          console.error(`Delete error for branch ${branchId}:`, deleteError.message);
        }

        // Insert in batches
        for (let i = 0; i < blocks.length; i += 100) {
          const batch = blocks.slice(i, i + 100);
          const { error } = await supabase
            .from('staff_schedule_blocks')
            .insert(batch);
          if (error) {
            console.error(`Break insert error for branch ${branchId}:`, error.message);
            console.error(`Sample block: ${JSON.stringify(batch[0])}`);
          } else {
            totalBlocks += batch.length;
          }
        }
      }
    } catch (e: any) {
      console.log(`Break fetch failed for branch ${branchId}:`, e.message);
    }
  }

  console.log(`Break sync complete: ${totalBlocks} break blocks inserted`);
  return { synced: totalBlocks };
}

async function executeSyncWorkflow({
  supabase,
  supabaseUrl,
  supabaseServiceKey,
  businessId,
  username,
  password,
  sync_type,
  date_from,
  date_to,
  quick,
}: {
  supabase: any;
  supabaseUrl: string;
  supabaseServiceKey: string;
  businessId: string;
  username: string;
  password: string;
  sync_type: SyncRequest['sync_type'];
  date_from?: string;
  date_to?: string;
  quick?: boolean | 'far';
}) {
  console.log(`Starting Phorest sync: ${sync_type}${quick ? ` (quick mode${quick === 'far' ? ': far' : ''})` : ''}`);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let defaultFrom: string;
  let defaultTo: string;

  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd.toISOString().split('T')[0];
  };

  if (quick === 'far') {
    defaultFrom = addDays(today, 90);
    defaultTo = addDays(today, 180);
  } else if (quick) {
    defaultFrom = addDays(today, -1);
    defaultTo = addDays(today, 90);
  } else {
    defaultFrom = date_from || addDays(today, -90);
    defaultTo = date_to || addDays(today, 180);
  }

  const thisMonday = new Date();
  thisMonday.setDate(thisMonday.getDate() - thisMonday.getDay() + 1);
  const weekStart = thisMonday.toISOString().split('T')[0];

  const results: any = {};

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
    } catch (e: any) {
      console.error('Failed to send failure notification:', e);
    }
  };

  if (sync_type === 'staff' || sync_type === 'all') {
    const startedAt = new Date();
    try {
      results.staff = await syncStaff(supabase, businessId, username, password);
      await logSync(supabase, 'staff', 'success', results.staff.mapped, undefined, undefined, undefined, undefined, undefined, startedAt);
    } catch (error: any) {
      results.staff = { error: error.message };
      await logSync(supabase, 'staff', 'failed', 0, error.message, undefined, undefined, undefined, undefined, startedAt);
      notifyFailure('staff', error.message);
    }
  }

  if (sync_type === 'appointments' || sync_type === 'all') {
    const apptStartedAt = new Date();
    try {
      results.appointments = await syncAppointments(supabase, businessId, username, password, defaultFrom, defaultTo);
      await logSync(supabase, 'appointments', 'success', results.appointments.synced, undefined, undefined, undefined, undefined, undefined, apptStartedAt);
    } catch (error: any) {
      results.appointments = { error: error.message };
      await logSync(supabase, 'appointments', 'failed', 0, error.message, undefined, undefined, undefined, undefined, apptStartedAt);
      notifyFailure('appointments', error.message);
    }

    const rosterStartedAt = new Date();
    try {
      results.roster = await syncRoster(supabase, businessId, username, password, defaultFrom, defaultTo);
      await logSync(supabase, 'roster', 'success', results.roster.synced, undefined, undefined, undefined, undefined, undefined, rosterStartedAt);
    } catch (error: any) {
      results.roster = { error: error.message };
      await logSync(supabase, 'roster', 'failed', 0, error.message, undefined, undefined, undefined, undefined, rosterStartedAt);
      console.error('Roster sync failed:', error.message);
    }
  }

  if (sync_type === 'clients' || sync_type === 'all') {
    const startedAt = new Date();
    try {
      results.clients = await syncClients(supabase, businessId, username, password);
      await logSync(supabase, 'clients', 'success', results.clients.synced, undefined, undefined, undefined, undefined, undefined, startedAt);

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
      await logSync(supabase, 'clients', 'failed', 0, error.message, undefined, undefined, undefined, undefined, startedAt);
      notifyFailure('clients', error.message);
    }
  }

  if (sync_type === 'reports' || sync_type === 'all') {
    const startedAt = new Date();
    try {
      results.reports = await syncPerformanceReports(supabase, businessId, username, password, weekStart);
      await logSync(supabase, 'reports', 'success', results.reports.synced, undefined, undefined, undefined, undefined, undefined, startedAt);
    } catch (error: any) {
      results.reports = { error: error.message };
      await logSync(supabase, 'reports', 'failed', 0, error.message, undefined, undefined, undefined, undefined, startedAt);
      notifyFailure('reports', error.message);
    }
  }

  if (sync_type === 'sales' || sync_type === 'all') {
    const startedAt = new Date();
    try {
      let salesFrom: string;
      let salesTo: string;

      if (quick) {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        salesFrom = sevenDaysAgo.toISOString().split('T')[0];
        salesTo = todayStr;
      } else {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        salesFrom = date_from || ninetyDaysAgo.toISOString().split('T')[0];
        salesTo = date_to || todayStr;
      }

      console.log(`[SYNC WINDOW] Sales: salesFrom=${salesFrom} salesTo=${salesTo}`);

      results.sales = await syncSalesTransactions(supabase, businessId, username, password, salesFrom, salesTo);
      const salesStatus = (results.sales.synced_items || 0) === 0 ? 'no_data' : 'success';
      await logSync(
        supabase,
        'sales',
        salesStatus,
        results.sales.synced_items,
        salesStatus === 'no_data' ? 'All sales endpoints returned 0 records' : undefined,
        { quick },
        undefined,
        undefined,
        undefined,
        startedAt,
      );
    } catch (error: any) {
      results.sales = { error: error.message };
      await logSync(supabase, 'sales', 'failed', 0, error.message, undefined, undefined, undefined, undefined, startedAt);
      notifyFailure('sales', error.message);
    }
  }

  return { success: true, results };
}

serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let parsedBody: any;
    try {
      parsedBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ALLOWED_SYNC_TYPES = new Set(['staff', 'appointments', 'clients', 'reports', 'sales', 'all']);
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    const rawSyncType = parsedBody?.sync_type;
    if (typeof rawSyncType !== 'string' || !ALLOWED_SYNC_TYPES.has(rawSyncType)) {
      return new Response(
        JSON.stringify({ error: `Invalid sync_type. Must be one of: ${[...ALLOWED_SYNC_TYPES].join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawDateFrom = parsedBody?.date_from;
    const rawDateTo = parsedBody?.date_to;
    if (rawDateFrom !== undefined && (typeof rawDateFrom !== 'string' || !ISO_DATE_RE.test(rawDateFrom))) {
      return new Response(
        JSON.stringify({ error: "date_from must be YYYY-MM-DD format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (rawDateTo !== undefined && (typeof rawDateTo !== 'string' || !ISO_DATE_RE.test(rawDateTo))) {
      return new Response(
        JSON.stringify({ error: "date_to must be YYYY-MM-DD format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawQuick = parsedBody?.quick;
    if (rawQuick !== undefined && rawQuick !== true && rawQuick !== false && rawQuick !== 'far') {
      return new Response(
        JSON.stringify({ error: "quick must be true, false, or 'far'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sync_type = rawSyncType as SyncRequest['sync_type'];
    const date_from = rawDateFrom as string | undefined;
    const date_to = rawDateTo as string | undefined;
    const quick = rawQuick as boolean | 'far' | undefined;

    const shouldRunInBackground = !quick && (sync_type === 'appointments' || sync_type === 'all');

    if (shouldRunInBackground) {
      const startedAt = new Date().toISOString();
      EdgeRuntime.waitUntil(
        executeSyncWorkflow({
          supabase,
          supabaseUrl,
          supabaseServiceKey,
          businessId,
          username,
          password,
          sync_type,
          date_from,
          date_to,
          quick,
        }).catch((error: any) => {
          console.error(`Background Phorest sync failed for ${sync_type}:`, error?.message || error);
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          sync_type,
          started_at: startedAt,
          message: 'Phorest sync started in background. Check sync status shortly.',
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await executeSyncWorkflow({
      supabase,
      supabaseUrl,
      supabaseServiceKey,
      businessId,
      username,
      password,
      sync_type,
      date_from,
      date_to,
      quick,
    });

    return new Response(
      JSON.stringify(result),
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