import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Use 'any' for Supabase client since we don't have generated types in edge functions
type SupabaseClientAny = SupabaseClient<any, any, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe signature verification using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!secret) {
    console.warn("STRIPE_WEBHOOK_SECRET not configured - skipping verification");
    return true;
  }

  if (!signature) {
    console.error("No stripe-signature header present");
    return false;
  }

  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
  const sig = elements.find(e => e.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) {
    console.error("Invalid signature format");
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.error("Webhook timestamp too old");
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expected = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    const expectedHex = Array.from(new Uint8Array(expected))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedHex === sig;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

async function sendPaymentFailedEmail(
  resend: Resend | null,
  org: { id: string; name: string; slug: string; billing_email?: string },
  invoice: Record<string, unknown>
) {
  if (!resend) {
    console.log("Resend not configured - skipping email");
    return;
  }

  const amount = ((invoice.amount_due as number) || 0) / 100;
  const failedAt = new Date().toLocaleString('en-US', { 
    timeZone: 'America/Denver',
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const reason = (invoice.last_payment_error as Record<string, unknown>)?.message || 'Unknown';
  const attemptCount = (invoice.attempt_count as number) || 1;
  const nextAttempt = invoice.next_payment_attempt 
    ? new Date((invoice.next_payment_attempt as number) * 1000).toLocaleDateString()
    : 'No retry scheduled';

  try {
    await resend.emails.send({
      from: "Platform Alerts <alerts@mail.yourdomain.com>",
      to: ["platform-admins@yourdomain.com"],
      subject: `🚨 Payment Failed: ${org.name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">🚨 URGENT: Payment Failed</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0;">A subscription payment has failed and requires attention:</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b;">Organization:</td><td style="padding: 8px 0; font-weight: 600;">${org.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Amount:</td><td style="padding: 8px 0; font-weight: 600;">$${amount.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Failed At:</td><td style="padding: 8px 0;">${failedAt}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Reason:</td><td style="padding: 8px 0; color: #dc2626;">${reason}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Attempt:</td><td style="padding: 8px 0;">${attemptCount} of 4</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Next Retry:</td><td style="padding: 8px 0;">${nextAttempt}</td></tr>
              </table>
            </div>
            <div style="margin-top: 24px;">
              <a href="https://yourdomain.com/dashboard/platform/accounts/${org.slug}" 
                 style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                View Account
              </a>
            </div>
          </div>
        </div>
      `,
    });
    console.log("Payment failed email sent successfully");
  } catch (error) {
    console.error("Failed to send payment failed email:", error);
  }
}

async function handlePaymentFailed(
  supabase: SupabaseClientAny,
  resend: Resend | null,
  invoice: Record<string, unknown>
) {
  const customerId = invoice.customer as string;
  console.log(`Handling payment failure for customer: ${customerId}`);

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, billing_email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`Organization not found for Stripe customer: ${customerId}`);
    return;
  }

  console.log(`Found organization: ${org.name} (${org.id})`);

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('id', org.id);

  if (updateError) {
    console.error("Failed to update org status:", updateError);
  }

  const amount = ((invoice.amount_due as number) || 0) / 100;
  const reason = (invoice.last_payment_error as Record<string, unknown>)?.message || 'Unknown';
  
  const { error: notifError } = await supabase
    .from('platform_notifications')
    .insert({
      type: 'payment_failed',
      severity: 'critical',
      title: `Payment Failed: ${org.name}`,
      message: `Invoice for $${amount.toFixed(2)} failed. Reason: ${reason}`,
      link: `/dashboard/platform/accounts/${org.slug}`,
      metadata: {
        organization_id: org.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due,
        attempt_count: invoice.attempt_count,
        next_attempt: invoice.next_payment_attempt,
        failure_reason: reason,
      }
    });

  if (notifError) {
    console.error("Failed to create notification:", notifError);
  }

  await supabase.from('subscription_invoices').upsert({
    organization_id: org.id,
    stripe_invoice_id: invoice.id as string,
    amount: amount,
    status: 'unpaid',
    description: `Payment failed: ${reason}`,
  }, {
    onConflict: 'stripe_invoice_id'
  });

  await sendPaymentFailedEmail(resend, org, invoice);
  console.log(`Payment failure processed for ${org.name}`);
}

async function handlePaymentSucceeded(
  supabase: SupabaseClientAny,
  invoice: Record<string, unknown>
) {
  const customerId = invoice.customer as string;
  console.log(`Handling payment success for customer: ${customerId}`);

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`Organization not found for Stripe customer: ${customerId}`);
    return;
  }

  await supabase
    .from('organizations')
    .update({ subscription_status: 'active' })
    .eq('id', org.id);

  const { data: prevNotifs } = await supabase
    .from('platform_notifications')
    .select('id')
    .eq('type', 'payment_failed')
    .eq('metadata->>organization_id', org.id)
    .eq('is_read', false)
    .limit(1);

  if (prevNotifs && prevNotifs.length > 0) {
    const amount = ((invoice.amount_due as number) || 0) / 100;
    await supabase.from('platform_notifications').insert({
      type: 'payment_recovered',
      severity: 'info',
      title: `Payment Recovered: ${org.name}`,
      message: `Invoice for $${amount.toFixed(2)} was successfully paid.`,
      link: `/dashboard/platform/accounts/${org.slug}`,
      metadata: {
        organization_id: org.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due,
      }
    });

    await supabase
      .from('platform_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('type', 'payment_failed')
      .eq('metadata->>organization_id', org.id);
  }

  await supabase.from('subscription_invoices').upsert({
    organization_id: org.id,
    stripe_invoice_id: invoice.id as string,
    amount: ((invoice.amount_due as number) || 0) / 100,
    status: 'paid',
    paid_at: new Date().toISOString(),
  }, {
    onConflict: 'stripe_invoice_id'
  });

  console.log(`Payment success processed for ${org.name}`);
}

async function handleChargeFailed(
  supabase: SupabaseClientAny,
  charge: Record<string, unknown>
) {
  const customerId = charge.customer as string;
  if (!customerId) {
    console.log("Charge failed with no customer - skipping");
    return;
  }

  console.log(`Handling charge failure for customer: ${customerId}`);

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.warn(`Organization not found for Stripe customer: ${customerId}`);
    return;
  }

  const amount = ((charge.amount as number) || 0) / 100;
  const reason = (charge.failure_message as string) || 'Unknown';

  await supabase.from('platform_notifications').insert({
    type: 'payment_failed',
    severity: 'error',
    title: `Charge Failed: ${org.name}`,
    message: `Charge for $${amount.toFixed(2)} failed. Reason: ${reason}`,
    link: `/dashboard/platform/accounts/${org.slug}`,
    metadata: {
      organization_id: org.id,
      stripe_charge_id: charge.id,
      amount: charge.amount,
      failure_reason: reason,
    }
  });

  console.log(`Charge failure notification created for ${org.name}`);
}

// Handler for checkout.session.completed (color bar addon)
async function handleCheckoutCompleted(
  supabase: SupabaseClientAny,
  session: Record<string, unknown>
) {
  const metadata = session.metadata as Record<string, string> | null;
  if (!metadata || metadata.addon_type !== 'color-bar' ) {
    console.log("Checkout session not a color bar addon - skipping");
    return;
  }

  const orgId = metadata.organization_id;
  const scaleCount = parseInt(metadata.scale_count || '0', 10);
  const billingInterval = metadata.billing_interval || 'monthly';
  const stripeSubId = (session.subscription as string) || null;

  // Parse location IDs
  let locationPlans: { location_id: string; plan_tier: string; stylist_count: number }[] = [];

  if (metadata.location_plans) {
    try {
      const parsed = JSON.parse(metadata.location_plans);
      // Normalize: ensure all have plan_tier = 'standard'
      locationPlans = parsed.map((lp: any) => ({
        location_id: lp.location_id,
        plan_tier: 'standard',
        stylist_count: lp.stylist_count || 0,
      }));
    } catch (e) {
      console.error("Failed to parse location_plans metadata:", e);
    }
  }

  // Fallback: use location_ids array
  if (locationPlans.length === 0) {
    const locationIds = metadata.location_ids ? JSON.parse(metadata.location_ids) as string[] : [];
    locationPlans = locationIds.map((locId: string) => ({
      location_id: locId,
      plan_tier: 'standard',
      stylist_count: 0,
    }));
  }

  console.log(`Enabling color bar for organization: ${orgId}, locations: ${locationPlans.length}, scales: ${scaleCount}, interval: ${billingInterval}`);

  // 1. Upsert the org-level feature flag (master switch)
  const planSummary = locationPlans.map((lp) => `${lp.location_id}:${lp.plan_tier}`).join(', ');
  const { error } = await supabase
    .from('organization_feature_flags')
    .upsert({
      organization_id: orgId,
      flag_key: 'color_bar_enabled',
      is_enabled: true,
      override_reason: `Stripe checkout completed — ${locationPlans.length} location(s), ${scaleCount} scale(s)`,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'organization_id,flag_key',
    });

  if (error) {
    console.error("Failed to enable color bar flag:", error);
  } else {
    console.log(`Backroom master switch enabled for org ${orgId}`);
  }

  // 2. Store plan details in a separate flag for reference
  await supabase
    .from('organization_feature_flags')
    .upsert({
      organization_id: orgId,
      flag_key: 'color_bar_plan',
      is_enabled: true,
      override_reason: JSON.stringify({
        location_plans: locationPlans,
        scale_count: scaleCount,
        billing_interval: billingInterval,
      }),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'organization_id,flag_key',
    });

  // 3. Create per-location entitlement rows with correct plan_tier per location
  if (locationPlans.length > 0) {
    const scalesPerLocation = locationPlans.length > 0
      ? Math.max(0, Math.floor(scaleCount / locationPlans.length))
      : 0;
    const remainder = scaleCount - (scalesPerLocation * locationPlans.length);

    const activatedAt = new Date().toISOString();
    const refundEligibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const entitlementRows = locationPlans.map((lp, idx) => ({
      organization_id: orgId,
      location_id: lp.location_id,
      plan_tier: lp.plan_tier,
      scale_count: scalesPerLocation + (idx === 0 ? remainder : 0),
      status: 'active',
      trial_end_date: null,
      billing_interval: billingInterval,
      stripe_subscription_id: stripeSubId,
      activated_at: activatedAt,
      refund_eligible_until: refundEligibleUntil,
      notes: `Created via Stripe checkout — ${lp.plan_tier} (${lp.stylist_count} stylists)`,
    }));

    const { error: entError } = await supabase
      .from('backroom_location_entitlements')
      .upsert(entitlementRows, {
        onConflict: 'organization_id,location_id',
      });

    if (entError) {
      console.error("Failed to create location entitlements:", entError);
    } else {
      console.log(`Created ${locationPlans.length} location entitlement(s) for org ${orgId}`);
    }
  }

  // 4. Create hardware order record for physical scale fulfillment
  if (scaleCount > 0) {
    const { error: hwError } = await supabase
      .from('hardware_orders')
      .insert({
        organization_id: orgId,
        stripe_checkout_session_id: session.id as string,
        stripe_subscription_id: stripeSubId,
        item_type: 'precision_scale',
        quantity: scaleCount,
        unit_price_cents: 19900,
        fulfillment_status: 'pending',
        notes: `Auto-created from checkout — ${scaleCount} scale(s), ${billingInterval} billing`,
      });

    if (hwError) {
      console.error("Failed to create hardware order:", hwError);
    } else {
      console.log(`Hardware order created: ${scaleCount} scale(s) for org ${orgId}`);
    }
  }
}

// Handler for customer.subscription.deleted
async function handleSubscriptionDeleted(
  supabase: SupabaseClientAny,
  resend: Resend | null,
  subscription: Record<string, unknown>
) {
  const customerId = subscription.customer as string;
  console.log(`Handling subscription deletion for customer: ${customerId}`);

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.warn(`Organization not found for Stripe customer: ${customerId}`);
    return;
  }

  // Check if this was a color bar subscription
  const subMetadata = subscription.metadata as Record<string, string> | null;
  if (subMetadata?.addon_type === 'color-bar' ) {
    // Disable color bar feature flag (master switch)
    await supabase
      .from('organization_feature_flags')
      .upsert({
        organization_id: org.id,
        flag_key: 'color_bar_enabled',
        is_enabled: false,
        override_reason: 'Stripe subscription cancelled',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,flag_key',
      });

    // Cancel all location entitlements tied to this subscription
    const stripeSubId = subscription.id as string;
    const { error: entError } = await supabase
      .from('backroom_location_entitlements')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('organization_id', org.id)
      .eq('stripe_subscription_id', stripeSubId);

    if (entError) {
      console.error("Failed to cancel location entitlements:", entError);
    } else {
      console.log(`Location entitlements cancelled for org ${org.id} (sub ${stripeSubId})`);
    }

    console.log(`Color Bar disabled for org ${org.id} after subscription cancellation`);
  }

  await supabase
    .from('organizations')
    .update({ subscription_status: 'cancelled' })
    .eq('id', org.id);

  await supabase.from('platform_notifications').insert({
    type: 'payment_failed',
    severity: 'critical',
    title: `Subscription Cancelled: ${org.name}`,
    message: `The subscription has been cancelled. Immediate attention required.`,
    link: `/dashboard/platform/accounts/${org.slug}`,
    metadata: {
      organization_id: org.id,
      stripe_subscription_id: subscription.id,
      cancelled_at: new Date().toISOString(),
    }
  });

  console.log(`Subscription deletion processed for ${org.name}`);
}

// Handler for customer.subscription.updated
async function handleSubscriptionUpdated(
  supabase: SupabaseClientAny,
  subscription: Record<string, unknown>
) {
  const customerId = subscription.customer as string;
  const status = subscription.status as string;
  
  console.log(`Handling subscription update for customer: ${customerId}, status: ${status}`);

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.warn(`Organization not found for Stripe customer: ${customerId}`);
    return;
  }

  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'trialing': 'active',
  };

  const mappedStatus = statusMap[status] || 'active';

  await supabase
    .from('organizations')
    .update({ subscription_status: mappedStatus })
    .eq('id', org.id);

  console.log(`Subscription status updated to ${mappedStatus} for ${org.name}`);
}

// Handler for terminal payment_intent.succeeded (G1 — eventual consistency for card-present payments)
async function handleTerminalPaymentIntentSucceeded(
  supabase: SupabaseClientAny,
  paymentIntent: Record<string, unknown>
) {
  const metadata = paymentIntent.metadata as Record<string, string> | null;
  const appointmentId = metadata?.appointment_id;
  if (!appointmentId) {
    console.log("payment_intent.succeeded has no appointment_id metadata — skipping");
    return;
  }

  const piId = paymentIntent.id as string;
  console.log(`Terminal PI succeeded: ${piId} for appointment ${appointmentId}`);

  // Idempotent update — only update if not already paid
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_method: 'card_reader',
      stripe_payment_intent_id: piId,
    })
    .eq('id', appointmentId)
    .neq('payment_status', 'paid');

  if (error) {
    console.error("Failed to update appointment from PI webhook:", error);
  } else {
    console.log(`Appointment ${appointmentId} marked paid via webhook`);
  }
}

// Handler for terminal payment_intent.payment_failed
async function handleTerminalPaymentIntentFailed(
  supabase: SupabaseClientAny,
  paymentIntent: Record<string, unknown>
) {
  const metadata = paymentIntent.metadata as Record<string, string> | null;
  const appointmentId = metadata?.appointment_id;
  if (!appointmentId) {
    console.log("payment_intent.payment_failed has no appointment_id metadata — skipping");
    return;
  }

  const piId = paymentIntent.id as string;
  const errorMsg = (paymentIntent.last_payment_error as Record<string, unknown>)?.message || 'Unknown';
  console.log(`Terminal PI failed: ${piId} for appointment ${appointmentId} — ${errorMsg}`);

  // Update appointment to reflect failed payment
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'failed',
    })
    .eq('id', appointmentId)
    .neq('payment_status', 'paid'); // Don't overwrite a paid status

  if (error) {
    console.error("Failed to update appointment from PI failure webhook:", error);
  }
}

// Handler for payment_method.detached — auto-remove cards on file
async function handlePaymentMethodDetached(
  supabase: SupabaseClientAny,
  paymentMethod: any,
  connectedAccountId: string
) {
  const paymentMethodId = paymentMethod.id as string;
  if (!paymentMethodId) {
    console.log("payment_method.detached has no id — skipping");
    return;
  }

  console.log(`payment_method.detached: PM ${paymentMethodId}, account ${connectedAccountId}`);

  // Look up organization_id from the connected account
  const { data: orgAccount, error: orgError } = await supabase
    .from("organization_stripe_accounts")
    .select("organization_id")
    .eq("stripe_account_id", connectedAccountId)
    .maybeSingle();

  if (orgError || !orgAccount) {
    console.log(`No org found for connected account ${connectedAccountId} — skipping`);
    return;
  }

  const organizationId = orgAccount.organization_id;

  // Hard-delete the matching card on file
  const { data: deleted, error: deleteError } = await supabase
    .from("client_cards_on_file")
    .delete()
    .eq("stripe_payment_method_id", paymentMethodId)
    .eq("organization_id", organizationId)
    .select("id");

  if (deleteError) {
    console.error("Error deleting card on file:", deleteError);
    return;
  }

  const count = deleted?.length ?? 0;
  console.log(`payment_method.detached: deleted ${count} card(s) for PM ${paymentMethodId} in org ${organizationId}`);
}

// Handler for customer.deleted — bulk-remove all cards on file for that customer
async function handleCustomerDeleted(
  supabase: SupabaseClientAny,
  customer: any,
  connectedAccountId: string
) {
  const customerId = customer.id as string;
  if (!customerId) {
    console.log("customer.deleted has no id — skipping");
    return;
  }

  console.log(`customer.deleted: Customer ${customerId}, account ${connectedAccountId}`);

  // Look up organization_id from the connected account
  const { data: orgAccount, error: orgError } = await supabase
    .from("organization_stripe_accounts")
    .select("organization_id")
    .eq("stripe_account_id", connectedAccountId)
    .maybeSingle();

  if (orgError || !orgAccount) {
    console.log(`No org found for connected account ${connectedAccountId} — skipping`);
    return;
  }

  const organizationId = orgAccount.organization_id;

  // Bulk-delete all cards on file for this customer
  const { data: deleted, error: deleteError } = await supabase
    .from("client_cards_on_file")
    .delete()
    .eq("stripe_customer_id", customerId)
    .eq("organization_id", organizationId)
    .select("id");

  if (deleteError) {
    console.error("Error bulk-deleting cards on file for customer:", deleteError);
    return;
  }

  const count = deleted?.length ?? 0;
  console.log(`customer.deleted: deleted ${count} card(s) for customer ${customerId} in org ${organizationId}`);
}

// Handler for payment_method.updated — sync card details (brand, last4, expiration)
async function handlePaymentMethodUpdated(
  supabase: SupabaseClientAny,
  paymentMethod: any,
  connectedAccountId: string
) {
  const paymentMethodId = paymentMethod.id as string;
  if (!paymentMethodId) {
    console.log("payment_method.updated has no id — skipping");
    return;
  }

  const card = paymentMethod.card;
  if (!card) {
    console.log("payment_method.updated has no card details — skipping");
    return;
  }

  console.log(`payment_method.updated: PM ${paymentMethodId}, account ${connectedAccountId}`);

  // Look up organization_id from the connected account
  const { data: orgAccount, error: orgError } = await supabase
    .from("organization_stripe_accounts")
    .select("organization_id")
    .eq("stripe_account_id", connectedAccountId)
    .maybeSingle();

  if (orgError || !orgAccount) {
    console.log(`No org found for connected account ${connectedAccountId} — skipping`);
    return;
  }

  const organizationId = orgAccount.organization_id;

  // Update card details on the matching row
  const { data: updated, error: updateError } = await supabase
    .from("client_cards_on_file")
    .update({
      card_brand: (card.brand as string) || "unknown",
      card_last4: (card.last4 as string) || "****",
      card_exp_month: (card.exp_month as number) || 0,
      card_exp_year: (card.exp_year as number) || 0,
    })
    .eq("stripe_payment_method_id", paymentMethodId)
    .eq("organization_id", organizationId)
    .select("id");

  if (updateError) {
    console.error("Error updating card on file:", updateError);
    return;
  }

  const count = updated?.length ?? 0;
  console.log(`payment_method.updated: synced ${count} card(s) for PM ${paymentMethodId} in org ${organizationId}`);
}

// Handler for setup_intent.succeeded — auto-insert cards on file
async function handleSetupIntentSucceeded(
  supabase: SupabaseClientAny,
  setupIntent: Record<string, unknown>,
  connectedAccountId: string
) {
  const paymentMethodId = setupIntent.payment_method as string;
  const stripeCustomerId = setupIntent.customer as string;
  const metadata = setupIntent.metadata as Record<string, string> | null;

  if (!paymentMethodId) {
    console.log("setup_intent.succeeded has no payment_method — skipping");
    return;
  }

  console.log(`setup_intent.succeeded: PM ${paymentMethodId}, customer ${stripeCustomerId}, account ${connectedAccountId}`);

  // 1. Look up organization by Connected Account ID
  const { data: orgAccount } = await supabase
    .from("organization_stripe_accounts")
    .select("organization_id")
    .eq("stripe_account_id", connectedAccountId)
    .single();

  if (!orgAccount) {
    console.warn(`No organization found for Connected Account ${connectedAccountId}`);
    return;
  }

  const organizationId = orgAccount.organization_id;

  // 2. Fetch payment method details from Stripe
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY not configured — cannot fetch PM details");
    return;
  }

  let pmDetails: Record<string, unknown> | null = null;
  try {
    const pmResponse = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}`, {
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Stripe-Account": connectedAccountId,
      },
    });
    if (pmResponse.ok) {
      pmDetails = await pmResponse.json();
    } else {
      console.error(`Failed to fetch PM ${paymentMethodId}: ${pmResponse.status}`);
      return;
    }
  } catch (err) {
    console.error("Error fetching payment method from Stripe:", err);
    return;
  }

  const card = pmDetails?.card as Record<string, unknown> | null;
  if (!card) {
    console.log("Payment method has no card details — skipping");
    return;
  }

  // 3. Resolve client_id
  let clientId = metadata?.client_id || null;

  if (!clientId && stripeCustomerId) {
    // Fallback: look up by stripe_customer_id in clients table
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .eq("organization_id", organizationId)
      .single();

    if (client) {
      clientId = client.id;
    } else {
      // Try phorest_clients as another fallback
      const { data: phorestClient } = await supabase
        .from("phorest_clients")
        .select("id")
        .eq("stripe_customer_id", stripeCustomerId)
        .eq("organization_id", organizationId)
        .single();

      if (phorestClient) {
        clientId = phorestClient.id;
      }
    }
  }

  if (!clientId) {
    console.warn(`Could not resolve client_id for customer ${stripeCustomerId} in org ${organizationId}`);
    return;
  }

  // 4. Upsert into client_cards_on_file
  const { error: upsertError } = await supabase
    .from("client_cards_on_file")
    .upsert({
      client_id: clientId,
      organization_id: organizationId,
      stripe_payment_method_id: paymentMethodId,
      stripe_customer_id: stripeCustomerId,
      card_brand: (card.brand as string) || "unknown",
      card_last4: (card.last4 as string) || "****",
      card_exp_month: (card.exp_month as number) || 0,
      card_exp_year: (card.exp_year as number) || 0,
      is_default: false,
    }, {
      onConflict: "stripe_payment_method_id,organization_id",
    });

  if (upsertError) {
    console.error("Failed to upsert card on file:", upsertError);
  } else {
    console.log(`Card on file saved: ${card.brand} ****${card.last4} for client ${clientId}`);
  }
}

// G3: Handler for charge.refunded — sync refunds initiated outside Zura (e.g. Stripe Dashboard)
async function handleChargeRefunded(
  supabase: SupabaseClientAny,
  charge: Record<string, unknown>
) {
  const piId = charge.payment_intent as string;
  if (!piId) {
    console.log("charge.refunded has no payment_intent — skipping");
    return;
  }

  console.log(`charge.refunded for PI: ${piId}`);

  // Find appointment by PI ID (standard service payment)
  let { data: appointment } = await supabase
    .from("appointments")
    .select("id, organization_id, payment_status, cancellation_fee_status, cancellation_fee_charged")
    .eq("stripe_payment_intent_id", piId)
    .single();

  // Fallback: check if this PI belongs to a cancellation fee charge
  let isCancellationFeeRefund = false;
  if (!appointment) {
    const { data: feeAppt } = await supabase
      .from("appointments")
      .select("id, organization_id, payment_status, cancellation_fee_status, cancellation_fee_charged")
      .eq("cancellation_fee_stripe_payment_id", piId)
      .single();

    if (feeAppt) {
      appointment = feeAppt;
      isCancellationFeeRefund = true;
    }
  }

  if (!appointment) {
    console.log(`No appointment found for PI ${piId} — may be a non-terminal refund`);
    return;
  }

  // Handle cancellation fee refund separately
  if (isCancellationFeeRefund) {
    await supabase
      .from("appointments")
      .update({
        cancellation_fee_status: "refunded",
        cancellation_fee_charged: 0,
      })
      .eq("id", appointment.id);
    console.log(`Cancellation fee refunded for appointment ${appointment.id}`);
    return;
  }

  // Update any pending refund records for this appointment's org
  const { data: pendingRefunds } = await supabase
    .from("refund_records")
    .select("id")
    .eq("original_transaction_id", appointment.id)
    .eq("status", "pending");

  if (pendingRefunds && pendingRefunds.length > 0) {
    for (const refund of pendingRefunds) {
      await supabase
        .from("refund_records")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          notes: "Refund completed via Stripe Dashboard",
        })
        .eq("id", refund.id);
    }
    console.log(`Updated ${pendingRefunds.length} pending refund record(s) for appointment ${appointment.id}`);
  }

  // Update appointment payment status
  const refundAmount = (charge.amount_refunded as number) || 0;
  const chargeAmount = (charge.amount as number) || 0;
  const isFullRefund = refundAmount >= chargeAmount;

  if (isFullRefund) {
    await supabase
      .from("appointments")
      .update({ payment_status: "refunded" })
      .eq("id", appointment.id);
    console.log(`Appointment ${appointment.id} marked as fully refunded`);
  } else {
    console.log(`Partial refund on appointment ${appointment.id}: ${refundAmount}/${chargeAmount} cents`);
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (webhookSecret && !await verifyStripeSignature(payload, signature, webhookSecret)) {
      console.error("Invalid Stripe webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(payload);
    const isConnectEvent = !!event.account; // G3: Connect events have an `account` field
    console.log(`Stripe webhook received: ${event.type}`, event.id, isConnectEvent ? `(Connect: ${event.account})` : '(Platform)');

    switch (event.type) {
      // --- Platform subscription events (non-Connect) ---
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;

      case "invoice.payment_failed":
        if (!isConnectEvent) await handlePaymentFailed(supabase, resend, event.data.object);
        break;
        
      case "invoice.payment_succeeded":
        if (!isConnectEvent) await handlePaymentSucceeded(supabase, event.data.object);
        break;
        
      case "charge.failed":
        if (!isConnectEvent) await handleChargeFailed(supabase, event.data.object);
        break;
        
      case "customer.subscription.deleted":
        if (!isConnectEvent) await handleSubscriptionDeleted(supabase, resend, event.data.object);
        break;
        
      case "customer.subscription.updated":
        if (!isConnectEvent) await handleSubscriptionUpdated(supabase, event.data.object);
        break;

      // --- Connect terminal events ---
      case "payment_intent.succeeded":
        await handleTerminalPaymentIntentSucceeded(supabase, event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handleTerminalPaymentIntentFailed(supabase, event.data.object);
        break;

      // G3: Refunds initiated outside Zura
      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object);
        break;

      // Auto-insert cards on file when SetupIntent completes
      case "setup_intent.succeeded":
        if (isConnectEvent) {
          await handleSetupIntentSucceeded(supabase, event.data.object, event.account);
        }
        break;

      // Auto-remove cards on file when payment method is detached
      case "payment_method.detached":
        if (isConnectEvent) {
          await handlePaymentMethodDetached(supabase, event.data.object, event.account);
        }
        break;

      // Sync card details when payment method is updated (e.g. network auto-update)
      case "payment_method.updated":
        if (isConnectEvent) {
          await handlePaymentMethodUpdated(supabase, event.data.object, event.account);
        }
        break;

      // Bulk-remove all cards on file when a Stripe Customer is deleted
      case "customer.deleted":
        if (isConnectEvent) {
          await handleCustomerDeleted(supabase, event.data.object, event.account);
        }
        break;
         
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
