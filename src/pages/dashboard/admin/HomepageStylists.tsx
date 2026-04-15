import { useState, useMemo } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Globe, Check, X, Loader2, User, MapPin, Clock, Eye, EyeOff, Users, Settings, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
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

interface StylistProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  stylist_level: string | null;
  specialties: string[] | null;
  highlighted_services: string[] | null;
  location_id: string | null;
  location_ids: string[] | null;
  bio: string | null;
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
      // First, get user_ids that have stylist or stylist_assistant roles
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

// Fetch only stylists and stylist assistants (for the All Stylists tab)
function useAllStylists() {
  return useQuery({
    queryKey: ['all-stylists-for-homepage'],
    queryFn: async () => {
      // First, get user_ids that have stylist or stylist_assistant roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);

      if (roleError) throw roleError;
      
      const stylistUserIds = roleData?.map(r => r.user_id) || [];
      
      if (stylistUserIds.length === 0) {
        return [] as StylistProfile[];
      }

      // Then fetch only those profiles
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .in('user_id', stylistUserIds)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as unknown as StylistProfile[];
    },
  });
}

// Level order for default sorting
const LEVEL_ORDER: Record<string, number> = {
  "LEVEL 4 STYLIST": 1,
  "LEVEL 3 STYLIST": 2,
  "LEVEL 2 STYLIST": 3,
  "LEVEL 1 STYLIST": 4,
};

function sortVisibleStylists(stylists: StylistProfile[]): StylistProfile[] {
  return [...stylists].sort((a, b) => {
    // First, check if both have custom order
    const aHasOrder = a.homepage_order !== null;
    const bHasOrder = b.homepage_order !== null;
    
    if (aHasOrder && bHasOrder) {
      return (a.homepage_order ?? 0) - (b.homepage_order ?? 0);
    }
    
    if (aHasOrder !== bHasOrder) {
      return aHasOrder ? -1 : 1;
    }
    
    // Default: by level
    const aLevel = LEVEL_ORDER[a.stylist_level || "LEVEL 1 STYLIST"] ?? 5;
    const bLevel = LEVEL_ORDER[b.stylist_level || "LEVEL 1 STYLIST"] ?? 5;
    
    if (aLevel !== bLevel) return aLevel - bLevel;
    
    // Extensions specialists first within level
    const aExt = a.specialties?.some(s => s.toLowerCase().includes('extension')) ?? false;
    const bExt = b.specialties?.some(s => s.toLowerCase().includes('extension')) ?? false;
    
    if (aExt !== bExt) return aExt ? -1 : 1;
    
    return (a.display_name || a.full_name).localeCompare(b.display_name || b.full_name);
  });
}

function useHomepageVisibleStylists() {
  return useQuery({
    queryKey: ['homepage-visible-stylists'],
    queryFn: async () => {
      // First, get user_ids that have stylist or stylist_assistant roles
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
      return sortVisibleStylists(data as StylistProfile[]);
    },
  });
}

function useUpdateStylistOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each stylist's homepage_order
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
      queryClient.invalidateQueries({ queryKey: ['all-stylists-for-homepage'] });
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

export default function HomepageStylists() {
  const { formatDate } = useFormatDate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  
  const { data: pendingRequests = [], isLoading: loadingPending } = useHomepagePendingRequests();
  const { data: visibleStylists = [], isLoading: loadingVisible } = useHomepageVisibleStylists();
  const { data: allStylists = [], isLoading: loadingAll } = useAllStylists();
  const updateVisibility = useUpdateHomepageVisibility();
  const denyRequest = useDenyRequest();
  const updateOrder = useUpdateStylistOrder();
  
  // Sample cards settings
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
  
  // Get ordered stylists for display
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={stylist.photo_url || undefined} alt={stylist.full_name} />
            <AvatarFallback className="bg-muted text-lg">
              {stylist.full_name?.charAt(0) || <User className="w-6 h-6" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">
              {stylist.display_name || stylist.full_name}
            </h3>
            {stylist.stylist_level && (
              <p className="text-sm text-muted-foreground">{stylist.stylist_level}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
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
              <div className="flex flex-wrap gap-1 mt-2">
                {stylist.specialties.slice(0, 4).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
                {stylist.specialties.length > 4 && (
                  <Badge variant="secondary" className="text-xs">+{stylist.specialties.length - 4}</Badge>
                )}
              </div>
            )}
            {showActions && stylist.homepage_requested_at && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Requested {formatDate(new Date(stylist.homepage_requested_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          {showActions ? (
            <div className="flex flex-col gap-2">
              <Button
                size={tokens.button.inline}
                onClick={() => updateVisibility.mutate({ userId: stylist.user_id, visible: true })}
                disabled={updateVisibility.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size={tokens.button.inline}
                variant="outline"
                onClick={() => denyRequest.mutate(stylist.user_id)}
                disabled={denyRequest.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Deny
              </Button>
            </div>
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
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-medium mb-2 flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Homepage Stylists
          </h1>
          <p className="text-muted-foreground">
            Manage which stylists appear on the public website homepage.
          </p>
        </div>

        {/* Sample Cards Settings */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Sample Cards Settings
            </CardTitle>
            <CardDescription>
              Show placeholder stylist cards when no real stylists are visible on the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="sample-cards"
                    checked={showSampleCards}
                    onCheckedChange={handleToggleSampleCards}
                    disabled={settingsLoading || updateSettings.isPending}
                  />
                  <label htmlFor="sample-cards" className="text-sm font-medium cursor-pointer">
                    Show sample stylist cards
                  </label>
                </div>
                {(settingsLoading || updateSettings.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {locationCounts.map(lc => (
                  <Badge key={lc.id} variant="outline" className="gap-1">
                    <Users className="w-3 h-3" />
                    {lc.count} {lc.name}
                  </Badge>
                ))}
                {locationCounts.length === 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="w-3 h-3" />
                    {sampleStylists.length} Total
                  </Badge>
                )}
              </div>
            </div>
            {showSampleCards && visibleStylists.length > 0 && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  <span className="font-medium">Sample cards hidden:</span> You have {visibleStylists.length} real stylist(s) visible on the homepage. Sample cards only appear when no real stylists are visible.
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={() => setPreviewOpen(true)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview Homepage Section
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <HomepagePreviewModal open={previewOpen} onOpenChange={setPreviewOpen} />

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="relative">
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs px-1.5" variant="destructive">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="visible">
              Currently Visible ({visibleStylists.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Stylists ({allStylists.length})
            </TabsTrigger>
            <TabsTrigger value="specialties" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Specialties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            {loadingPending ? (
              <DashboardLoader className="py-12" />
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending visibility requests.</p>
                  <p className="text-sm mt-1">
                    When stylists with complete profiles request homepage visibility, they'll appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map(stylist => (
                  <StylistCard key={stylist.id} stylist={stylist} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="visible">
            {loadingVisible ? (
              <DashboardLoader className="py-12" />
            ) : visibleStylists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <EyeOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stylists are currently visible on the homepage.</p>
                  <p className="text-sm mt-1">
                    Approve pending requests to add stylists to the public website.
                  </p>
                </CardContent>
              </Card>
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

          <TabsContent value="all">
            {loadingAll ? (
              <DashboardLoader className="py-12" />
            ) : allStylists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active stylists found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {allStylists.map(stylist => (
                  <StylistCard key={stylist.id} stylist={stylist} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="specialties">
            <SpecialtyOptionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
