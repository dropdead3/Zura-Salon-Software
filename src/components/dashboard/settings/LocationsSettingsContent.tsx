import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  MapPin,
  Phone,
  Clock,
  Calendar,
  X,
  FolderOpen,
  Layers,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useLocations, 
  useCreateLocation, 
  useUpdateLocation, 
  useDeleteLocation,
  formatHoursForDisplay,
  type Location,
  type HoursJson,
  type DayHours,
  type HolidayClosure,
} from '@/hooks/useLocations';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { LocationCapacityBar } from './LocationCapacityBar';
import { AddLocationSeatsDialog } from './AddLocationSeatsDialog';
import { LocationStationsTab } from './LocationStationsTab';
import {
  useLocationGroups,
  useCreateLocationGroup,
  useUpdateLocationGroup,
  useDeleteLocationGroup,
  useAssignLocationToGroup,
  type LocationGroup,
} from '@/hooks/useLocationGroups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const defaultHours: HoursJson = {
  monday: { closed: true },
  tuesday: { open: '10:00', close: '18:00' },
  wednesday: { open: '10:00', close: '18:00' },
  thursday: { open: '10:00', close: '18:00' },
  friday: { open: '10:00', close: '18:00' },
  saturday: { open: '10:00', close: '18:00' },
  sunday: { closed: true },
};

type LocationFormData = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  store_number: string;
  booking_url: string;
  google_maps_url: string;
  hours: string;
  hours_json: HoursJson;
  holiday_closures: HolidayClosure[];
  major_crossroads: string;
  is_active: boolean;
  display_order: number;
  tax_rate: number | null;
  stylist_capacity: number | null;
  assistant_ratio: number | null;
  break_minutes_per_day: number | null;
  lunch_minutes: number | null;
  appointment_padding_minutes: number | null;
  legal_name: string;
  ein: string;
};

const emptyForm: LocationFormData = {
  id: '',
  name: '',
  address: '',
  city: '',
  phone: '',
  store_number: '',
  booking_url: '',
  google_maps_url: '',
  hours: '',
  hours_json: defaultHours,
  holiday_closures: [],
  major_crossroads: '',
  is_active: true,
  display_order: 0,
  tax_rate: null,
  stylist_capacity: null,
  assistant_ratio: 0.5,
  break_minutes_per_day: 30,
  lunch_minutes: 45,
  appointment_padding_minutes: 10,
  legal_name: '',
  ein: '',
};

import { toast } from 'sonner';

export function LocationsSettingsContent() {
  const { effectiveOrganization } = useOrganizationContext();
  const { formatDate } = useFormatDate();
  const { data: locations = [], isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const capacity = useBusinessCapacity();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddSeatsDialogOpen, setIsAddSeatsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const canAddLocation = capacity.canAddLocation;

  const handleOpenCreate = () => {
    if (!canAddLocation) {
      toast.error("You've used all your location seats", {
        description: 'Add more seats to continue adding locations.',
        action: {
          label: 'Add Seats',
          onClick: () => setIsAddSeatsDialogOpen(true),
        },
      });
      return;
    }
    setEditingLocation(null);
    setFormData({
      ...emptyForm,
      display_order: locations.length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      phone: location.phone,
      store_number: location.store_number || '',
      booking_url: location.booking_url || '',
      google_maps_url: location.google_maps_url || '',
      hours: location.hours || '',
      hours_json: location.hours_json || defaultHours,
      holiday_closures: location.holiday_closures || [],
      major_crossroads: location.major_crossroads || '',
      is_active: location.is_active,
      display_order: location.display_order,
      tax_rate: location.tax_rate,
      stylist_capacity: location.stylist_capacity,
      assistant_ratio: location.assistant_ratio,
      break_minutes_per_day: location.break_minutes_per_day ?? 30,
      lunch_minutes: location.lunch_minutes ?? 45,
      appointment_padding_minutes: location.appointment_padding_minutes ?? 10,
      legal_name: (location as any).legal_name || '',
      ein: (location as any).ein || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const locationData = {
      id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      address: formData.address,
      city: formData.city,
      phone: formData.phone,
      store_number: formData.store_number || null,
      booking_url: formData.booking_url || null,
      google_maps_url: formData.google_maps_url || null,
      hours: formatHoursForDisplay(formData.hours_json),
      hours_json: formData.hours_json,
      holiday_closures: formData.holiday_closures,
      major_crossroads: formData.major_crossroads || null,
      phorest_branch_id: null,
      is_active: formData.is_active,
      show_on_website: true, // Default to true for new locations
      display_order: formData.display_order,
      tax_rate: formData.tax_rate,
      stylist_capacity: formData.stylist_capacity,
      assistant_ratio: formData.assistant_ratio,
      day_rate_enabled: null,
      day_rate_default_price: null,
      day_rate_blackout_dates: null,
      break_minutes_per_day: formData.break_minutes_per_day,
      lunch_minutes: formData.lunch_minutes,
      appointment_padding_minutes: formData.appointment_padding_minutes,
      state_province: null,
      country: 'US',
      stripe_account_id: null,
      stripe_payments_enabled: false,
      stripe_status: 'not_connected' as const,
      location_group_id: null,
      legal_name: formData.legal_name || null,
      ein: formData.ein || null,
    };

    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, ...locationData });
    } else {
      await createLocation.mutateAsync(locationData);
    }
    setIsDialogOpen(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = locations[index];
    const previous = locations[index - 1];
    
    await Promise.all([
      updateLocation.mutateAsync({ id: current.id, display_order: previous.display_order }),
      updateLocation.mutateAsync({ id: previous.id, display_order: current.display_order }),
    ]);
  };

  const handleMoveDown = async (index: number) => {
    if (index === locations.length - 1) return;
    const current = locations[index];
    const next = locations[index + 1];
    
    await Promise.all([
      updateLocation.mutateAsync({ id: current.id, display_order: next.display_order }),
      updateLocation.mutateAsync({ id: next.id, display_order: current.display_order }),
    ]);
  };

  const handleToggleActive = async (location: Location) => {
    await updateLocation.mutateAsync({ id: location.id, is_active: !location.is_active });
  };

  const updateDayHours = (day: typeof DAYS[number], field: keyof DayHours, value: string | boolean) => {
    setFormData(f => ({
      ...f,
      hours_json: {
        ...f.hours_json,
        [day]: {
          ...f.hours_json[day],
          [field]: value,
        },
      },
    }));
  };

  const addHoliday = () => {
    if (!newHolidayDate || !newHolidayName) return;
    setFormData(f => ({
      ...f,
      holiday_closures: [...f.holiday_closures, { date: newHolidayDate, name: newHolidayName }],
    }));
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const removeHoliday = (index: number) => {
    setFormData(f => ({
      ...f,
      holiday_closures: f.holiday_closures.filter((_, i) => i !== index),
    }));
  };

  // Location Groups state
  const { data: locationGroups = [], isLoading: loadingGroups } = useLocationGroups();
  const createGroup = useCreateLocationGroup();
  const updateGroup = useUpdateLocationGroup();
  const deleteGroup = useDeleteLocationGroup();
  const assignToGroup = useAssignLocationToGroup();
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const groupedLocations = useMemo(() => {
    const groups = new Map<string | null, Location[]>();
    groups.set(null, []);
    for (const g of locationGroups) {
      groups.set(g.id, []);
    }
    for (const loc of locations) {
      const gid = (loc as any).location_group_id || null;
      if (!groups.has(gid)) groups.set(null, []);
      groups.get(gid)?.push(loc) ?? groups.get(null)?.push(loc);
    }
    return groups;
  }, [locations, locationGroups]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const slug = newGroupName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const orgId = effectiveOrganization?.id;
    if (!orgId) return;
    createGroup.mutate({
      organization_id: orgId,
      name: newGroupName.trim(),
      slug,
      display_order: locationGroups.length + 1,
    });
    setNewGroupName('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">ALL LOCATIONS</CardTitle>
              <CardDescription>Add, edit, and manage salon locations</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={handleOpenCreate} 
                      size={tokens.button.card} 
                      className="gap-2"
                      disabled={!canAddLocation && !capacity.locations.isUnlimited}
                    >
                      <Plus className="w-4 h-4" />
                      Add Location
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canAddLocation && !capacity.locations.isUnlimited && (
                  <TooltipContent>
                    <p>All location seats are in use</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capacity Bar */}
          {!capacity.isLoading && (
            <LocationCapacityBar 
              capacity={capacity} 
              onAddSeats={() => setIsAddSeatsDialogOpen(true)} 
            />
          )}
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No locations yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first salon location above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location, index) => (
                <div
                  key={location.id}
                  className={cn(
                    "group border rounded-lg transition-all duration-200 hover:shadow-sm",
                    !location.is_active && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Reorder buttons */}
                    <div className="flex flex-col opacity-40 group-hover:opacity-100 transition-opacity pt-1">
                      <button
                        className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={index === locations.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Location info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-medium">{location.name}</h3>
                        {!location.is_active && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
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
                        {location.holiday_closures && location.holiday_closures.length > 0 && (
                          <p className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {location.holiday_closures.length} holiday closure{location.holiday_closures.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={location.is_active}
                        onCheckedChange={() => handleToggleActive(location)}
                      />
                      <button
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        onClick={() => handleOpenEdit(location)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-2 rounded-md hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{location.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this location. Staff assigned to this location will need to be reassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteLocation.mutate(location.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Groups Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">LOCATION GROUPS</CardTitle>
                <CardDescription>Organize locations into regions or markets for grouped overrides</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new group */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">New Group Name</Label>
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g., East Region"
                className="h-9"
                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
              />
            </div>
            <Button
              size={tokens.button.card}
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createGroup.isPending}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Group
            </Button>
          </div>

          {/* Groups list */}
          {loadingGroups ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading groups...</p>
          ) : locationGroups.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No location groups yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create groups to organize locations by region or market</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locationGroups.map(group => {
                const groupLocs = groupedLocations.get(group.id) || [];
                const isEditing = editingGroupId === group.id;

                return (
                  <div key={group.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingGroupName}
                            onChange={e => setEditingGroupName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateGroup.mutate({ id: group.id, name: editingGroupName });
                                setEditingGroupId(null);
                              }
                              if (e.key === 'Escape') setEditingGroupId(null);
                            }}
                          />
                          <Button
                            size={tokens.button.inline}
                            onClick={() => {
                              updateGroup.mutate({ id: group.id, name: editingGroupName });
                              setEditingGroupId(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size={tokens.button.inline}
                            onClick={() => setEditingGroupId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{group.name}</span>
                          <span className="text-xs text-muted-foreground">({groupLocs.length} locations)</span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            onClick={() => {
                              setEditingGroupId(group.id);
                              setEditingGroupName(group.name);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Locations in this group will become ungrouped. Commission and criteria overrides tied to this group will no longer apply.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteGroup.mutate(group.id)}
                                >
                                  Delete Group
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>

                    {/* Assigned locations */}
                    {groupLocs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {groupLocs.map(loc => (
                          <Badge key={loc.id} variant="outline" className="text-xs gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {loc.name}
                            <button
                              className="ml-0.5 hover:text-destructive transition-colors"
                              onClick={() => assignToGroup.mutate({ locationId: loc.id, groupId: null })}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No locations assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ungrouped locations */}
          {(groupedLocations.get(null)?.length ?? 0) > 0 && locationGroups.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <h4 className="text-xs text-muted-foreground font-medium">Ungrouped Locations</h4>
              <div className="space-y-2">
                {(groupedLocations.get(null) || []).map(loc => (
                  <div key={loc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {loc.name}
                    </div>
                    <Select
                      value=""
                      onValueChange={(groupId) => assignToGroup.mutate({ locationId: loc.id, groupId })}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue placeholder="Assign to group" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationGroups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation 
                ? 'Update the location details below'
                : 'Enter the details for the new location'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className={cn("grid", editingLocation ? "grid-cols-4" : "grid-cols-3")}>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="holidays">Holidays</TabsTrigger>
              {editingLocation && <TabsTrigger value="stations">Stations</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 py-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Location Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Downtown"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store_number">Store Number</Label>
                    <Input
                      id="store_number"
                      value={formData.store_number}
                      onChange={(e) => setFormData(f => ({ ...f, store_number: e.target.value }))}
                      placeholder="e.g., 001 or NM-01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for this store
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g., 123 Main St"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City, State, ZIP</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g., Anytown, ST 12345"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g., (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="booking_url">Booking URL (optional)</Label>
                  <Input
                    id="booking_url"
                    value={formData.booking_url}
                    onChange={(e) => setFormData(f => ({ ...f, booking_url: e.target.value }))}
                    placeholder="e.g., /booking?location=downtown"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="google_maps_url">Google Maps URL (optional)</Label>
                  <Input
                    id="google_maps_url"
                    value={formData.google_maps_url}
                    onChange={(e) => setFormData(f => ({ ...f, google_maps_url: e.target.value }))}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="major_crossroads">Major Crossroads (for receptionist reference)</Label>
                  <Input
                    id="major_crossroads"
                    value={formData.major_crossroads}
                    onChange={(e) => setFormData(f => ({ ...f, major_crossroads: e.target.value }))}
                    placeholder="e.g., Main St & 1st Ave"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps receptionists give directions over the phone
                  </p>
                </div>

                {/* Tax Rate Override */}
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="tax_rate">Tax Rate Override (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_rate != null ? (formData.tax_rate * 100).toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(f => ({
                          ...f,
                          tax_rate: value ? parseFloat(value) / 100 : null,
                        }));
                      }}
                      placeholder="Use default"
                      className="w-32"
                    />
                    {formData.tax_rate != null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size={tokens.button.inline}
                        onClick={() => setFormData(f => ({ ...f, tax_rate: null }))}
                      >
                        Use Default
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default tax rate from Business Settings
                  </p>
                </div>

                {/* Staffing Capacity */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Staffing Capacity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stylist_capacity">Stylist Capacity</Label>
                      <Input
                        id="stylist_capacity"
                        type="number"
                        min="0"
                        value={formData.stylist_capacity ?? ''}
                        onChange={(e) => setFormData(f => ({ 
                          ...f, 
                          stylist_capacity: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="e.g., 8"
                      />
                      <p className="text-xs text-muted-foreground">
                        Target number of stylists for this location
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assistant_ratio">Assistant Ratio</Label>
                      <Input
                        id="assistant_ratio"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.assistant_ratio ?? ''}
                        onChange={(e) => setFormData(f => ({ 
                          ...f, 
                          assistant_ratio: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        placeholder="e.g., 0.5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Assistants per stylist (0.5 = 1 per 2 stylists)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Capacity Timing Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Capacity Timing</h4>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Adjust for real-world availability by accounting for breaks, lunch, and appointment transitions
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="break_minutes_per_day">Breaks/Day</Label>
                      <Input
                        id="break_minutes_per_day"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.break_minutes_per_day ?? 30}
                        onChange={(e) => setFormData(f => ({ 
                          ...f, 
                          break_minutes_per_day: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="30"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minutes (e.g., 2×15 min)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lunch_minutes">Lunch</Label>
                      <Input
                        id="lunch_minutes"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.lunch_minutes ?? 45}
                        onChange={(e) => setFormData(f => ({ 
                          ...f, 
                          lunch_minutes: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="45"
                      />
                      <p className="text-xs text-muted-foreground">
                        Per stylist/day
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appointment_padding_minutes">Appt Padding</Label>
                      <Input
                        id="appointment_padding_minutes"
                        type="number"
                        min="0"
                        max="60"
                        value={formData.appointment_padding_minutes ?? 10}
                        onChange={(e) => setFormData(f => ({ 
                          ...f, 
                          appointment_padding_minutes: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Buffer between appts
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Legal Entity (Multi-LLC) */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Legal Entity</h4>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Only needed if this location operates under a different LLC than the organization default
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="legal_name">Legal Name</Label>
                      <Input
                        id="legal_name"
                        value={formData.legal_name}
                        onChange={(e) => setFormData(f => ({ ...f, legal_name: e.target.value }))}
                        placeholder="Leave blank to use org default"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ein">EIN</Label>
                      <Input
                        id="ein"
                        value={formData.ein}
                        onChange={(e) => setFormData(f => ({ ...f, ein: e.target.value }))}
                        placeholder="Leave blank to use org default"
                        autoCapitalize="none"
                      />
                    </div>
                  </div>
                  {!formData.legal_name && !formData.ein && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Using organization defaults
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Label htmlFor="is_active">Active (operational status)</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="hours" className="space-y-4 py-4">
              {/* Weekend Presets */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <span className="text-sm text-muted-foreground mr-2">Quick presets:</span>
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      hours_json: {
                        ...f.hours_json,
                        saturday: { closed: true },
                        sunday: { closed: true },
                      },
                    }));
                  }}
                >
                  Close Weekends
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      hours_json: {
                        ...f.hours_json,
                        saturday: { open: '09:00', close: '15:00', closed: false },
                        sunday: { closed: true },
                      },
                    }));
                  }}
                >
                  Sat 9–3, Sun Closed
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      hours_json: {
                        ...f.hours_json,
                        saturday: { open: '10:00', close: '16:00', closed: false },
                        sunday: { open: '11:00', close: '15:00', closed: false },
                      },
                    }));
                  }}
                >
                  Weekend Reduced Hours
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => {
                    setFormData(f => ({
                      ...f,
                      hours_json: {
                        ...f.hours_json,
                        monday: { closed: true },
                        sunday: { closed: true },
                      },
                    }));
                  }}
                >
                  Mon & Sun Closed
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Set operating hours for each day of the week
              </p>
              <div className="space-y-3">
                {DAYS.map(day => {
                  const dayHours = formData.hours_json[day];
                  const isClosed = dayHours?.closed;
                  
                  return (
                    <div key={day} className="flex items-center gap-4 py-2 border-b last:border-0">
                      <div className="w-24">
                        <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!isClosed}
                          onCheckedChange={(open) => {
                            if (open) {
                              updateDayHours(day, 'closed', false);
                              if (!dayHours?.open) updateDayHours(day, 'open', '10:00');
                              if (!dayHours?.close) updateDayHours(day, 'close', '18:00');
                            } else {
                              updateDayHours(day, 'closed', true);
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {isClosed ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      {!isClosed && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={dayHours?.open || '10:00'}
                            onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={dayHours?.close || '18:00'}
                            onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Preview: <span className="text-foreground">{formatHoursForDisplay(formData.hours_json)}</span>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="holidays" className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Add dates when this location will be closed
              </p>
              
              {/* Add new holiday */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Holiday Name</Label>
                  <Input
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="e.g., Christmas Day"
                    className="h-9"
                  />
                </div>
                <Button 
                  size={tokens.button.inline} 
                  onClick={addHoliday}
                  disabled={!newHolidayDate || !newHolidayName}
                >
                  Add
                </Button>
              </div>
              
              {/* Holiday list */}
              {formData.holiday_closures.length > 0 ? (
                <div className="space-y-2 mt-4">
                  {formData.holiday_closures
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((holiday, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{holiday.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(new Date(holiday.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                        <button
                          onClick={() => removeHoliday(index)}
                          className="p-1 hover:bg-destructive/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No holiday closures scheduled
                </p>
              )}
            </TabsContent>

            {editingLocation && (
              <TabsContent value="stations">
                <LocationStationsTab locationId={editingLocation.id} />
              </TabsContent>
            )}
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.address || !formData.city || !formData.phone}
            >
              {editingLocation ? 'Save Changes' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Seats Dialog */}
      <AddLocationSeatsDialog
        open={isAddSeatsDialogOpen}
        onOpenChange={setIsAddSeatsDialogOpen}
        capacity={capacity}
      />
    </div>
  );
}
