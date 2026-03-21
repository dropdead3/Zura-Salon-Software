import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformTeam, type PlatformRole } from './usePlatformRoles';
import { toast } from 'sonner';

interface AccountNote {
  id: string;
  organization_id: string;
  author_id: string;
  content: string;
  mentions: { users: string[]; roles: string[] };
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    email: string;
  };
}

interface MentionSuggestion {
  type: 'role' | 'user';
  id: string;
  label: string;
  description?: string;
}

const ROLE_MENTIONS: { role: PlatformRole; label: string; description: string }[] = [
  { role: 'platform_owner', label: 'owner', description: 'Notify all owners' },
  { role: 'platform_admin', label: 'admin', description: 'Notify all admins' },
  { role: 'platform_support', label: 'support', description: 'Notify support team' },
  { role: 'platform_developer', label: 'developer', description: 'Notify developers' },
];

// Parse @mentions from content
export function parseMentions(content: string): { users: string[]; roles: string[] } {
  const rolePattern = /@(owner|admin|support|developer)\b/gi;
  const userPattern = /@([A-Z][a-z]+ [A-Z][a-z]+)/g;
  
  const roles: string[] = [];
  const users: string[] = [];
  
  let match;
  while ((match = rolePattern.exec(content)) !== null) {
    const role = match[1].toLowerCase();
    if (!roles.includes(role)) {
      roles.push(role);
    }
  }
  
  while ((match = userPattern.exec(content)) !== null) {
    const userName = match[1];
    if (!users.includes(userName)) {
      users.push(userName);
    }
  }
  
  return { users, roles };
}

// Highlight mentions in displayed content
export function highlightMentions(content: string): string {
  return content
    .replace(/@(owner|admin|support|developer)\b/gi, '<span class="bg-violet-500/20 text-violet-400 px-1 rounded">@$1</span>')
    .replace(/@([A-Z][a-z]+ [A-Z][a-z]+)/g, '<span class="bg-violet-500/20 text-violet-400 px-1 rounded">@$1</span>');
}

export function useAccountNotes(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['account-notes', organizationId],
    queryFn: async (): Promise<AccountNote[]> => {
      if (!organizationId) return [];
      
      const { data: notes, error } = await supabase
        .from('account_notes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching account notes:', error);
        throw error;
      }
      
      // Fetch author profiles
      const authorIds = [...new Set(notes?.map(n => n.author_id) || [])];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, email')
        .in('user_id', authorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return (notes || []).map(note => ({
        ...note,
        mentions: (note.mentions as { users: string[]; roles: string[] }) || { users: [], roles: [] },
        author: profileMap.get(note.author_id),
      }));
    },
    enabled: !!organizationId,
  });
}

export function useCreateAccountNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: platformTeam } = usePlatformTeam();
  
  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      content,
      organizationName 
    }: { 
      organizationId: string; 
      content: string;
      organizationName: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const mentions = parseMentions(content);
      
      // Insert the note
      const { data: note, error } = await supabase
        .from('account_notes')
        .insert({
          organization_id: organizationId,
          author_id: user.id,
          content,
          mentions,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Get author name for notifications
      const { data: authorProfile } = await supabase
        .from('employee_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      const authorName = authorProfile?.full_name || 'A team member';
      
      // Resolve mentions to user IDs and create notifications
      const usersToNotify = new Set<string>();
      
      // Role mentions - resolve to all users with that role
      for (const roleLabel of mentions.roles) {
        const roleMap: Record<string, PlatformRole> = {
          owner: 'platform_owner',
          admin: 'platform_admin',
          support: 'platform_support',
          developer: 'platform_developer',
        };
        const platformRole = roleMap[roleLabel];
        if (platformRole && platformTeam) {
          platformTeam
            .filter(member => member.role === platformRole)
            .forEach(member => {
              if (member.user_id !== user.id) {
                usersToNotify.add(member.user_id);
              }
            });
        }
      }
      
      // User mentions - find by name
      for (const userName of mentions.users) {
        const matchingMember = platformTeam?.find(
          m => m.full_name?.toLowerCase() === userName.toLowerCase()
        );
        if (matchingMember && matchingMember.user_id !== user.id) {
          usersToNotify.add(matchingMember.user_id);
        }
      }
      
      // Create notifications for all mentioned users
      if (usersToNotify.size > 0) {
        const notifications = Array.from(usersToNotify).map(userId => ({
          user_id: userId,
          type: 'account_mention',
          title: 'Mentioned in account note',
          message: `${authorName} mentioned you on ${organizationName}`,
          link: `/platform/accounts/${organizationId}?tab=notes`,
          metadata: {
            note_id: note.id,
            organization_id: organizationId,
            author_id: user.id,
          },
        }));
        
        await supabase.from('notifications').insert(notifications);
        
        // Also insert mention records
        const mentionRecords = Array.from(usersToNotify).map(userId => ({
          note_id: note.id,
          mentioned_user_id: userId,
          notified_at: new Date().toISOString(),
        }));
        
        // Add role mentions
        for (const roleLabel of mentions.roles) {
          mentionRecords.push({
            note_id: note.id,
            mentioned_user_id: null as any,
            mentioned_role: roleLabel,
            notified_at: new Date().toISOString(),
          } as any);
        }
        
        if (mentionRecords.length > 0) {
          await supabase.from('account_note_mentions').insert(mentionRecords);
        }
      }
      
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account-notes', variables.organizationId] });
      toast.success('Note added successfully');
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast.error('Failed to add note');
    },
  });
}

export function useDeleteAccountNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ noteId, organizationId }: { noteId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('account_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['account-notes', data.organizationId] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });
}

export function useMentionSuggestions(): MentionSuggestion[] {
  const { data: platformTeam } = usePlatformTeam();
  
  const suggestions: MentionSuggestion[] = [];
  
  // Add role suggestions
  ROLE_MENTIONS.forEach(({ role, label, description }) => {
    suggestions.push({
      type: 'role',
      id: role,
      label: `@${label}`,
      description,
    });
  });
  
  // Add team member suggestions
  platformTeam?.forEach(member => {
    if (member.full_name) {
      suggestions.push({
        type: 'user',
        id: member.user_id,
        label: `@${member.full_name}`,
        description: member.email,
      });
    }
  });
  
  return suggestions;
}
