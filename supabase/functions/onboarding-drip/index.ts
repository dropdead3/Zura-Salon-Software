import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from "../_shared/email-sender.ts";
import { PLATFORM_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DripStep {
  day: number;
  template_key: string;
  subject: string;
  condition?: (org: any) => boolean;
}

const DRIP_SEQUENCE: DripStep[] = [
  { day: 0, template_key: 'welcome', subject: `Welcome to ${PLATFORM_NAME}!` },
  { day: 1, template_key: 'getting_started', subject: 'Getting Started: Your First Steps' },
  { day: 3, template_key: 'add_team', subject: 'Tip: Add Your Team Members' },
  { day: 5, template_key: 'setup_locations', subject: 'Set Up Your Locations' },
  { day: 7, template_key: 'week_1_checkin', subject: 'How\'s Your First Week Going?' },
  { day: 10, template_key: 'feature_highlight', subject: 'Did You Know? Powerful Features Inside' },
  { day: 12, template_key: 'trial_reminder', subject: 'Your Trial Ends Soon - Upgrade Today', condition: (org) => org.subscription_status === 'trialing' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: organizations, error: orgsError } = await adminClient
      .from('organizations')
      .select(`id, name, slug, billing_email, subscription_status, created_at, activated_at`)
      .gte('created_at', twoWeeksAgo.toISOString())
      .in('subscription_status', ['trialing', 'active']);

    if (orgsError) throw orgsError;

    const results = { processed: 0, emailsSent: 0, skipped: 0 };
    const now = new Date();

    for (const org of organizations || []) {
      results.processed++;
      const createdAt = new Date(org.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const applicableStep = DRIP_SEQUENCE.find((step: any) => {
        if (step.day !== daysSinceCreation) return false;
        if (step.condition && !step.condition(org)) return false;
        return true;
      });

      if (!applicableStep) { results.skipped++; continue; }

      const { data: existingLog } = await adminClient
        .from('email_digest_log')
        .select('id')
        .eq('user_id', org.id)
        .eq('digest_type', `onboarding_${applicableStep.template_key}`)
        .single();

      if (existingLog) { results.skipped++; continue; }

      const { data: template } = await adminClient
        .from('email_templates')
        .select('*')
        .eq('template_key', `onboarding_${applicableStep.template_key}`)
        .eq('is_active', true)
        .single();

      if (org.billing_email) {
        const htmlBody = template?.html_body || generateDefaultEmail(applicableStep, org);
        const subject = template?.subject || applicableStep.subject;

        try {
          await sendEmail({
            to: [org.billing_email],
            subject: subject.replace('{{organization_name}}', org.name),
            html: htmlBody
              .replace(/{{organization_name}}/g, org.name)
              .replace(/{{days_since_signup}}/g, String(daysSinceCreation)),
          });

          await adminClient.from('email_digest_log').insert({
            user_id: org.id,
            digest_type: `onboarding_${applicableStep.template_key}`,
            entries_included: [applicableStep.template_key],
          });

          results.emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send onboarding email to ${org.billing_email}:`, emailError);
        }
      }
    }

    await adminClient.from('edge_function_logs').insert({
      function_name: 'onboarding-drip', status: 'success', metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Onboarding drip error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDefaultEmail(step: DripStep, org: any): string {
  const templates: Record<string, string> = {
    welcome: `<h1>Welcome to ${PLATFORM_NAME}, ${org.name}!</h1><p>We're thrilled to have you on board.</p><ul><li>Add your team members</li><li>Set up your locations</li><li>Explore our features</li></ul>`,
    getting_started: `<h1>Getting Started with Your Account</h1><p>Hi ${org.name},</p><p>Let's walk through the essential first steps.</p>`,
    add_team: `<h1>Build Your Team</h1><p>Hi ${org.name},</p><p>Invite your colleagues to join and collaborate!</p>`,
    setup_locations: `<h1>Configure Your Locations</h1><p>Hi ${org.name},</p><p>Now is a great time to add your locations.</p>`,
    week_1_checkin: `<h1>How's Your First Week Going?</h1><p>Hi ${org.name},</p><p>We'd love to hear how things are going.</p>`,
    feature_highlight: `<h1>Powerful Features You Might Have Missed</h1><p>Hi ${org.name},</p><p>Did you know about these features?</p>`,
    trial_reminder: `<h1>Your Trial is Ending Soon</h1><p>Hi ${org.name},</p><p>Don't lose access. Upgrade today!</p>`,
  };
  return templates[step.template_key] || `<p>Hi ${org.name}, this is an onboarding email.</p>`;
}
