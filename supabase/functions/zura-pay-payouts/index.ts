import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { resolveConnectAccount } from "../_shared/resolve-connect-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid().optional().nullable(),
  action: z.enum(["update_schedule"]).optional(),
  schedule: z
    .object({
      interval: z.enum(["daily", "weekly", "monthly", "manual"]).optional(),
      weekly_anchor: z
        .enum(["monday", "tuesday", "wednesday", "thursday", "friday"])
        .optional(),
      monthly_anchor: z.number().int().min(1).max(28).optional(),
    })
    .optional(),
  starting_after: z.string().optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Input validation
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        400
      );
    }
    const { organization_id, location_id, action, schedule, starting_after } =
      parsed.data;

    // Verify caller belongs to this organization & get role
    const { data: membership } = await supabase
      .from("employee_profiles")
      .select("user_id, is_primary_owner, is_super_admin")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return jsonResponse(
        { error: "Forbidden: not a member of this organization" },
        403
      );
    }

    const memberRole = membership.is_primary_owner
      ? "owner"
      : membership.is_super_admin
        ? "admin"
        : "member";

    // Resolve Connect account
    let connectAccountId: string;
    try {
      connectAccountId = await resolveConnectAccount(
        supabase,
        organization_id,
        location_id || null
      );
    } catch (_resolveErr) {
      return jsonResponse(
        { error: "Zura Pay is not active for this organization" },
        400
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment provider not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Handle payout schedule update — admin/owner only
    if (action === "update_schedule" && schedule) {
      const allowedRoles = ["admin", "owner"];
      if (!allowedRoles.includes(memberRole)) {
        return jsonResponse(
          {
            error:
              "Insufficient permissions. Only admins and owners can modify payout settings.",
          },
          403
        );
      }

      const updateParams: Record<string, unknown> = {};
      if (schedule.interval) updateParams.interval = schedule.interval;
      if (schedule.weekly_anchor)
        updateParams.weekly_anchor = schedule.weekly_anchor;
      if (schedule.monthly_anchor)
        updateParams.monthly_anchor = schedule.monthly_anchor;

      await stripe.accounts.update(connectAccountId, {
        settings: { payouts: { schedule: updateParams as any } },
      });

      return jsonResponse({ success: true, message: "Payout schedule updated" });
    }

    // Fetch balance, payouts, and account settings in parallel
    const payoutListParams: Record<string, unknown> = { limit: 25 };
    if (starting_after) payoutListParams.starting_after = starting_after;

    const [balance, payouts, account] = await Promise.all([
      stripe.balance.retrieve({}, { stripeAccount: connectAccountId }),
      stripe.payouts.list(payoutListParams as any, {
        stripeAccount: connectAccountId,
      }),
      stripe.accounts.retrieve(connectAccountId),
    ]);

    const payoutSchedule =
      (account.settings as any)?.payouts?.schedule || null;

    // Extract default bank account info
    const externalAccounts =
      (account as any).external_accounts?.data || [];
    const defaultBank =
      externalAccounts.find(
        (ea: any) => ea.object === "bank_account" && ea.default_for_currency
      ) ||
      externalAccounts.find((ea: any) => ea.object === "bank_account");

    const bankAccount = defaultBank
      ? {
          bank_name: defaultBank.bank_name || null,
          last4: defaultBank.last4 || null,
          routing_last4: defaultBank.routing_number
            ? defaultBank.routing_number.slice(-4)
            : null,
          currency: defaultBank.currency?.toUpperCase() || null,
          status: defaultBank.status || "new",
        }
      : null;

    return jsonResponse({
      balance: {
        available: balance.available,
        pending: balance.pending,
      },
      payouts: payouts.data.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrival_date: p.arrival_date,
        created: p.created,
        method: p.method,
        type: p.type,
        description: p.description,
      })),
      has_more: payouts.has_more,
      payout_schedule: payoutSchedule,
      bank_account: bankAccount,
    });
  } catch (error) {
    console.error("zura-pay-payouts error:", error);
    return jsonResponse(
      { error: error.message || "Internal error" },
      500
    );
  }
});
