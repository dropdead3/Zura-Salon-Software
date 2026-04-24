import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckInactivityPayload {
  organizationId?: string;
  dryRun?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CheckInactivityPayload = await req.json().catch(() => ({}));
    const { organizationId, dryRun = false } = payload;

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let campaignsQuery = supabase
      .from('reengagement_campaigns')
      .select('*')
      .eq('is_active', true);

    if (organizationId) {
      campaignsQuery = campaignsQuery.eq('organization_id', organizationId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active campaigns found", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let totalProcessed = 0;
    const results: Array<{ campaignId: string; clientsContacted: number }> = [];

    for (const campaign of campaigns) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - campaign.inactivity_days);

      const { data: inactiveClients, error: clientsError } = await supabase
        .from('phorest_clients')
        .select('id, name, email, last_visit')
        .eq('location_id', campaign.organization_id)
        .lt('last_visit', cutoffDate.toISOString())
        .not('email', 'is', null)
        .limit(50);

      if (clientsError) {
        console.error(`Error fetching clients for campaign ${campaign.id}:`, clientsError);
        continue;
      }

      if (!inactiveClients || inactiveClients.length === 0) {
        results.push({ campaignId: campaign.id, clientsContacted: 0 });
        continue;
      }

      const { data: existingOutreach } = await supabase
        .from('reengagement_outreach')
        .select('client_id')
        .eq('campaign_id', campaign.id);

      const contactedClientIds = new Set((existingOutreach || []).map(o => o.client_id));
      const clientsToContact = inactiveClients.filter(c => !contactedClientIds.has(c.id));

      if (clientsToContact.length === 0) {
        results.push({ campaignId: campaign.id, clientsContacted: 0 });
        continue;
      }

      let emailSubject = "We Miss You!";
      let emailBody = "";

      if (campaign.email_template_id) {
        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, html_body')
          .eq('id', campaign.email_template_id)
          .single();

        if (template) {
          emailSubject = template.subject;
          emailBody = template.html_body;
        }
      }

      let clientsContacted = 0;

      for (const client of clientsToContact) {
        if (!client.email) continue;

        const daysInactive = Math.floor(
          (new Date().getTime() - new Date(client.last_visit).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (!dryRun) {
          const { error: outreachError } = await supabase
            .from('reengagement_outreach')
            .insert({
              campaign_id: campaign.id,
              client_id: client.id,
              last_visit_date: client.last_visit,
              days_inactive: daysInactive,
              channel: 'email',
              status: 'sent',
            });

          if (outreachError) {
            console.error(`Error creating outreach for client ${client.id}:`, outreachError);
            continue;
          }

          let finalBody = emailBody || `
            <p>Hi ${client.name},</p>
            <p>It's been a while since we've seen you, and we wanted to let you know we miss you!</p>
            ${campaign.offer_type && campaign.offer_value ? `
              <p><strong>Special offer just for you:</strong> ${campaign.offer_value}</p>
            ` : ''}
            <p>We'd love to welcome you back. Book your next appointment today!</p>
          `;

          finalBody = finalBody
            .replace(/{{client_name}}/g, client.name)
            .replace(/{{days_inactive}}/g, String(daysInactive))
            .replace(/{{offer_value}}/g, campaign.offer_value || '');

          try {
            await sendOrgEmail(supabase, campaign.organization_id, {
              to: [client.email],
              subject: emailSubject.replace(/{{client_name}}/g, client.name),
              html: finalBody,
              clientId: client.id,
            });
            clientsContacted++;
          } catch (emailError) {
            console.error(`Error sending email to ${client.email}:`, emailError);
          }
        } else {
          clientsContacted++;
        }
      }

      totalProcessed += clientsContacted;
      results.push({ campaignId: campaign.id, clientsContacted });
    }

    return new Response(
      JSON.stringify({ success: true, dryRun, totalProcessed, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-client-inactivity:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
