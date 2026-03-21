import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Eye,
  EyeOff,
  ChevronUp, 
  ChevronDown,
  MapPin,
  Phone,
  Clock,
  Settings,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useLocations, 
  useUpdateLocation,
  formatHoursForDisplay,
  type Location,
} from '@/hooks/useLocations';
import { LocationPreviewModal } from '@/components/dashboard/LocationPreviewModal';
import { useNavigate } from 'react-router-dom';

export default function LocationsManager() {
  const { data: locations = [], isLoading } = useLocations();
  const updateLocation = useUpdateLocation();
  const navigate = useNavigate();
  
  const [previewOpen, setPreviewOpen] = useState(false);

  // Filter to only active locations (inactive ones should be managed in Settings)
  const activeLocations = locations.filter(loc => loc.is_active);

  const handleToggleWebsiteVisibility = async (location: Location) => {
    await updateLocation.mutateAsync({ 
      id: location.id, 
      show_on_website: !location.show_on_website 
    });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = activeLocations[index];
    const previous = activeLocations[index - 1];
    
    await Promise.all([
      updateLocation.mutateAsync({ id: current.id, display_order: previous.display_order }),
      updateLocation.mutateAsync({ id: previous.id, display_order: current.display_order }),
    ]);
  };

  const handleMoveDown = async (index: number) => {
    if (index === activeLocations.length - 1) return;
    const current = activeLocations[index];
    const next = activeLocations[index + 1];
    
    await Promise.all([
      updateLocation.mutateAsync({ id: current.id, display_order: next.display_order }),
      updateLocation.mutateAsync({ id: next.id, display_order: current.display_order }),
    ]);
  };

  const websiteVisibleCount = activeLocations.filter(loc => loc.show_on_website).length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display">Website Locations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Control which locations appear on the public website
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Website
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/admin/settings')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Edit in Settings
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-muted/50 border rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {websiteVisibleCount} of {activeLocations.length} locations visible on website
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle visibility to control which locations appear on your public website.
              To add new locations or edit details, go to Settings → Locations.
            </p>
          </div>
        </div>

        {/* Locations List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">
              Loading locations...
            </Card>
          ) : activeLocations.length === 0 ? (
            <Card className="p-8 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No active locations</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add locations in Settings → Locations
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/dashboard/admin/settings')}
              >
                Go to Settings
              </Button>
            </Card>
          ) : (
            activeLocations.map((location, index) => (
              <Card
                key={location.id}
                className={cn(
                  "group transition-all duration-200 hover:shadow-sm",
                  !location.show_on_website && "opacity-70 bg-muted/30"
                )}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Reorder handle */}
                  <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity pt-1">
                    <button
                      className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                    <button
                      className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={index === activeLocations.length - 1}
                      onClick={() => handleMoveDown(index)}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Location info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-medium">{location.name}</h3>
                      {location.show_on_website ? (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          <Eye className="w-3 h-3 mr-1" />
                          Visible
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {location.address}, {location.city}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3 h-3 shrink-0" />
                        {location.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatHoursForDisplay(location.hours_json) || location.hours || 'No hours set'}
                      </p>
                    </div>
                  </div>

                  {/* Website visibility toggle */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Show on website
                      </span>
                      <Switch
                        checked={location.show_on_website}
                        onCheckedChange={() => handleToggleWebsiteVisibility(location)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer Note */}
        {activeLocations.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Drag locations to reorder how they appear on the website. 
            Edit location details in <button 
              onClick={() => navigate('/dashboard/admin/settings')}
              className="underline hover:text-foreground transition-colors"
            >
              Settings → Locations
            </button>.
          </p>
        )}
      </div>

      {/* Preview Modal */}
      <LocationPreviewModal 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
      />
    </DashboardLayout>
  );
}
