import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from "../_shared/email-sender.ts";
import { PLATFORM_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyKPIs {
  mrr: number; mrrChange: number; arr: number;
  totalOrganizations: number; newOrganizations: number; churnedOrganizations: number;
  activeUsers: number; newUsers: number;
  totalAppointments: number; appointmentsChange: number;
  paymentFailures: number; openSupportTickets: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    const now = new Date();
    const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const kpis: WeeklyKPIs = { mrr: 0, mrrChange: 0, arr: 0, totalOrganizations: 0, newOrganizations: 0, churnedOrganizations: 0, activeUsers: 0, newUsers: 0, totalAppointments: 0, appointmentsChange: 0, paymentFailures: 0, openSupportTickets: 0 };

    const { count: totalOrgs } = await adminClient.from('organizations').select('id', { count: 'exact', head: true }).in('subscription_status', ['active', 'trialing']);
    kpis.totalOrganizations = totalOrgs || 0;

    const { count: newOrgs } = await adminClient.from('organizations').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString());
    kpis.newOrganizations = newOrgs || 0;

    const { count: churnedOrgs } = await adminClient.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'cancelled').gte('cancelled_at', oneWeekAgo.toISOString());
    kpis.churnedOrganizations = churnedOrgs || 0;

    const { data: activeOrgsWithPricing } = await adminClient.from('organizations').select('monthly_price').in('subscription_status', ['active']);
    let totalMRR = 0;
    for (const org of activeOrgsWithPricing || []) { totalMRR += org.monthly_price || 0; }
    kpis.mrr = totalMRR; kpis.arr = totalMRR * 12;

    const { count: activeUsers } = await adminClient.from('employee_profiles').select('id', { count: 'exact', head: true }).gte('last_sign_in_at', oneWeekAgo.toISOString());
    kpis.activeUsers = activeUsers || 0;

    const { count: newUsers } = await adminClient.from('employee_profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString());
    kpis.newUsers = newUsers || 0;

    const { count: appointmentsThisWeek } = await adminClient.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString());
    kpis.totalAppointments = appointmentsThisWeek || 0;

    const { count: appointmentsLastWeek } = await adminClient.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString());
    if (appointmentsLastWeek && appointmentsLastWeek > 0) {
      kpis.appointmentsChange = Math.round((((appointmentsThisWeek || 0) - appointmentsLastWeek) / appointmentsLastWeek) * 100);
    }

    const { count: paymentFailures } = await adminClient.from('platform_notifications').select('id', { count: 'exact', head: true }).eq('type', 'payment_failed').gte('created_at', oneWeekAgo.toISOString());
    kpis.paymentFailures = paymentFailures || 0;

    const { count: openTickets } = await adminClient.from('platform_notifications').select('id', { count: 'exact', head: true }).eq('type', 'support_request').is('resolved_at', null);
    kpis.openSupportTickets = openTickets || 0;

    const { data: platformAdmins } = await adminClient.from('platform_roles').select('user_id').in('role', ['platform_owner', 'platform_admin']);
    const adminEmails: string[] = [];
    for (const admin of platformAdmins || []) {
      const { data: profile } = await adminClient.from('employee_profiles').select('email').eq('user_id', admin.user_id).single();
      if (profile?.email) adminEmails.push(profile.email);
    }

    if (adminEmails.length > 0) {
      const weekOf = oneWeekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      await sendEmail({
        to: adminEmails,
        subject: `Weekly Platform Digest: ${weekOf} - ${weekEnd}`,
        html: generateDigestEmail(kpis, weekOf, weekEnd),
      });
    }

    await adminClient.from('weekly_digests').insert({ week_start: oneWeekAgo.toISOString(), week_end: now.toISOString(), kpis, recipients: adminEmails });
    await adminClient.from('edge_function_logs').insert({ function_name: 'weekly-digest', status: 'success', metadata: { kpis, recipients_count: adminEmails.length } });

    return new Response(
      JSON.stringify({ success: true, kpis, recipients: adminEmails.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Weekly digest error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function generateDigestEmail(kpis: WeeklyKPIs, weekOf: string, weekEnd: string): string {
  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;
  const formatChange = (n: number) => n >= 0 ? `+${n}%` : `${n}%`;
  const changeColor = (n: number) => n >= 0 ? '#22c55e' : '#ef4444';

  return `
    <div style="max-width: 600px; margin: 0 auto;">
      <h1 style="text-align: center; color: #1e293b;">Weekly Platform Digest</h1>
      <p style="text-align: center; color: #64748b;">${weekOf} - ${weekEnd}</p>

      <h3 style="color: #64748b; text-transform: uppercase; font-size: 12px;">Revenue</h3>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr><td style="background: #f8fafc; border-radius: 8px; padding: 15px;"><div style="font-size: 24px; font-weight: bold;">${formatCurrency(kpis.mrr)}</div><div style="font-size: 12px; color: #64748b;">MRR</div></td>
        <td style="background: #f8fafc; border-radius: 8px; padding: 15px;"><div style="font-size: 24px; font-weight: bold;">${formatCurrency(kpis.arr)}</div><div style="font-size: 12px; color: #64748b;">ARR</div></td></tr>
      </table>

      <h3 style="color: #64748b; text-transform: uppercase; font-size: 12px;">Organizations</h3>
      <p>Total Active: <strong>${kpis.totalOrganizations}</strong> | New: <strong style="color: #22c55e;">+${kpis.newOrganizations}</strong></p>
      ${kpis.churnedOrganizations > 0 ? `<p style="color: #ef4444;"><strong>${kpis.churnedOrganizations} churned</strong> this week.</p>` : '<p style="color: #22c55e;">No churn this week!</p>'}

      <h3 style="color: #64748b; text-transform: uppercase; font-size: 12px;">Engagement</h3>
      <p>Active Users: <strong>${kpis.activeUsers}</strong> | Appointments: <strong>${kpis.totalAppointments}</strong> <span style="color: ${changeColor(kpis.appointmentsChange)};">${formatChange(kpis.appointmentsChange)} vs last week</span></p>

      ${kpis.paymentFailures > 0 || kpis.openSupportTickets > 0 ? `
        <h3 style="color: #64748b; text-transform: uppercase; font-size: 12px;">Attention Needed</h3>
        ${kpis.paymentFailures > 0 ? `<p style="color: #ef4444;">${kpis.paymentFailures} payment failure(s)</p>` : ''}
        ${kpis.openSupportTickets > 0 ? `<p style="color: #ef4444;">${kpis.openSupportTickets} open support ticket(s)</p>` : ''}
      ` : ''}

      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        Automated weekly digest from ${PLATFORM_NAME}.
      </p>
    </div>`;
}
