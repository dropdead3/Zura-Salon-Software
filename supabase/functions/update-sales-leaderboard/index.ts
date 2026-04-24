import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface StylistSales {
  user_id: string;
  name: string;
  totalRevenue: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { supabaseAdmin } = authResult;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    ) as any;

    // Get current week's date range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    // Fetch this week's sales by stylist from transaction items
    const txnItems: any[] = [];
    let pg = 0;
    while (true) {
      const { data: batch, error: batchErr } = await supabase
        .from('v_all_transaction_items')
        .select('stylist_user_id, total_amount, tax_amount')
        .gte('transaction_date', weekStartStr)
        .lte('transaction_date', todayStr)
        .not('stylist_user_id', 'is', null)
        .range(pg * 1000, (pg + 1) * 1000 - 1);
      if (batchErr) throw batchErr;
      if (!batch || batch.length === 0) break;
      txnItems.push(...batch);
      if (batch.length < 1000) break;
      pg++;
    }

    // Get employee names
    const userIds = [...new Set(txnItems.map((r: any) => r.stylist_user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('employee_profiles').select('user_id, full_name, display_name').in('user_id', userIds)
      : { data: [] };
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    // Aggregate by stylist
    const byUser: Record<string, StylistSales> = {};
    txnItems.forEach((row: any) => {
      if (!row.stylist_user_id) return;
      const uid = row.stylist_user_id;
      if (!byUser[uid]) {
        const prof = profileMap[uid];
        byUser[uid] = {
          user_id: uid,
          name: prof?.display_name || prof?.full_name || 'Unknown',
          totalRevenue: 0,
        };
      }
      byUser[uid].totalRevenue += (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
    });

    const rankings = Object.values(byUser)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    if (rankings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No sales data to update leaderboard' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Get last stored rankings from site_settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'last_leaderboard_rankings')
      .maybeSingle();

    const lastRankings: StylistSales[] = settingsData?.value ? JSON.parse(settingsData.value) : [];
    
    // Check if there's a new leader
    const currentLeader = rankings[0];
    const previousLeader = lastRankings[0];
    const leaderChanged = !previousLeader || previousLeader.user_id !== currentLeader.user_id;

    // Store current rankings
    await supabase.from('site_settings').upsert({
      key: 'last_leaderboard_rankings',
      value: JSON.stringify(rankings),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        rankings: rankings.slice(0, 5),
        leaderChanged,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating sales leaderboard:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
