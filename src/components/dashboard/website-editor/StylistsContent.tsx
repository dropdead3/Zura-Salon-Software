import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { formatDisplayName } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Globe, Check, X, Loader2, User, MapPin, Clock, Eye, Users, Settings, ExternalLink, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLocationName } from '@/hooks/useLocationName';
import type { Location } from '@/data/stylists';
import { useHomepageStylistsSettings, useUpdateHomepageStylistsSettings } from '@/hooks/useSiteSettings';
import { sampleStylists } from '@/data/sampleStylists';
import { HomepagePreviewModal } from '@/components/dashboard/HomepagePreviewModal';
import { ReorderableStylistList } from '@/components/dashboard/ReorderableStylistList';
import { SpecialtyOptionsManager } from '@/components/dashboard/SpecialtyOptionsManager';
import { EditorCard } from './EditorCard';

interface StylistProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  instagram: string | null;
  stylist_level: string | null;
  specialties: string[] | null;
  location_id: string | null;
  is_booking: boolean | null;
  homepage_visible: boolean | null;
  homepage_requested: boolean | null;
  homepage_requested_at: string | null;
  homepage_order: number | null;
}

function useHomepagePendingRequests() {
  return useQuery({
    queryKey: ['homepage-pending-requests'],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);

      if (roleError) throw roleError;
      
      const stylistUserIds = roleData?.map(r => r.user_id) || [];
      
      if (stylistUserIds.length === 0) {
        return [] as StylistProfile[];
      }

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('homepage_requested', true)
        .eq('homepage_visible', false)
        .in('user_id', stylistUserIds)
        .order('homepage_requested_at', { ascending: true });

      if (error) throw error;
      return data as unknown as StylistProfile[];
    },
  });
}

function useHomepageVisibleStylists() {
  return useQuery({
    queryKey: ['homepage-visible-stylists'],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);

      if (roleError) throw roleError;
      
      const stylistUserIds = roleData?.map(r => r.user_id) || [];
      
      if (stylistUserIds.length === 0) {
        return [] as StylistProfile[];
      }

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('homepage_visible', true)
        .in('user_id', stylistUserIds);

      if (error) throw error;
      return data as unknown as StylistProfile[];
    },
  });
}

function useUpdateStylistOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('employee_profiles')
          .update({ homepage_order: index })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-visible-stylists'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
      toast.success('Display order saved');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Failed to save order');
    },
  });
}

function useUpdateHomepageVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, visible }: { userId: string; visible: boolean }) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ 
          homepage_visible: visible,
          homepage_requested: false,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { visible }) => {
      queryClient.invalidateQueries({ queryKey: ['homepage-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-visible-stylists'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
      toast.success(visible ? 'Stylist added to homepage' : 'Stylist removed from homepage');
    },
    onError: (error) => {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    },
  });
}

function useDenyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ 
          homepage_requested: false,
          homepage_requested_at: null,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-pending-requests'] });
      toast.success('Request denied');
    },
    onError: (error) => {
      console.error('Error denying request:', error);
      toast.error('Failed to deny request');
    },
  });
}

export function StylistsContent() {
  const { formatDate } = useFormatDate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  
  const { data: pendingRequests = [], isLoading: loadingPending } = useHomepagePendingRequests();
  const { data: visibleStylists = [], isLoading: loadingVisible } = useHomepageVisibleStylists();
  const updateVisibility = useUpdateHomepageVisibility();
  const denyRequest = useDenyRequest();
  const updateOrder = useUpdateStylistOrder();
  
  const { data: settings, isLoading: settingsLoading } = useHomepageStylistsSettings();
  const updateSettings = useUpdateHomepageStylistsSettings();
  const showSampleCards = settings?.show_sample_cards ?? false;
  
  const { getLocationName, locations: activeLocations } = useLocationName();
  
  // Count sample stylists per location dynamically
  const locationCounts = useMemo(() => {
    if (!activeLocations) return [];
    return activeLocations.map(loc => ({
      id: loc.id,
      name: loc.name,
      count: sampleStylists.filter(s => s.locations.includes(loc.id)).length,
    })).filter(lc => lc.count > 0);
  }, [activeLocations]);
  
  const displayStylists = orderedIds 
    ? orderedIds.map(id => visibleStylists.find(s => s.id === id)).filter(Boolean) as StylistProfile[]
    : visibleStylists;
  
  const hasOrderChanges = orderedIds !== null;
  
  const handleReorder = (newOrderedIds: string[]) => {
    setOrderedIds(newOrderedIds);
  };
  
  const handleSaveOrder = () => {
    if (orderedIds) {
      updateOrder.mutate(orderedIds, {
        onSuccess: () => {
          setOrderedIds(null);
        },
      });
    }
  };
  
  const handleResetOrder = () => {
    setOrderedIds(null);
  };
  
  const handleToggleSampleCards = () => {
    updateSettings.mutate(
      { show_sample_cards: !showSampleCards },
      {
        onSuccess: () => {
          toast.success(showSampleCards ? 'Sample cards hidden' : 'Sample cards now visible');
        },
        onError: () => {
          toast.error('Failed to update setting');
        },
      }
    );
  };

  const StylistCard = ({ stylist, showActions = false }: { stylist: StylistProfile; showActions?: boolean }) => (
    <div className="p-3 border border-border/40 rounded-lg">
        <div className="flex flex-col gap-3">
          {/* Top row: Avatar + Info */}
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={stylist.photo_url || undefined} alt={stylist.full_name} />
              <AvatarFallback className="bg-muted">
                {stylist.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {formatDisplayName(stylist.full_name || '', stylist.display_name)}
              </h3>
              {stylist.stylist_level && (
                <p className="text-sm text-muted-foreground">{stylist.stylist_level}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {stylist.location_id && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {getLocationName(stylist.location_id as Location)}
                  </Badge>
                )}
                {stylist.instagram && (
                  <Badge variant="outline" className="text-xs">
                    {stylist.instagram}
                  </Badge>
                )}
              </div>
              {stylist.specialties && stylist.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {stylist.specialties.slice(0, 3).map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {stylist.specialties.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{stylist.specialties.length - 3}</Badge>
                  )}
                </div>
              )}
              {showActions && stylist.homepage_requested_at && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested {formatDate(new Date(stylist.homepage_requested_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* Bottom row: Actions */}
          <div className="flex items-center justify-end gap-2">
            {showActions ? (
              <>
                <Button
                  size={tokens.button.card}
                  variant="outline"
                  onClick={() => denyRequest.mutate(stylist.user_id)}
                  disabled={denyRequest.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Deny
                </Button>
                <Button
                  size={tokens.button.card}
                  onClick={() => updateVisibility.mutate({ userId: stylist.user_id, visible: true })}
                  disabled={updateVisibility.isPending}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {stylist.homepage_visible ? 'Visible' : 'Hidden'}
                </span>
                <Switch
                  checked={stylist.homepage_visible ?? false}
                  onCheckedChange={(checked) => updateVisibility.mutate({ userId: stylist.user_id, visible: checked })}
                  disabled={updateVisibility.isPending}
                />
              </div>
            )}
          </div>
        </div>
    </div>
  );

  return (
    <EditorCard
      title="Homepage Stylists"
      icon={Globe}
      description="Manage which stylists appear on the public website homepage"
    >

      {/* Sample Cards Settings */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-display tracking-wide text-muted-foreground">Sample Cards Settings</span>
        </div>
        <p className="text-xs text-muted-foreground">Show placeholder cards when no real stylists are visible.</p>

        <div className="flex items-center gap-2.5">
          <Switch
            id="sample-cards"
            checked={showSampleCards}
            onCheckedChange={handleToggleSampleCards}
            disabled={settingsLoading || updateSettings.isPending}
          />
          <label htmlFor="sample-cards" className="text-sm font-medium cursor-pointer">
            Show sample stylist cards
          </label>
          {(settingsLoading || updateSettings.isPending) && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {locationCounts.map(lc => (
            <Badge key={lc.id} variant="outline" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              {lc.count} {lc.name}
            </Badge>
          ))}
          {locationCounts.length === 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              {sampleStylists.length} Total
            </Badge>
          )}
        </div>
        {showSampleCards && visibleStylists.length > 0 && (
          <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              <span className="font-medium">Sample cards hidden:</span> You have {visibleStylists.length} real stylist(s) visible. Sample cards only appear when no real stylists are visible.
              <span className="block mt-1.5 text-muted-foreground">
                To hide or show individual stylists, use the <span className="font-medium text-foreground">Visible</span> tab below.
              </span>
            </p>
          </div>
        )}
        <div className="pt-2.5 border-t border-border/30">
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => setPreviewOpen(true)}
            className="gap-2 w-full"
          >
            <Eye className="w-4 h-4" />
            Preview Homepage
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border/30" />

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 w-5 p-0 justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="visible" className="text-xs sm:text-sm">Visible</TabsTrigger>
          <TabsTrigger value="specialties" className="text-xs sm:text-sm">Specialties</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-lg">
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(stylist => (
                <StylistCard key={stylist.id} stylist={stylist} showActions />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="visible" className="space-y-4">
          {loadingVisible ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayStylists.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-lg">
              No stylists visible on homepage
            </div>
          ) : (
            <ReorderableStylistList
              stylists={displayStylists}
              onReorder={handleReorder}
              onToggleVisibility={(userId, visible) => updateVisibility.mutate({ userId, visible })}
              onSaveOrder={handleSaveOrder}
              onResetOrder={handleResetOrder}
              isUpdating={updateVisibility.isPending}
              isSaving={updateOrder.isPending}
              hasChanges={hasOrderChanges}
            />
          )}
        </TabsContent>

        <TabsContent value="specialties">
          <SpecialtyOptionsManager />
        </TabsContent>
      </Tabs>

      <HomepagePreviewModal open={previewOpen} onOpenChange={setPreviewOpen} />
    </EditorCard>
  );
}
