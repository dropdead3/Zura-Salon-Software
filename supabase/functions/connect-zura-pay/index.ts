import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BaseSchema = z.object({
  organization_id: z.string().uuid("organization_id must be a valid UUID"),
  location_id: z.string().uuid().optional(),
});

const OnboardingSchema = BaseSchema.extend({
  action: z.enum(["create_account_and_link", "get_onboarding_link"]),
  return_url: z.string().url("return_url must be a valid URL"),
  refresh_url: z.string().url("refresh_url must be a valid URL"),
});

const ConnectLocationSchema = BaseSchema.extend({
  action: z.literal("connect_location"),
  return_url: z.string().url().optional(),
  refresh_url: z.string().url().optional(),
});

const ResetAccountSchema = BaseSchema.extend({
  action: z.literal("reset_account"),
  return_url: z.string().url().optional(),
  refresh_url: z.string().url().optional(),
});

const DisconnectLocationSchema = BaseSchema.extend({
  action: z.literal("disconnect_location"),
  location_id: z.string().uuid("location_id is required"),
});

const RequestSchema = z.discriminatedUnion("action", [
  OnboardingSchema,
  ConnectLocationSchema,
  ResetAccountSchema,
  DisconnectLocationSchema,
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Validate input
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { action, organization_id, location_id, return_url, refresh_url } = parsed.data;

    // Verify caller is org admin
    const isAdmin = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin.data) {
      return jsonResponse({ error: "Must be an organization admin" }, 403);
    }

    // Get org
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, stripe_connect_account_id, stripe_connect_status")
      .eq("id", organization_id)
      .single();
    if (orgErr || !org) {
      return jsonResponse({ error: "Organization not found" }, 404);
    }

    if (action === "create_account_and_link") {
      let accountId = org.stripe_connect_account_id;

      // Create Express account if none exists
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          business_type: "company",
          metadata: {
            organization_id: organization_id,
            platform: "zura",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;

        // Store on org
        const { error: updateErr } = await supabase
          .from("organizations")
          .update({
            stripe_connect_account_id: accountId,
            stripe_connect_status: "pending",
          })
          .eq("id", organization_id);

        if (updateErr) {
          console.error("Failed to update org:", updateErr);
          return jsonResponse({ error: "Failed to save account" }, 500);
        }
      }

      // Create Account Link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refresh_url,
        return_url: return_url,
        type: "account_onboarding",
      });

      return jsonResponse({
        onboarding_url: accountLink.url,
        account_id: accountId,
        status: "pending",
      });
    }

    if (action === "connect_location") {
      if (!location_id) {
        return jsonResponse({ error: "location_id is required for connect_location" }, 400);
      }

      // Org must have active connect account
      if (org.stripe_connect_status !== "active" || !org.stripe_connect_account_id) {
        return jsonResponse({ error: "Organization payment account is not yet active. Complete onboarding first." }, 400);
      }

      // Update the location with the org's payment account
      const { error: locErr, count } = await supabase
        .from("locations")
        .update(
          {
            stripe_account_id: org.stripe_connect_account_id,
            stripe_status: "active",
            stripe_payments_enabled: true,
          },
          { count: "exact" }
        )
        .eq("id", location_id)
        .eq("organization_id", organization_id);

      if (locErr) {
        console.error("Failed to update location:", locErr);
        return jsonResponse({ error: "Failed to connect location" }, 500);
      }

      if (count === 0) {
        return jsonResponse({ error: "Location not found or does not belong to this organization" }, 404);
      }

      return jsonResponse({ success: true });
    }

    if (action === "get_onboarding_link") {
      // Re-generate an Account Link for an existing account
      if (!org.stripe_connect_account_id) {
        return jsonResponse({ error: "No payment account exists for this organization. Use create_account_and_link first." }, 400);
      }

      const accountLink = await stripe.accountLinks.create({
        account: org.stripe_connect_account_id,
        refresh_url: refresh_url!,
        return_url: return_url!,
        type: "account_onboarding",
      });

      return jsonResponse({
        onboarding_url: accountLink.url,
        account_id: org.stripe_connect_account_id,
      });
    }

    if (action === "reset_account") {
      const accountId = org.stripe_connect_account_id;

      if (!accountId) {
        // No account to reset, just ensure status is clean
        await supabase
          .from("organizations")
          .update({ stripe_connect_status: "not_connected" })
          .eq("id", organization_id);

        return jsonResponse({ success: true, message: "No account to reset. Status cleared." });
      }

      // Check if the account has processed any charges
      try {
        const charges = await stripe.charges.list(
          { limit: 1 },
          { stripeAccount: accountId }
        );

        if (charges.data.length > 0) {
          return jsonResponse({
            error: "Cannot reset this account because it has already processed payments. Please contact support.",
          }, 400);
        }
      } catch (stripeErr) {
        // Account may already be deleted or invalid — proceed with cleanup
        console.warn("Could not check charges on account, proceeding with reset:", (stripeErr as Error).message);
      }

      // Attempt to delete the Stripe Express account
      try {
        await stripe.accounts.del(accountId);
      } catch (delErr) {
        console.warn("Could not delete Stripe account (may already be removed):", (delErr as Error).message);
      }

      // Clear org-level connect fields
      const { error: orgUpdateErr } = await supabase
        .from("organizations")
        .update({
          stripe_connect_account_id: null,
          stripe_connect_status: "not_connected",
        })
        .eq("id", organization_id);

      if (orgUpdateErr) {
        console.error("Failed to reset org:", orgUpdateErr);
        return jsonResponse({ error: "Failed to reset organization status" }, 500);
      }

      // Clear any location-level references to this account
      await supabase
        .from("locations")
        .update({
          stripe_account_id: null,
          stripe_status: null,
          stripe_payments_enabled: false,
        })
        .eq("organization_id", organization_id)
        .eq("stripe_account_id", accountId);

      return jsonResponse({ success: true, message: "Account reset successfully." });
    }

    if (action === "disconnect_location") {
      if (!body.location_id) {
        return jsonResponse({ error: "location_id is required" }, 400);
      }

      const { error: disconnectErr } = await supabase
        .from("locations")
        .update({
          stripe_account_id: null,
          stripe_status: null,
          stripe_payments_enabled: false,
        })
        .eq("id", body.location_id)
        .eq("organization_id", organization_id);

      if (disconnectErr) {
        console.error("Failed to disconnect location:", disconnectErr);
        return jsonResponse({ error: "Failed to disconnect location" }, 500);
      }

      return jsonResponse({ success: true, message: "Location disconnected." });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("connect-zura-pay error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
