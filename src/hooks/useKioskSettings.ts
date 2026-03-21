import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KioskSettings {
  id: string;
  organization_id: string;
  location_id: string | null;
  
  // Branding
  logo_url: string | null;
  logo_color: string | null;
  background_image_url: string | null;
  background_overlay_opacity: number; // 0-1, controls darken/lighten overlay
  background_color: string;
  accent_color: string;
  text_color: string;
  
  // Theme
  theme_mode: 'dark' | 'light' | 'auto';
  font_family: string;
  button_style: 'rounded' | 'pill' | 'square';
  
  // Content
  welcome_title: string;
  welcome_subtitle: string | null;
  check_in_prompt: string;
  success_message: string;
  
  // Behavior
  idle_timeout_seconds: number;
  display_orientation: 'portrait' | 'landscape';
  logo_size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  enable_walk_ins: boolean;
  require_confirmation_tap: boolean;
  show_wait_time_estimate: boolean;
  show_stylist_photo: boolean;
  enable_feedback_prompt: boolean;
  enable_glow_effects: boolean;
  require_form_signing: boolean;
  
  // Self-Service Booking
  enable_self_booking: boolean;
  self_booking_allow_future: boolean;
  self_booking_show_stylists: boolean;
  
  // Media
  idle_slideshow_images: string[];
  idle_video_url: string | null;
  
  // Location Badge
  show_location_badge: boolean;
  location_badge_position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  location_badge_style: 'glass' | 'solid' | 'outline';
  
  // Security
  exit_pin: string;
  
  created_at: string;
  updated_at: string;
}

// Note: Kiosk theming now uses global colorThemes from useColorTheme.ts
// The old KIOSK_THEME_PRESETS have been deprecated in favor of the unified theme system

export const DEFAULT_KIOSK_SETTINGS: Omit<KioskSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  location_id: null,
  logo_url: null,
  logo_color: null,
  background_image_url: null,
  background_overlay_opacity: 0.5, // 50% overlay by default
  // Updated to cream/oat brand palette
  background_color: '#F5F0E8',    // Warm cream
  accent_color: '#9A7B4F',        // Gold
  text_color: '#141414',          // Charcoal
  theme_mode: 'light',            // Light mode for cream aesthetic
  font_family: 'system',
  button_style: 'rounded',
  welcome_title: 'Welcome',
  welcome_subtitle: null,
  check_in_prompt: 'Please enter your phone number to check in',
  success_message: 'You are checked in! Your stylist has been notified.',
  idle_timeout_seconds: 60,
  display_orientation: 'portrait',
  logo_size: 'md',
  enable_walk_ins: true,
  require_confirmation_tap: true,
  show_wait_time_estimate: true,
  show_stylist_photo: true,
  enable_feedback_prompt: false,
  enable_glow_effects: false,
  require_form_signing: true,
  enable_self_booking: false,
  self_booking_allow_future: false,
  self_booking_show_stylists: true,
  idle_slideshow_images: [],
  idle_video_url: null,
  show_location_badge: false,
  location_badge_position: 'bottom-left',
  location_badge_style: 'glass',
  exit_pin: '1234',
};

export function useKioskSettings(organizationId?: string, locationId?: string) {
  return useQuery({
    queryKey: ['kiosk-settings', organizationId, locationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Try location-specific settings first
      if (locationId) {
        const { data: locationSettings, error: locError } = await supabase
          .from('organization_kiosk_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('location_id', locationId)
          .maybeSingle();

        if (!locError && locationSettings) {
          return locationSettings as unknown as KioskSettings;
        }
      }

      // Fall back to org-level settings
      const { data, error } = await supabase
        .from('organization_kiosk_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .is('location_id', null)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as KioskSettings | null;
    },
    enabled: !!organizationId,
  });
}

export function useKioskSettingsByLocation(locationId: string) {
  return useQuery({
    queryKey: ['kiosk-settings-location', locationId],
    queryFn: async () => {
      // Get location to find org
      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('id, organization_id')
        .eq('id', locationId)
        .single();

      if (locError || !location) {
        throw new Error('Location not found');
      }

      // Try location-specific settings first
      const { data: locationSettings } = await supabase
        .from('organization_kiosk_settings')
        .select('*')
        .eq('organization_id', location.organization_id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (locationSettings) {
        return {
          settings: locationSettings as unknown as KioskSettings,
          organizationId: location.organization_id,
        };
      }

      // Fall back to org-level settings
      const { data: orgSettings } = await supabase
        .from('organization_kiosk_settings')
        .select('*')
        .eq('organization_id', location.organization_id)
        .is('location_id', null)
        .maybeSingle();

      return {
        settings: orgSettings as unknown as KioskSettings | null,
        organizationId: location.organization_id,
      };
    },
    enabled: !!locationId,
  });
}

export function useUpdateKioskSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
      settings,
    }: {
      organizationId: string;
      locationId?: string | null;
      settings: Partial<Omit<KioskSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // Check if settings exist - use proper NULL handling
      let query = supabase
        .from('organization_kiosk_settings')
        .select('id')
        .eq('organization_id', organizationId);
      
      // Use .is() for NULL, .eq() for actual values
      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('organization_kiosk_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('organization_kiosk_settings')
          .insert({
            organization_id: organizationId,
            location_id: locationId ?? null,
            ...settings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate org-level settings queries
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk-settings', variables.organizationId] 
      });
      
      // Also invalidate location-specific queries used by kiosk screens
      if (variables.locationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['kiosk-settings-location', variables.locationId] 
        });
      }
      
      // Invalidate all location-based kiosk settings (for org-level changes)
      queryClient.invalidateQueries({
        queryKey: ['kiosk-settings-location'],
        exact: false,
      });
      
      // Invalidate overrides query
      queryClient.invalidateQueries({
        queryKey: ['kiosk-location-overrides'],
      });
      
      toast.success('Changes saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save kiosk settings:', error);
      toast.error('Failed to save kiosk settings');
    },
  });
}

// Hook to get which locations have custom overrides
export function useLocationKioskOverrides(organizationId?: string) {
  return useQuery({
    queryKey: ['kiosk-location-overrides', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('organization_kiosk_settings')
        .select('location_id')
        .eq('organization_id', organizationId)
        .not('location_id', 'is', null);
      
      if (error) throw error;
      return data.map(row => row.location_id).filter(Boolean) as string[];
    },
    enabled: !!organizationId,
  });
}

// Hook to fetch ALL kiosk settings rows for an org (defaults + all location overrides)
export function useAllOrgKioskSettings(organizationId?: string) {
  return useQuery({
    queryKey: ['all-org-kiosk-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_kiosk_settings')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data as unknown as KioskSettings[];
    },
    enabled: !!organizationId,
  });
}

// Device status for heartbeat monitoring
export interface KioskDeviceStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  deviceName: string | null;
}

export function useKioskDeviceStatus(organizationId?: string) {
  return useQuery({
    queryKey: ['kiosk-device-status', organizationId],
    queryFn: async (): Promise<Map<string, KioskDeviceStatus>> => {
      if (!organizationId) return new Map();
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('location_id, device_name, last_heartbeat_at, is_active')
        .eq('organization_id', organizationId);
      if (error) throw error;

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const map = new Map<string, KioskDeviceStatus>();

      for (const device of data || []) {
        if (!device.location_id) continue;
        const lastSeen = device.last_heartbeat_at ? new Date(device.last_heartbeat_at) : null;
        const isOnline = !!lastSeen && lastSeen > threeMinutesAgo && device.is_active === true;
        // Keep the most recent device per location
        const existing = map.get(device.location_id);
        if (!existing || (lastSeen && (!existing.lastSeen || lastSeen > existing.lastSeen))) {
          map.set(device.location_id, { isOnline, lastSeen, deviceName: device.device_name });
        }
      }
      return map;
    },
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });
}

// Hook to push organization defaults to all locations (removes all overrides)
export function usePushDefaultsToAllLocations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (organizationId: string) => {
      // Delete all location-specific settings
      const { error } = await supabase
        .from('organization_kiosk_settings')
        .delete()
        .eq('organization_id', organizationId)
        .not('location_id', 'is', null);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings-location'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-location-overrides'] });
      toast.success('Defaults pushed to all locations');
    },
    onError: (error) => {
      console.error('Failed to push defaults:', error);
      toast.error('Failed to push defaults to locations');
    },
  });
}

// Hook to reset a single location to organization defaults
export function useResetLocationToDefaults() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ organizationId, locationId }: { organizationId: string; locationId: string }) => {
      const { error } = await supabase
        .from('organization_kiosk_settings')
        .delete()
        .eq('organization_id', organizationId)
        .eq('location_id', locationId);
      
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings-location', vars.locationId] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-location-overrides'] });
      toast.success('Location reset to organization defaults');
    },
    onError: (error) => {
      console.error('Failed to reset location:', error);
      toast.error('Failed to reset location to defaults');
    },
  });
}

// Hook to push a specific location's settings to all other locations
export function usePushLocationSettingsToAll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      sourceLocationId,
      settings 
    }: { 
      organizationId: string; 
      sourceLocationId: string;
      settings: Partial<Omit<KioskSettings, 'id' | 'organization_id' | 'location_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // Get all locations for this org
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (locError) throw locError;
      
      // Filter out the source location
      const targetLocations = locations?.filter(loc => loc.id !== sourceLocationId) || [];
      
      if (targetLocations.length === 0) {
        throw new Error('No other locations to push to');
      }
      
      // For each target location, upsert the settings
      for (const loc of targetLocations) {
        // Check if settings exist for this location
        const { data: existing } = await supabase
          .from('organization_kiosk_settings')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('location_id', loc.id)
          .maybeSingle();
        
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('organization_kiosk_settings')
            .update(settings)
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('organization_kiosk_settings')
            .insert({
              organization_id: organizationId,
              location_id: loc.id,
              ...settings,
            });
          
          if (error) throw error;
        }
      }
      
      return targetLocations.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-settings-location'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-location-overrides'] });
      toast.success(`Settings pushed to ${count} location${count > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      console.error('Failed to push settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to push settings to locations');
    },
  });
}
