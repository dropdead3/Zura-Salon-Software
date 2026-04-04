import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StylistFlipCard } from '@/components/home/StylistFlipCard';
import { useState, useMemo } from 'react';
import { useHomepageStylists } from '@/hooks/useHomepageStylists';
import { useHomepageStylistsSettings } from '@/hooks/useSiteSettings';
import { useActiveLocations } from '@/hooks/useLocations';
import { sampleStylists } from '@/data/sampleStylists';
import { locations as staticLocations, type Stylist, type Location } from '@/data/stylists';
import { Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomepagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HomepagePreviewModal({ open, onOpenChange }: HomepagePreviewModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | "all">("all");
  
  // Fetch data
  const { data: dbStylists } = useHomepageStylists();
  const { data: settings } = useHomepageStylistsSettings();
  const { data: dbLocations } = useActiveLocations();
  
  const showSampleCards = settings?.show_sample_cards ?? false;
  
  // Transform database stylists
  const realStylists: Stylist[] = useMemo(() => {
    if (!dbStylists) return [];
    return dbStylists.map(s => ({
      id: s.id,
      name: s.display_name || s.full_name,
      instagram: s.instagram || "",
      tiktok: s.tiktok || undefined,
      level: s.stylist_level || "LEVEL 1 STYLIST",
      specialties: s.specialties || [],
      highlighted_services: s.highlighted_services || undefined,
      imageUrl: s.photo_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      locations: (s.location_ids && s.location_ids.length > 0 ? s.location_ids : (s.location_id ? [s.location_id] : [])) as Location[],
      isBooking: s.is_booking ?? true,
      bio: s.bio || undefined,
    }));
  }, [dbStylists]);

  // Determine which stylists to show
  const stylists: Stylist[] = useMemo(() => {
    if (showSampleCards && realStylists.length === 0) {
      return sampleStylists;
    }
    return realStylists;
  }, [showSampleCards, realStylists]);

  // Filter by location
  const filteredStylists = useMemo(() => {
    return stylists.filter(s => 
      selectedLocation === "all" || s.locations.includes(selectedLocation as Location)
    );
  }, [stylists, selectedLocation]);

  // Merge locations
  const locations = useMemo(() => {
    if (!dbLocations) return staticLocations.map(loc => ({ ...loc, city: '', hours: '' }));
    return staticLocations.map(staticLoc => {
      const dbLoc = dbLocations.find(db => db.id === staticLoc.id);
      return {
        ...staticLoc,
        address: dbLoc?.address || "",
        city: dbLoc?.city || "",
        hours: dbLoc?.hours || "Hours not available",
      };
    });
  }, [dbLocations]);

  const isSampleData = showSampleCards && realStylists.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-3">
            Homepage Stylists Preview
            {isSampleData && (
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                Sample Data
              </Badge>
            )}
          </DialogTitle>
          
          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm mt-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="text-muted-foreground">
              {isSampleData ? (
                <span>Showing <strong>{filteredStylists.length} sample stylists</strong> because no real stylists are visible and sample cards are enabled.</span>
              ) : realStylists.length === 0 ? (
                <span>No stylists are currently visible. Enable sample cards in settings to preview the section with placeholder data.</span>
              ) : (
                <span>Showing <strong>{filteredStylists.length} real stylists</strong> that are currently visible on the homepage.</span>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* Location Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedLocation("all")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                selectedLocation === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              )}
            >
              All
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id as Location)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedLocation === loc.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground/60 hover:text-foreground"
                )}
              >
                {loc.name}
              </button>
            ))}
          </div>

          {/* Stylists Grid */}
          {filteredStylists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No stylists to display for this location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredStylists.slice(0, 8).map((stylist, index) => (
                <StylistFlipCard
                  key={stylist.id}
                  stylist={stylist}
                  index={index}
                  selectedLocation={selectedLocation}
                />
              ))}
            </div>
          )}
          
          {filteredStylists.length > 8 && (
            <p className="text-sm text-muted-foreground text-center mt-6">
              Showing 8 of {filteredStylists.length} stylists in preview
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
