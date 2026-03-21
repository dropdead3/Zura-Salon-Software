import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  version: string | null;
  entry_type: string;
  status: string;
  is_major: boolean;
  target_roles: string[];
  release_date: string | null;
  scheduled_publish_at: string | null;
  published_at: string | null;
  notification_sent: boolean;
  send_as_announcement: boolean;
  send_as_notification: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
  vote_count?: number;
  user_voted?: boolean;
  is_read?: boolean;
}

export interface CreateChangelogEntry {
  title: string;
  content: string;
  version?: string;
  entry_type: string;
  is_major?: boolean;
  target_roles?: string[];
  release_date?: string;
  scheduled_publish_at?: string;
  send_as_announcement?: boolean;
  send_as_notification?: boolean;
  status?: string;
}

// Fetch published changelog entries for users
export function usePublishedChangelog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['changelog', 'published'],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;

      // Get read status for current user
      const { data: reads } = await supabase
        .from('changelog_reads')
        .select('changelog_id')
        .eq('user_id', user?.id || '');

      const readIds = new Set(reads?.map(r => r.changelog_id) || []);

      // Get votes for each entry
      const { data: votes } = await supabase
        .from('changelog_votes')
        .select('changelog_id');

      const { data: userVotes } = await supabase
        .from('changelog_votes')
        .select('changelog_id')
        .eq('user_id', user?.id || '');

      const voteCounts = new Map<string, number>();
      votes?.forEach(v => {
        voteCounts.set(v.changelog_id, (voteCounts.get(v.changelog_id) || 0) + 1);
      });

      const userVoteIds = new Set(userVotes?.map(v => v.changelog_id) || []);

      return (entries || []).map(entry => ({
        ...entry,
        is_read: readIds.has(entry.id),
        vote_count: voteCounts.get(entry.id) || 0,
        user_voted: userVoteIds.has(entry.id),
      })) as ChangelogEntry[];
    },
    enabled: !!user,
  });
}

// Fetch all changelog entries for admin
export function useAdminChangelog() {
  return useQuery({
    queryKey: ['changelog', 'admin'],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get vote counts
      const { data: votes } = await supabase
        .from('changelog_votes')
        .select('changelog_id');

      const voteCounts = new Map<string, number>();
      votes?.forEach(v => {
        voteCounts.set(v.changelog_id, (voteCounts.get(v.changelog_id) || 0) + 1);
      });

      return (entries || []).map(entry => ({
        ...entry,
        vote_count: voteCounts.get(entry.id) || 0,
      })) as ChangelogEntry[];
    },
  });
}

// Count unread changelog entries
export function useUnreadChangelogCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['changelog', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count: totalCount } = await supabase
        .from('changelog_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      const { count: readCount } = await supabase
        .from('changelog_reads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return Math.max(0, (totalCount || 0) - (readCount || 0));
    },
    enabled: !!user,
  });
}

// Create a new changelog entry
export function useCreateChangelog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateChangelogEntry) => {
      if (!user) throw new Error('Not authenticated');

      const status = data.scheduled_publish_at ? 'scheduled' : (data.status || 'draft');
      
      const { data: entry, error } = await supabase
        .from('changelog_entries')
        .insert({
          ...data,
          status,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
      toast.success('Changelog entry created');
    },
    onError: (error) => {
      toast.error('Failed to create changelog entry', { description: error.message });
    },
  });
}

// Update a changelog entry
export function useUpdateChangelog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChangelogEntry> & { id: string }) => {
      const { data: entry, error } = await supabase
        .from('changelog_entries')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
      toast.success('Changelog entry updated');
    },
    onError: (error) => {
      toast.error('Failed to update changelog entry', { description: error.message });
    },
  });
}

// Publish a changelog entry
export function usePublishChangelog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, sendNotification = true }: { id: string; sendNotification?: boolean }) => {
      const { data: entry, error } = await supabase
        .from('changelog_entries')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If sendNotification is true and send_as_notification is enabled, create notifications
      if (sendNotification && entry.send_as_notification) {
        // Get all users to notify (you may want to filter by target_roles)
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id')
          .eq('is_active', true);

        if (profiles && profiles.length > 0) {
          const notifications = profiles.map(p => ({
            user_id: p.user_id,
            type: 'changelog',
            title: entry.is_major ? `🎉 ${entry.title}` : entry.title,
            message: entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : ''),
            link: '/dashboard/changelog',
            metadata: { changelog_id: entry.id, version: entry.version, entry_type: entry.entry_type },
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // Update notification_sent flag
        await supabase
          .from('changelog_entries')
          .update({ notification_sent: true })
          .eq('id', id);
      }

      // If send_as_announcement is enabled, create an announcement
      if (entry.send_as_announcement && user) {
        await supabase.from('announcements').insert({
          title: entry.title,
          content: entry.content,
          priority: entry.is_major ? 'high' : 'normal',
          is_pinned: entry.is_major,
          author_id: user.id,
          link_url: '/dashboard/changelog',
          link_label: 'View Details',
        });
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Changelog entry published');
    },
    onError: (error) => {
      toast.error('Failed to publish changelog entry', { description: error.message });
    },
  });
}

// Delete a changelog entry
export function useDeleteChangelog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('changelog_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
      toast.success('Changelog entry deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete changelog entry', { description: error.message });
    },
  });
}

// Mark a changelog entry as read
export function useMarkChangelogRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (changelogId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('changelog_reads')
        .upsert({
          changelog_id: changelogId,
          user_id: user.id,
        }, {
          onConflict: 'changelog_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
    },
  });
}

// Vote on a changelog entry (for coming soon items)
export function useVoteChangelog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ changelogId, vote }: { changelogId: string; vote: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (vote) {
        const { error } = await supabase
          .from('changelog_votes')
          .insert({
            changelog_id: changelogId,
            user_id: user.id,
          });
        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        const { error } = await supabase
          .from('changelog_votes')
          .delete()
          .eq('changelog_id', changelogId)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
    },
  });
}
