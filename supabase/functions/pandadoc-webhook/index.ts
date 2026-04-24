import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pandadoc-signature",
};

// HMAC verification for PandaDoc webhooks
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) {
    console.warn("PANDADOC_WEBHOOK_SECRET not configured, skipping signature verification");
    return true; // Allow for development/testing when secret isn't set
  }
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === signature.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Map PandaDoc field names to organization_billing columns
interface FieldMapping {
  [key: string]: string;
}

const DEFAULT_FIELD_MAPPING: FieldMapping = {
  term_start_date: "contract_start_date",
  term_end_date: "contract_end_date",
  subscription_plan: "plan_name_lookup", // Special handling - lookup by name
  monthly_rate: "custom_price",
  promo_months: "promo_months",
  promo_rate: "promo_price",
  setup_fee: "setup_fee",
  special_notes: "notes",
};

interface PandaDocField {
  value: string | number;
  title?: string;
}

interface PandaDocRecipient {
  role: string;
  email: string;
  first_name: string;
  last_name: string;
  completed: boolean;
}

interface PandaDocPayload {
  event: string;
  data: {
    id: string;
    name: string;
    status: string;
    date_completed?: string;
    date_created?: string;
    metadata?: {
      organization_id?: string;
    };
    fields?: { [key: string]: PandaDocField };
    recipients?: PandaDocRecipient[];
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("PANDADOC_WEBHOOK_SECRET") || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("X-PandaDoc-Signature") || "";
    
    // Verify webhook signature
    if (webhookSecret && !await verifySignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PandaDocPayload = JSON.parse(rawBody);
    console.log("PandaDoc webhook received:", payload.event, payload.data.id);

    const { event, data } = payload;
    const documentId = data.id;
    const documentName = data.name;
    
    // Map PandaDoc status to our status
    const statusMap: { [key: string]: string } = {
      "document.draft": "draft",
      "document.sent": "sent",
      "document.viewed": "viewed",
      "document.completed": "completed",
      "document.voided": "voided",
      "document.declined": "declined",
    };
    
    const status = statusMap[data.status] || data.status.replace("document.", "");
    
    // Get organization_id from metadata or try to find existing document
    let organizationId = data.metadata?.organization_id;
    
    if (!organizationId) {
      // Try to find existing document record
      const { data: existingDoc } = await supabase
        .from("pandadoc_documents")
        .select("organization_id")
        .eq("pandadoc_document_id", documentId)
        .maybeSingle();
      
      if (existingDoc) {
        organizationId = existingDoc.organization_id;
      }
    }
    
    if (!organizationId) {
      console.log("No organization_id found for document:", documentId);
      return new Response(JSON.stringify({ 
        message: "Document received but no organization_id mapped",
        document_id: documentId 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signer info from recipients
    const signer = data.recipients?.find(r => r.completed);
    const signedByName = signer ? `${signer.first_name} ${signer.last_name}` : null;
    const signedByEmail = signer?.email || null;

    // Upsert the document record
    const { data: docRecord, error: docError } = await supabase
      .from("pandadoc_documents")
      .upsert({
        pandadoc_document_id: documentId,
        organization_id: organizationId,
        document_name: documentName,
        status,
        sent_at: data.status === "document.sent" ? new Date().toISOString() : undefined,
        completed_at: data.date_completed || (status === "completed" ? new Date().toISOString() : null),
        signed_by_name: signedByName,
        signed_by_email: signedByEmail,
        extracted_fields: data.fields || {},
        document_url: `https://app.pandadoc.com/a/#/documents/${documentId}`,
      }, {
        onConflict: "pandadoc_document_id",
      })
      .select()
      .single();

    if (docError) {
      console.error("Error upserting document:", docError);
      throw docError;
    }

    console.log("Document record updated:", docRecord.id);

    // If document is completed, apply fields to billing
    if (status === "completed" && data.fields && !docRecord.applied_to_billing) {
      console.log("Document completed, applying fields to billing...");
      
      // Fetch field mapping from site_settings
      const { data: mappingSettings } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "pandadoc_field_mapping")
        .maybeSingle();
      
      const fieldMapping = mappingSettings?.value || DEFAULT_FIELD_MAPPING;
      
      // Build billing update object
      const billingUpdate: Record<string, unknown> = {};
      const extractedValues: Record<string, unknown> = {};
      
      for (const [pandaDocField, billingColumn] of Object.entries(fieldMapping)) {
        const fieldData = data.fields[pandaDocField];
        if (fieldData?.value !== undefined && fieldData.value !== null && fieldData.value !== "") {
          const value = fieldData.value;
          extractedValues[pandaDocField] = value;
          
          const column = billingColumn as string;
          if (column === "plan_name_lookup") {
            // Look up plan by name
            const { data: plan } = await supabase
              .from("subscription_plans")
              .select("id")
              .ilike("name", String(value))
              .maybeSingle();
            
            if (plan) {
              billingUpdate.plan_id = plan.id;
            }
          } else if (column === "contract_start_date" || column === "contract_end_date") {
            // Parse date
            billingUpdate[column] = String(value);
          } else if (column === "custom_price" || column === "promo_price" || column === "setup_fee") {
            // Parse number
            billingUpdate[column] = parseFloat(String(value));
          } else if (column === "promo_months") {
            // Parse integer
            billingUpdate[column] = parseInt(String(value), 10);
          } else {
            // String value
            billingUpdate[column] = String(value);
          }
        }
      }

      console.log("Billing update:", billingUpdate);

      if (Object.keys(billingUpdate).length > 0) {
        // Get current billing for comparison
        const { data: currentBilling } = await supabase
          .from("organization_billing")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle();

        // Update or insert billing
        const { error: billingError } = await supabase
          .from("organization_billing")
          .upsert({
            organization_id: organizationId,
            ...billingUpdate,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "organization_id",
          });

        if (billingError) {
          console.error("Error updating billing:", billingError);
        } else {
          // Log the change
          await supabase.from("billing_changes").insert({
            organization_id: organizationId,
            change_type: "pandadoc_import",
            previous_value: currentBilling || {},
            new_value: { ...currentBilling, ...billingUpdate },
            notes: `Imported from PandaDoc: ${documentName}`,
            effective_date: new Date().toISOString(),
          });

          // Mark document as applied
          await supabase
            .from("pandadoc_documents")
            .update({
              applied_to_billing: true,
              applied_at: new Date().toISOString(),
            })
            .eq("id", docRecord.id);

          console.log("Billing updated and logged");
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      document_id: documentId,
      status 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
