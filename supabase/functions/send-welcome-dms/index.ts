import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeRule {
  id: string;
  organization_id: string;
  sender_role: string;
  message_template: string;
  target_roles: string[] | null;
  target_locations: string[] | null;
  delay_minutes: number;
  is_active: boolean;
}

interface NewMember {
  user_id: string;
  organization_id: string;
  display_name: string | null;
  full_name: string | null;
  location_id: string | null;
}

function replaceTemplateVariables(
  template: string,
  variables: {
    new_member_name?: string;
    sender_name?: string;
    role?: string;
    location_name?: string;
  }
): string {
  let result = template;
  if (variables.new_member_name) {
    result = result.replace(/\[new_member_name\]/g, variables.new_member_name);
  }
  if (variables.sender_name) {
    result = result.replace(/\[sender_name\]/g, variables.sender_name);
  }
  if (variables.role) {
    result = result.replace(/\[role\]/g, variables.role);
  }
  if (variables.location_name) {
    result = result.replace(/\[location_name\]/g, variables.location_name);
  }
  return result;
}

/**
 * Resolves a sender from a role by finding users who have that role in the organization.
 * Returns the first user found, or null if no one has the role.
 */
async function resolveSenderForRole(
  supabase: any,
  orgId: string,
  role: string
): Promise<{ user_id: string; display_name: string; full_name: string | null } | null> {
  // Get users with this role
  const { data: usersWithRole, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', role);

  if (roleError || !usersWithRole?.length) {
    console.log(`No users found with role "${role}"`);
    return null;
  }

  const userIds = usersWithRole.map((u: any) => u.user_id);

  // Get the first user's profile from this org
  const { data: sender, error: profileError } = await supabase
    .from('employee_profiles')
    .select('user_id, display_name, full_name')
    .eq('organization_id', orgId)
    .in('user_id', userIds)
    .limit(1)
    .single();

  if (profileError || !sender) {
    console.log(`No employee profile found for role "${role}" in org ${orgId}`);
    return null;
  }

  return sender;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { new_member_user_id, organization_id } = await req.json();

    if (!new_member_user_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if welcome DMs are enabled for this org
    const { data: settings } = await supabase
      .from('team_chat_settings')
      .select('welcome_dms_enabled')
      .eq('organization_id', organization_id)
      .single();

    if (!settings?.welcome_dms_enabled) {
      return new Response(
        JSON.stringify({ message: 'Welcome DMs not enabled for this organization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the new member's profile
    const { data: newMember, error: memberError } = await supabase
      .from('employee_profiles')
      .select('user_id, organization_id, display_name, full_name, location_id')
      .eq('user_id', new_member_user_id)
      .eq('organization_id', organization_id)
      .single();

    if (memberError || !newMember) {
      console.error('Failed to fetch new member:', memberError);
      return new Response(
        JSON.stringify({ error: 'Member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get new member's role(s)
    const { data: memberRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', new_member_user_id);

    const roles = memberRoles?.map((r: any) => r.role) || [];

    // Get location name if applicable
    let locationName = '';
    if (newMember.location_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('name')
        .eq('id', newMember.location_id)
        .single();
      locationName = location?.name || '';
    }

    // Get active welcome rules for this org
    const { data: rules, error: rulesError } = await supabase
      .from('team_chat_welcome_rules')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (rulesError) {
      console.error('Failed to fetch welcome rules:', rulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active welcome rules configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { sender_role: string; sender_id?: string; success: boolean; error?: string }[] = [];

    for (const rule of rules as WelcomeRule[]) {
      // Check if this rule targets specific roles
      if (rule.target_roles && rule.target_roles.length > 0) {
        const hasMatchingRole = roles.some((r: string) => rule.target_roles!.includes(r));
        if (!hasMatchingRole) {
          console.log(`Skipping rule ${rule.id}: role mismatch`);
          continue;
        }
      }

      // Check if this rule targets specific locations
      if (rule.target_locations && rule.target_locations.length > 0) {
        if (!newMember.location_id || !rule.target_locations.includes(newMember.location_id)) {
          console.log(`Skipping rule ${rule.id}: location mismatch`);
          continue;
        }
      }

      // Resolve the sender from the role
      const sender = await resolveSenderForRole(supabase, organization_id, rule.sender_role);
      
      if (!sender) {
        console.log(`Skipping rule ${rule.id}: no user has role "${rule.sender_role}"`);
        results.push({ 
          sender_role: rule.sender_role, 
          success: false, 
          error: `No user has role "${rule.sender_role}"` 
        });
        continue;
      }

      // Check if already sent from this role (using sender_role in tracking)
      const { data: alreadySent } = await supabase
        .from('team_chat_welcome_sent')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('recipient_user_id', new_member_user_id)
        .eq('sender_user_id', sender.user_id)
        .maybeSingle();

      if (alreadySent) {
        console.log(`Skipping rule ${rule.id}: already sent from this sender`);
        continue;
      }

      try {
        // Check if DM channel already exists
        const { data: existingChannels } = await supabase
          .from('chat_channels')
          .select(`id, chat_channel_members!inner (user_id)`)
          .eq('type', 'dm')
          .eq('organization_id', organization_id);

        let channelId: string | null = null;

        // Find existing DM between these two users
        if (existingChannels) {
          for (const channel of existingChannels) {
            const memberIds = (channel.chat_channel_members as any[]).map((m: any) => m.user_id);
            if (memberIds.length === 2 && 
                memberIds.includes(sender.user_id) && 
                memberIds.includes(new_member_user_id)) {
              channelId = channel.id;
              break;
            }
          }
        }

        // Create new DM channel if needed
        if (!channelId) {
          const { data: newChannel, error: channelError } = await supabase
            .from('chat_channels')
            .insert({
              name: `dm-${Date.now()}`,
              type: 'dm',
              organization_id: organization_id,
              created_by: sender.user_id,
            })
            .select()
            .single();

          if (channelError || !newChannel) {
            results.push({ 
              sender_role: rule.sender_role, 
              sender_id: sender.user_id, 
              success: false, 
              error: 'Failed to create DM channel' 
            });
            continue;
          }

          channelId = newChannel.id;

          // Add both users as members
          await supabase.from('chat_channel_members').insert([
            { channel_id: channelId, user_id: sender.user_id, role: 'owner' },
            { channel_id: channelId, user_id: new_member_user_id, role: 'member' },
          ]);
        }

        // Replace template variables
        const newMemberName = newMember.display_name || newMember.full_name || 'there';
        const senderName = sender.display_name || sender.full_name || 'Your colleague';
        const roleName = roles[0] || 'team member';

        const messageContent = replaceTemplateVariables(rule.message_template, {
          new_member_name: newMemberName,
          sender_name: senderName.split(' ')[0], // First name only
          role: roleName,
          location_name: locationName,
        });

        // Send the welcome message (apply delay if configured)
        if (rule.delay_minutes > 0) {
          // For delayed messages, we'd ideally use a job queue
          // For now, we'll just insert with a note that it should be delayed
          console.log(`Message would be delayed by ${rule.delay_minutes} minutes`);
        }

        const { data: message, error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            channel_id: channelId,
            sender_id: sender.user_id,
            content: messageContent,
          })
          .select()
          .single();

        if (messageError) {
          results.push({ 
            sender_role: rule.sender_role, 
            sender_id: sender.user_id, 
            success: false, 
            error: 'Failed to send message' 
          });
          continue;
        }

        // Record that we've sent this welcome
        await supabase.from('team_chat_welcome_sent').insert({
          organization_id: organization_id,
          recipient_user_id: new_member_user_id,
          sender_user_id: sender.user_id,
          channel_id: channelId,
          message_id: message.id,
        });

        results.push({ sender_role: rule.sender_role, sender_id: sender.user_id, success: true });

      } catch (err: any) {
        console.error(`Error processing rule ${rule.id}:`, err);
        results.push({ 
          sender_role: rule.sender_role, 
          sender_id: sender.user_id, 
          success: false, 
          error: String(err) 
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-welcome-dms:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
