/**
 * One-shot reconciliation: re-fetch every Phorest client whose row is
 * either missing or empty in `phorest_clients`, then patch every
 * `phorest_appointments` row whose `client_name` is still NULL.
 *
 * DOCTRINE: "Writes that conform to a contract must validate the contract
 * on the way in." The original on-demand fetch in `sync-phorest-data` upserted
 * rows even when the response had no name fields, producing rows that satisfied
 * the schema but violated the table's purpose. This function is the corrective
 * sweep: it explicitly targets the empty-name rows the regular sync skips.
 *
 * SIGNAL PRESERVATION: this function does NOT write [Deleted Client] negative-
 * cache rows. A 404 from every (branch × region) combination is not positive
 * evidence of deletion — it could mean a new branch we don't know about, a
 * permission gap, or a transient region-routing failure. Unresolvable IDs are
 * counted and surfaced to the operator; the appointment continues to render
 * "Client #ABCD" — the truthful "we have the ID, can't resolve the name."
 *
 * Operation:
 *   1. Find unique phorest_client_ids from `phorest_appointments` where
 *      `client_name IS NULL` and either no client row exists OR the row
 *      has no usable name (`name`, `first_name`, `last_name` all empty).
 *   2. Enumerate branches per-region (EU + US) so each branch is queried only
 *      against the base URL it actually lives on (cross-region queries return
 *      misleading 404s that look like "deleted").
 *   3. Probe Phorest's `/branch/{branchId}/client/{clientId}` per branch in its
 *      own region; upsert ONLY when the response carries a real name.
 *   4. Backfill `phorest_appointments.client_name` from the resolved set.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOREST_BASE_URL = "https://platform.phorest.com/third-party-api-server/api";
const PHOREST_BASE_URL_US = "https://platform-us.phorest.com/third-party-api-server/api";

async function phorestRequest(
  endpoint: string,
  businessId: string,
  username: string,
  password: string,
  preferredBase?: string,
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  const formattedUsername = username.startsWith("global/") ? username : `global/${username}`;
  const basicAuth = btoa(`${formattedUsername}:${password}`);

  const baseUrls = preferredBase
    ? [preferredBase]
    : [PHOREST_BASE_URL, PHOREST_BASE_URL_US];

  let lastStatus = 0;
  let lastError = "no attempt";

  for (const base of baseUrls) {
    const url = `${base}/business/${businessId}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.status === 301 || response.status === 302) {
        await response.text();
        continue;
      }

      if (response.status === 404) {
        await response.text();
        lastStatus = 404;
        lastError = "not found";
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        lastStatus = response.status;
        lastError = errorText.slice(0, 200);
        continue;
      }

      return { ok: true, data: await response.json() };
    } catch (e: any) {
      lastError = e?.message || "network error";
    }
  }

  return { ok: false, status: lastStatus, error: lastError };
}

interface ReconcileResult {
  scanned_appointments: number;
  unique_client_ids: number;
  fetched: number;
  unresolved_404: number;
  fetch_errors: number;
  appointments_backfilled: number;
  branches_probed: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const result: ReconcileResult = {
    scanned_appointments: 0,
    unique_client_ids: 0,
    fetched: 0,
    unresolved_404: 0,
    fetch_errors: 0,
    appointments_backfilled: 0,
    branches_probed: 0,
    errors: [],
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as any;

    // Auth: require an authenticated admin to run this (it can hit Phorest hard).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phorest credentials
    const businessId = Deno.env.get("PHOREST_BUSINESS_ID");
    const username = Deno.env.get("PHOREST_USERNAME");
    const password = Deno.env.get("PHOREST_PASSWORD");
    if (!businessId || !username || !password) {
      return new Response(
        JSON.stringify({ error: "Phorest credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Optional run cap (default 500 IDs per call)
    const body = await req.json().catch(() => ({}));
    const maxIds = Math.min(Number(body?.max_ids) || 500, 1000);

    // 1. Find appointments with NULL name + a phorest_client_id
    const { data: missingApts, error: aptErr } = await supabase
      .from("phorest_appointments")
      .select("id, phorest_client_id")
      .is("client_name", null)
      .not("phorest_client_id", "is", null)
      .limit(5000);

    if (aptErr) throw aptErr;
    result.scanned_appointments = missingApts?.length || 0;

    if (!missingApts || missingApts.length === 0) {
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allUniqueIds = [
      ...new Set(missingApts.map((a: any) => a.phorest_client_id).filter(Boolean)),
    ] as string[];

    // 2. Pull existing client rows for these IDs, decide which need (re)fetch.
    //    A row "needs refetch" if it doesn't exist OR has no usable name.
    const existingMap = new Map<string, { name: string | null; first: string | null; last: string | null }>();
    for (let i = 0; i < allUniqueIds.length; i += 200) {
      const chunk = allUniqueIds.slice(i, i + 200);
      const { data: rows } = await supabase
        .from("phorest_clients")
        .select("phorest_client_id, name, first_name, last_name")
        .in("phorest_client_id", chunk);
      (rows || []).forEach((r: any) => {
        existingMap.set(r.phorest_client_id, {
          name: r.name,
          first: r.first_name,
          last: r.last_name,
        });
      });
    }

    const resolvedNames = new Map<string, string>();
    const toFetch: string[] = [];

    for (const id of allUniqueIds) {
      const existing = existingMap.get(id);
      if (existing) {
        const usable =
          (existing.name && existing.name.trim() && existing.name !== "[Deleted Client]") ||
          [existing.first, existing.last].filter(Boolean).join(" ").trim();
        if (usable) {
          resolvedNames.set(id, usable as string);
          continue;
        }
        // [Deleted Client] negative-cache rows are intentionally NOT retried.
        if (existing.name === "[Deleted Client]") {
          resolvedNames.set(id, "[Deleted Client]");
          continue;
        }
      }
      toFetch.push(id);
    }

    const targetFetch = toFetch.slice(0, maxIds);
    result.unique_client_ids = targetFetch.length;

    // 3. Enumerate branches per-region. Each branch is queried only against
    //    the base URL it actually lives on — cross-region 404s are what
    //    produced the false [Deleted Client] flagging in the prior version.
    const branchRegion = new Map<string, string>(); // branchId -> base URL
    const euResp = await phorestRequest("/branch", businessId, username, password, PHOREST_BASE_URL);
    if (euResp.ok) {
      const list = euResp.data._embedded?.branches || euResp.data.branches ||
                   (Array.isArray(euResp.data) ? euResp.data : []);
      for (const b of list) {
        const id = b.branchId || b.id;
        if (id && !branchRegion.has(id)) branchRegion.set(id, PHOREST_BASE_URL);
      }
    } else {
      result.errors.push(`EU branch enumeration: ${euResp.error}`);
    }
    const usResp = await phorestRequest("/branch", businessId, username, password, PHOREST_BASE_URL_US);
    if (usResp.ok) {
      const list = usResp.data._embedded?.branches || usResp.data.branches ||
                   (Array.isArray(usResp.data) ? usResp.data : []);
      for (const b of list) {
        const id = b.branchId || b.id;
        if (id && !branchRegion.has(id)) branchRegion.set(id, PHOREST_BASE_URL_US);
      }
    } else {
      result.errors.push(`US branch enumeration: ${usResp.error}`);
    }

    const branchIds = Array.from(branchRegion.keys());
    result.branches_probed = branchIds.length;

    if (branchIds.length === 0) {
      result.errors.push("No branches returned from Phorest in either region");
      return new Response(JSON.stringify({ success: false, ...result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Branch-id hint: existing client rows for related IDs may already know
    // which branch they live in — probe that one first to keep API cost low.
    const branchHintMap = new Map<string, string>();
    if (targetFetch.length > 0) {
      const { data: hintRows } = await supabase
        .from("phorest_clients")
        .select("phorest_client_id, phorest_branch_id")
        .in("phorest_client_id", targetFetch)
        .not("phorest_branch_id", "is", null);
      (hintRows || []).forEach((r: any) => {
        if (r.phorest_branch_id) branchHintMap.set(r.phorest_client_id, r.phorest_branch_id);
      });
    }

    // 4. Probe each unresolved ID across branches in their own regions.
    //    Concurrency cap: 5 parallel client lookups; each iterates branches serially.
    for (let i = 0; i < targetFetch.length; i += 5) {
      const batch = targetFetch.slice(i, i + 5);
      await Promise.all(
        batch.map(async (clientId) => {
          let foundClient: any = null;
          let foundBranchId: string | null = null;
          let sawTransientError = false;

          const hint = branchHintMap.get(clientId);
          const orderedBranches = hint
            ? [hint, ...branchIds.filter((b) => b !== hint)]
            : branchIds;

          for (const branchId of orderedBranches) {
            const region = branchRegion.get(branchId) || PHOREST_BASE_URL;
            const resp = await phorestRequest(
              `/branch/${branchId}/client/${clientId}`,
              businessId,
              username,
              password,
              region, // SCOPE TO BRANCH'S OWN REGION — no cross-region 404s
            );
            if (resp.ok) {
              foundClient = resp.data;
              foundBranchId = branchId;
              break;
            }
            // 404 from a branch's own region just means "this client isn't
            // in this branch" — keep probing the others. A non-404 is a
            // transient/auth/permission issue worth noting.
            if (resp.status !== 404) {
              sawTransientError = true;
            }
          }

          if (foundClient) {
            const first = foundClient.firstName || foundClient.first_name || null;
            const last = foundClient.lastName || foundClient.last_name || null;
            const name =
              `${first || ""} ${last || ""}`.trim() || foundClient.name || null;

            // CONTRACT VALIDATION: only write if we actually got a name.
            if (!name) {
              result.fetch_errors++;
              result.errors.push(
                `Client ${clientId}: response had no name fields`,
              );
              return;
            }

            const { error: upErr } = await supabase
              .from("phorest_clients")
              .upsert(
                {
                  phorest_client_id: clientId,
                  name,
                  first_name: first,
                  last_name: last,
                  email: foundClient.email || null,
                  phone: foundClient.mobile || foundClient.phone || null,
                  phorest_branch_id: foundBranchId,
                },
                { onConflict: "phorest_client_id" },
              );

            if (upErr) {
              result.fetch_errors++;
              result.errors.push(`Upsert ${clientId}: ${upErr.message}`);
              return;
            }

            resolvedNames.set(clientId, name);
            result.fetched++;
            return;
          }

          // SIGNAL PRESERVATION: do NOT write [Deleted Client] here.
          // 404 from every (branch × region) combination is not positive
          // evidence of deletion — it could mean a new branch we don't know
          // about, a permission gap, or a region-routing failure. Leave the
          // appointment unresolved; the UI shows "Client #ABCD" placeholder.
          if (sawTransientError) {
            result.fetch_errors++;
            result.errors.push(`Client ${clientId}: transient errors across branches`);
          } else {
            result.unresolved_404++;
          }
        }),
      );
    }

    // 5. Patch appointments with resolved real names.
    for (const apt of missingApts) {
      const name = resolvedNames.get(apt.phorest_client_id);
      if (!name || name === "[Deleted Client]") continue;
      const { error } = await supabase
        .from("phorest_appointments")
        .update({ client_name: name })
        .eq("id", apt.id);
      if (!error) result.appointments_backfilled++;
    }

    // Trim error list to keep response payload manageable
    if (result.errors.length > 25) {
      result.errors = [
        ...result.errors.slice(0, 25),
        `…and ${result.errors.length - 25} more`,
      ];
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("reconcile-phorest-client-names error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
        ...result,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
