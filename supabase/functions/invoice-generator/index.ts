import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice_number: string;
  organization_id: string;
  organization_name: string;
  billing_email: string;
  billing_address?: string;
  invoice_date: string;
  due_date: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { organization_id, manual } = await req.json().catch(() => ({}));

    // Get organizations that need invoices
    let query = adminClient
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        billing_email,
        subscription_status,
        monthly_price,
        price_per_user,
        billing_cycle_day
      `)
      .in('subscription_status', ['active', 'past_due']);

    if (organization_id) {
      query = query.eq('id', organization_id);
    }

    const { data: organizations, error: orgsError } = await query;
    if (orgsError) throw orgsError;

    const now = new Date();
    const currentDay = now.getDate();
    const results = {
      invoicesGenerated: 0,
      invoices: [] as InvoiceData[],
    };

    for (const org of organizations || []) {
      // Check if it's billing day (or manual trigger)
      const billingDay = org.billing_cycle_day || 1;
      if (!manual && currentDay !== billingDay) continue;

      // Check if invoice already exists for this period
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: existingInvoice } = await adminClient
        .from('subscription_invoices')
        .select('id')
        .eq('organization_id', org.id)
        .gte('created_at', periodStart.toISOString())
        .limit(1)
        .single();

      if (existingInvoice && !manual) continue;

      // Get user count for per-user billing
      const { count: userCount } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('is_approved', true);

      // Build line items
      const lineItems: InvoiceLineItem[] = [];
      
      if (org.monthly_price) {
        lineItems.push({
          description: 'Monthly Platform Subscription',
          quantity: 1,
          unit_price: org.monthly_price,
          total: org.monthly_price,
        });
      }

      if (org.price_per_user && (userCount || 0) > 0) {
        lineItems.push({
          description: `Per-User Fee (${userCount} users)`,
          quantity: userCount || 0,
          unit_price: org.price_per_user,
          total: (org.price_per_user || 0) * (userCount || 0),
        });
      }

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = 0; // Could be configurable per org
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = `INV-${org.slug.toUpperCase().slice(0, 4)}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(results.invoicesGenerated + 1).padStart(4, '0')}`;

      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData: InvoiceData = {
        invoice_number: invoiceNumber,
        organization_id: org.id,
        organization_name: org.name,
        billing_email: org.billing_email || '',
        invoice_date: now.toISOString(),
        due_date: dueDate.toISOString(),
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        status: 'draft',
      };

      // Store invoice
      const { error: invoiceError } = await adminClient
        .from('subscription_invoices')
        .insert({
          organization_id: org.id,
          invoice_number: invoiceNumber,
          amount_due: Math.round(total * 100), // Store in cents
          status: 'pending',
          due_date: dueDate.toISOString(),
          line_items: lineItems,
          metadata: invoiceData,
        });

      if (invoiceError) {
        console.error('Failed to create invoice:', invoiceError);
        continue;
      }

      results.invoicesGenerated++;
      results.invoices.push(invoiceData);

      // Create notification
      await adminClient.from('platform_notifications').insert({
        type: 'invoice_generated',
        severity: 'info',
        title: `Invoice Generated: ${org.name}`,
        message: `Invoice ${invoiceNumber} for $${total.toFixed(2)} has been generated.`,
        metadata: { 
          organization_id: org.id, 
          invoice_number: invoiceNumber,
          total,
        },
      });
    }

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'invoice-generator',
      status: 'success',
      metadata: { 
        invoices_generated: results.invoicesGenerated,
        manual_trigger: !!manual,
      },
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Invoice generator error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
