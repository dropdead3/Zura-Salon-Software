import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HomepageStylist {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  preferred_social_handle: 'instagram' | 'tiktok' | null;
  stylist_level: string | null;
  specialties: string[] | null;
  highlighted_services: string[] | null;
  location_id: string | null;
  location_ids: string[] | null;
  is_booking: boolean | null;
  bio: string | null;
  card_focal_x: number | null;
  card_focal_y: number | null;
  card_zoom: number | null;
  card_rotation: number | null;
  homepage_order: number | null;
}

// Level order for default sorting (higher level = lower number = comes first)
const LEVEL_ORDER: Record<string, number> = {
  "LEVEL 4 STYLIST": 1,
  "LEVEL 3 STYLIST": 2,
  "LEVEL 2 STYLIST": 3,
  "LEVEL 1 STYLIST": 4,
};

// Sort function: custom order first, then by level, then by extensions specialty
function sortStylists(stylists: HomepageStylist[]): HomepageStylist[] {
  return [...stylists].sort((a, b) => {
    // First, check if both have custom order
    const aHasOrder = a.homepage_order !== null;
    const bHasOrder = b.homepage_order !== null;
    
    // If both have custom order, sort by that
    if (aHasOrder && bHasOrder) {
      return (a.homepage_order ?? 0) - (b.homepage_order ?? 0);
    }
    
    // Items with custom order come first
    if (aHasOrder !== bHasOrder) {
      return aHasOrder ? -1 : 1;
    }
    
    // Default sorting: by level first
    const aLevel = LEVEL_ORDER[a.stylist_level || "LEVEL 1 STYLIST"] ?? 5;
    const bLevel = LEVEL_ORDER[b.stylist_level || "LEVEL 1 STYLIST"] ?? 5;
    
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }
    
    // Within same level, extensions specialists come first
    const aHasExtensions = a.specialties?.some(s => s.toLowerCase().includes('extension')) ?? false;
    const bHasExtensions = b.specialties?.some(s => s.toLowerCase().includes('extension')) ?? false;
    
    if (aHasExtensions !== bHasExtensions) {
      return aHasExtensions ? -1 : 1;
    }
    
    // Finally, alphabetical by name
    return (a.display_name || a.full_name).localeCompare(b.display_name || b.full_name);
  });
}

export function useHomepageStylists() {
  return useQuery({
    queryKey: ['homepage-stylists'],
    queryFn: async () => {
      // First, get user_ids that have stylist or stylist_assistant roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);

      if (roleError) throw roleError;
      
      const stylistUserIds = roleData?.map(r => r.user_id) || [];
      
      if (stylistUserIds.length === 0) {
        return [] as HomepageStylist[];
      }

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('id, user_id, full_name, display_name, photo_url, instagram, tiktok, preferred_social_handle, stylist_level, specialties, highlighted_services, location_id, location_ids, is_booking, bio, card_focal_x, card_focal_y, card_zoom, card_rotation, homepage_order')
        .eq('is_active', true)
        .eq('homepage_visible', true)
        .in('user_id', stylistUserIds);

      if (error) throw error;
      
      // Apply custom sorting logic
      return sortStylists(data as HomepageStylist[]);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// For admin: get stylists requesting homepage visibility
export function useHomepageRequests() {
  return useQuery({
    queryKey: ['homepage-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('homepage_requested', true)
        .eq('homepage_visible', false)
        .order('homepage_requested_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
