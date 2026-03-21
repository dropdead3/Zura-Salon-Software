import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface HighFive {
  id: string;
  entry_id: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_photo?: string | null;
}

interface HighFivesByEntry {
  [entryId: string]: HighFive[];
}

export function useBellHighFives(entryIds: string[]) {
  const { user } = useAuth();
  const [highFives, setHighFives] = useState<HighFivesByEntry>({});
  const [loading, setLoading] = useState(true);

  const fetchHighFives = async () => {
    if (entryIds.length === 0) {
      setHighFives({});
      setLoading(false);
      return;
    }

    // Fetch high fives
    const { data: highFivesData, error } = await supabase
      .from('bell_entry_high_fives')
      .select('*')
      .in('entry_id', entryIds);

    if (error) {
      console.error('Error fetching high fives:', error);
      setHighFives({});
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set((highFivesData || []).map(hf => hf.user_id))];

    // Fetch profiles for those users
    let profilesMap: Record<string, { display_name: string | null; full_name: string; photo_url: string | null }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', userIds);

      (profiles || []).forEach(p => {
        profilesMap[p.user_id] = {
          display_name: p.display_name,
          full_name: p.full_name,
          photo_url: p.photo_url,
        };
      });
    }

    // Group high fives by entry and attach profile data
    const grouped: HighFivesByEntry = {};
    (highFivesData || []).forEach((hf: any) => {
      if (!grouped[hf.entry_id]) grouped[hf.entry_id] = [];
      const profile = profilesMap[hf.user_id];
      grouped[hf.entry_id].push({
        ...hf,
        user_name: profile?.display_name || profile?.full_name || 'Team Member',
        user_photo: profile?.photo_url || null,
      });
    });

    setHighFives(grouped);
    setLoading(false);
  };

  useEffect(() => {
    fetchHighFives();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('bell_high_fives')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bell_entry_high_fives' },
        () => {
          fetchHighFives();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entryIds.join(',')]);

  const toggleHighFive = async (entryId: string, entryOwnerId?: string) => {
    if (!user) return;

    const currentHighFives = highFives[entryId] || [];
    const existingHighFive = currentHighFives.find(hf => hf.user_id === user.id);

    if (existingHighFive) {
      // Remove high five
      const { error } = await supabase
        .from('bell_entry_high_fives')
        .delete()
        .eq('id', existingHighFive.id);

      if (!error) {
        setHighFives(prev => ({
          ...prev,
          [entryId]: prev[entryId]?.filter(hf => hf.id !== existingHighFive.id) || [],
        }));
      }
    } else {
      // Add high five
      const { data, error } = await supabase
        .from('bell_entry_high_fives')
        .insert({ entry_id: entryId, user_id: user.id })
        .select()
        .single();

      if (!error && data) {
        // Fetch user profile for the new high five
        const { data: profile } = await supabase
          .from('employee_profiles')
          .select('display_name, full_name, photo_url')
          .eq('user_id', user.id)
          .maybeSingle();

        const highFiverName = profile?.display_name || profile?.full_name || 'Someone';

        const newHighFive: HighFive = {
          ...data,
          user_name: highFiverName,
          user_photo: profile?.photo_url || null,
        };

        setHighFives(prev => ({
          ...prev,
          [entryId]: [...(prev[entryId] || []), newHighFive],
        }));

        // Send notification to the entry owner (if not self)
        if (entryOwnerId && entryOwnerId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: entryOwnerId,
            type: 'high_five',
            title: '🙌 High Five!',
            message: `${highFiverName} gave you a high five on your bell ring!`,
            link: '/dashboard/ring-the-bell',
            metadata: { entry_id: entryId, from_user_id: user.id },
          });
        }
      }
    }
  };

  const hasUserHighFived = (entryId: string): boolean => {
    if (!user) return false;
    return (highFives[entryId] || []).some(hf => hf.user_id === user.id);
  };

  const getHighFiveCount = (entryId: string): number => {
    return (highFives[entryId] || []).length;
  };

  const getHighFiveUsers = (entryId: string): HighFive[] => {
    return highFives[entryId] || [];
  };

  return {
    highFives,
    loading,
    toggleHighFive,
    hasUserHighFived,
    getHighFiveCount,
    getHighFiveUsers,
    refetch: fetchHighFives,
  };
}
