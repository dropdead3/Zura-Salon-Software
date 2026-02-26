import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
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
import { EditorCard } from './EditorCard';

export function LocationsContent() {
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
    <EditorCard
      title="Website Locations"
      icon={MapPin}
      description="Control which locations appear on the public website"
      headerActions={
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size={tokens.button.inline}
            onClick={() => setPreviewOpen(true)}
            className="gap-1.5 text-muted-foreground"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Button>
          <Button 
            variant="ghost" 
            size={tokens.button.inline}
            onClick={() => navigate('/dashboard/admin/settings')}
            className="gap-1.5 text-muted-foreground"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Button>
        </div>
      }
    >

      {/* Info Banner */}
      <div className="bg-muted/50 border rounded-lg p-3 flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
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
              <div className="flex items-start gap-2.5 p-3">
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

                {/* Location info + toggle stacked */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  {/* Toggle moved below info */}
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t">
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

      <LocationPreviewModal 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
      />
    </EditorCard>
  );
}
