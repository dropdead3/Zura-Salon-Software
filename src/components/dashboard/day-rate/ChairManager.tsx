import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Armchair, 
  DollarSign, 
  Settings2,
  AlertCircle 
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useLocations, useUpdateLocation } from '@/hooks/useLocations';
import { 
  useDayRateChairs, 
  useCreateDayRateChair, 
  useUpdateDayRateChair, 
  useDeleteDayRateChair,
  useBulkCreateChairs 
} from '@/hooks/useDayRateChairs';
import type { Location } from '@/hooks/useLocations';
import type { DayRateChair } from '@/hooks/useDayRateChairs';
import { toast } from 'sonner';

export function ChairManager() {
  const { data: locations, isLoading: loadingLocations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  if (loadingLocations) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg tracking-wide mb-1">CHAIR INVENTORY</h3>
        <p className="text-sm text-muted-foreground">
          Configure day rate availability and chair inventory per location
        </p>
      </div>

      <div className="grid gap-4">
        {locations?.map(location => (
          <LocationChairCard
            key={location.id}
            location={location}
            isExpanded={selectedLocationId === location.id}
            onToggle={() => setSelectedLocationId(
              selectedLocationId === location.id ? null : location.id
            )}
          />
        ))}
      </div>
    </div>
  );
}

function LocationChairCard({ 
  location, 
  isExpanded, 
  onToggle 
}: { 
  location: Location;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: chairs, isLoading } = useDayRateChairs(location.id);
  const updateLocation = useUpdateLocation();
  const createChair = useCreateDayRateChair();
  const updateChair = useUpdateDayRateChair();
  const deleteChair = useDeleteDayRateChair();
  const bulkCreate = useBulkCreateChairs();

  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkCount, setBulkCount] = useState(4);
  const [defaultRate, setDefaultRate] = useState(location.day_rate_default_price || 150);

  // Cast to include day rate fields
  const dayRateEnabled = (location as any).day_rate_enabled ?? false;
  const dayRateDefaultPrice = (location as any).day_rate_default_price ?? 150;

  const handleToggleEnabled = async () => {
    await updateLocation.mutateAsync({
      id: location.id,
      day_rate_enabled: !dayRateEnabled,
    } as any);
  };

  const handleUpdateDefaultPrice = async (price: number) => {
    await updateLocation.mutateAsync({
      id: location.id,
      day_rate_default_price: price,
    } as any);
  };

  const handleBulkCreate = async () => {
    await bulkCreate.mutateAsync({
      locationId: location.id,
      count: bulkCount,
      dailyRate: defaultRate,
    });
    setShowBulkCreate(false);
  };

  const handleAddChair = async () => {
    const nextNumber = (chairs?.length || 0) + 1;
    await createChair.mutateAsync({
      location_id: location.id,
      chair_number: nextNumber,
      daily_rate: dayRateDefaultPrice,
      is_available: true,
      name: null,
    });
  };

  const handleDeleteChair = async (chairId: string) => {
    await deleteChair.mutateAsync(chairId);
  };

  const handleToggleChairAvailable = async (chair: DayRateChair) => {
    await updateChair.mutateAsync({
      id: chair.id,
      is_available: !chair.is_available,
    });
  };

  const handleUpdateChairRate = async (chair: DayRateChair, rate: number) => {
    await updateChair.mutateAsync({
      id: chair.id,
      daily_rate: rate,
    });
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Armchair className="w-5 h-5 text-muted-foreground" />
          <div>
            <h4 className="font-medium">{location.name}</h4>
            <p className="text-sm text-muted-foreground">{location.city}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={dayRateEnabled ? 'default' : 'secondary'}>
            {dayRateEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {dayRateEnabled && chairs && (
            <span className="text-sm text-muted-foreground">
              {chairs.filter(c => c.is_available).length} of {chairs.length} chairs
            </span>
          )}
          <Settings2 className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Day Rate Rentals</Label>
              <p className="text-xs text-muted-foreground">
                Allow external stylists to book chairs at this location
              </p>
            </div>
            <Switch
              checked={dayRateEnabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {dayRateEnabled && (
            <>
              {/* Default Price */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Default Daily Rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={dayRateDefaultPrice}
                      onChange={(e) => handleUpdateDefaultPrice(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              {/* Chairs List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chairs</Label>
                  <div className="flex gap-2">
                    <Dialog open={showBulkCreate} onOpenChange={setShowBulkCreate}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size={tokens.button.card}>
                          Bulk Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Multiple Chairs</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Number of Chairs</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={bulkCount}
                              onChange={(e) => setBulkCount(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Daily Rate</Label>
                            <Input
                              type="number"
                              value={defaultRate}
                              onChange={(e) => setDefaultRate(Number(e.target.value))}
                            />
                          </div>
                          <Button onClick={handleBulkCreate} className="w-full">
                            Create {bulkCount} Chairs
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size={tokens.button.card} onClick={handleAddChair}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Chair
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : chairs && chairs.length > 0 ? (
                  <div className="space-y-2">
                    {chairs.map(chair => (
                      <div 
                        key={chair.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <Armchair className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            Chair #{chair.chair_number}
                            {chair.name && <span className="text-muted-foreground ml-1">({chair.name})</span>}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              type="number"
                              value={chair.daily_rate}
                              onChange={(e) => handleUpdateChairRate(chair, Number(e.target.value))}
                              className="w-20 h-8 text-sm"
                            />
                          </div>
                          <Switch
                            checked={chair.is_available}
                            onCheckedChange={() => handleToggleChairAvailable(chair)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteChair(chair.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chairs configured</p>
                    <p className="text-xs">Add chairs to enable day rate bookings</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
