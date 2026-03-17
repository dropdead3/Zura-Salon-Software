import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Send, Loader2, CheckCircle, XCircle, AlertCircle, MapPin, ChevronDown } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useLocations, getClosedDaysArray } from '@/hooks/useLocations';
import { 
  useLocationSchedule, 
  useLocationSchedules,
  useUpsertLocationSchedule, 
  useCreateScheduleChangeRequest,
  useMyScheduleChangeRequests 
} from '@/hooks/useLocationSchedules';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

export function WorkScheduleWidget() {
  const { data: profile } = useEmployeeProfile();
  const { data: locations } = useLocations();
  const { data: myRequests } = useMyScheduleChangeRequests();
  const { data: allSchedules } = useLocationSchedules();
  
  const userLocations = locations?.filter(loc => 
    profile?.location_ids?.includes(loc.id) || profile?.location_id === loc.id
  ) || [];

  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestedDays, setRequestedDays] = useState<string[]>([]);
  const [reason, setReason] = useState('');

  const { data: currentSchedule, isLoading } = useLocationSchedule(selectedLocationId);
  const upsertSchedule = useUpsertLocationSchedule();
  const createRequest = useCreateScheduleChangeRequest();

  // Set default location when data loads
  useEffect(() => {
    if (userLocations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(userLocations[0].id);
    }
  }, [userLocations, selectedLocationId]);

  // Initialize requested days when opening dialog
  useEffect(() => {
    if (requestDialogOpen && currentSchedule) {
      setRequestedDays(currentSchedule.work_days || []);
    }
  }, [requestDialogOpen, currentSchedule]);

  // Get days used by other locations
  const getDaysUsedByOtherLocations = () => {
    const otherSchedules = allSchedules?.filter(s => s.location_id !== selectedLocationId) || [];
    return otherSchedules.flatMap(s => s.work_days || []);
  };

  const toggleDay = (day: string) => {
    const daysUsedElsewhere = getDaysUsedByOtherLocations();
    
    // Check if trying to add a day that's used elsewhere
    if (!requestedDays.includes(day) && daysUsedElsewhere.includes(day)) {
      const otherLocation = allSchedules?.find(
        s => s.location_id !== selectedLocationId && s.work_days?.includes(day)
      );
      const otherLocationName = locations?.find(l => l.id === otherLocation?.location_id)?.name || 'another location';
      
      toast({
        title: "Day unavailable",
        description: `${DAYS_OF_WEEK.find(d => d.key === day)?.label} is already assigned to ${otherLocationName}. Days cannot overlap between locations.`,
        variant: "destructive",
      });
      return;
    }
    
    setRequestedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  const handleSubmitRequest = async () => {
    if (!selectedLocationId) return;
    
    await createRequest.mutateAsync({
      locationId: selectedLocationId,
      currentDays: currentSchedule?.work_days || [],
      requestedDays,
      reason,
    });

    setRequestDialogOpen(false);
    setReason('');
  };

  const pendingRequest = myRequests?.find(
    r => r.location_id === selectedLocationId && r.status === 'pending'
  );

  const selectedLocation = locations?.find(l => l.id === selectedLocationId);

  // Get schedule summary for each location
  const getLocationScheduleSummary = (locationId: string) => {
    const schedule = allSchedules?.find(s => s.location_id === locationId);
    return schedule?.work_days?.length || 0;
  };

  if (userLocations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Preferred Work Schedule
          </CardTitle>
          <CardDescription className="mt-1">
            Your general availability, not day-to-day schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No locations assigned. Please update your profile with your work locations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysUsedElsewhere = getDaysUsedByOtherLocations();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Preferred Work Schedule
            </CardTitle>
            <CardDescription className="mt-1">
              Your general availability preferences, not day-to-day schedule
            </CardDescription>
          </div>
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button size={tokens.button.card} variant="outline" disabled={!!pendingRequest}>
                <Send className="w-4 h-4 mr-2" />
                Request Change
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Preference Change</DialogTitle>
                <DialogDescription>
                  Submit a request to update your preferred work days at {selectedLocation?.name}. 
                  This reflects your general availability, not specific dates. Leadership will review your request.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select your preferred work days</label>
                  {(() => {
                    const closedDays = getClosedDaysArray(selectedLocation?.hours_json || null);
                    return (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => {
                            const isUsedElsewhere = daysUsedElsewhere.includes(day.key);
                            const isLocationClosed = closedDays.includes(day.key);
                            const isDisabled = isUsedElsewhere || isLocationClosed;
                            
                            const otherLocation = allSchedules?.find(
                              s => s.location_id !== selectedLocationId && s.work_days?.includes(day.key)
                            );
                            const otherLocationName = locations?.find(l => l.id === otherLocation?.location_id)?.name;
                            
                            let tooltipText: string | undefined;
                            if (isLocationClosed) {
                              tooltipText = `${selectedLocation?.name} is closed on ${day.label}`;
                            } else if (isUsedElsewhere) {
                              tooltipText = `Assigned to ${otherLocationName}`;
                            }
                            
                            return (
                              <Button
                                key={day.key}
                                type="button"
                                variant={requestedDays.includes(day.key) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleDay(day.key)}
                                disabled={isDisabled}
                                title={tooltipText}
                                className={cn(
                                  "min-w-[60px]",
                                  requestedDays.includes(day.key) && "bg-primary text-primary-foreground",
                                  isLocationClosed && "opacity-30 cursor-not-allowed line-through",
                                  isUsedElsewhere && !isLocationClosed && "opacity-40 cursor-not-allowed line-through"
                                )}
                              >
                                {day.key}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {requestedDays.length} days selected
                          {closedDays.length > 0 && (
                            <span className="ml-2">
                              • Closed {closedDays.join(' & ')}
                            </span>
                          )}
                          {daysUsedElsewhere.length > 0 && (
                            <span className="ml-2 text-amber-600">
                              • {daysUsedElsewhere.length} days at other locations
                            </span>
                          )}
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you'd like to change your schedule..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitRequest}
                  disabled={createRequest.isPending}
                >
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location selector - improved dropdown */}
        {userLocations.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between h-auto py-3 px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{selectedLocation?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getLocationScheduleSummary(selectedLocationId)} days scheduled
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] bg-background border shadow-lg z-50">
              {userLocations.map(loc => {
                const scheduleDays = getLocationScheduleSummary(loc.id);
                const isSelected = loc.id === selectedLocationId;
                return (
                  <DropdownMenuItem 
                    key={loc.id} 
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={cn(
                      "flex items-center gap-3 py-3 px-4 cursor-pointer",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {scheduleDays} days scheduled
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {userLocations.length === 1 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">{userLocations[0].name}</div>
              <div className="text-xs text-muted-foreground">Your assigned location</div>
            </div>
          </div>
        )}

        {/* Pending request banner */}
        {pendingRequest && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              You have a pending schedule change request
            </span>
          </div>
        )}

        {/* Current schedule display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isWorking = currentSchedule?.work_days?.includes(day.key);
                return (
                  <Badge
                    key={day.key}
                    variant={isWorking ? 'default' : 'outline'}
                    className={cn(
                      "min-w-[50px] justify-center py-1.5",
                      isWorking 
                        ? "bg-primary/90 text-primary-foreground" 
                        : "text-muted-foreground"
                    )}
                  >
                    {day.key}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentSchedule?.work_days?.length || 0} days per week
            </p>
          </div>
        )}

        {/* Recent requests */}
        {myRequests && myRequests.filter(r => r.location_id === selectedLocationId).length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Requests</h4>
            <div className="space-y-2">
              {myRequests
                .filter(r => r.location_id === selectedLocationId)
                .slice(0, 3)
                .map(request => (
                  <div key={request.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {request.requested_days.join(', ')}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        request.status === 'approved' && "text-green-600 border-green-600",
                        request.status === 'denied' && "text-red-600 border-red-600",
                        request.status === 'pending' && "text-amber-600 border-amber-600"
                      )}
                    >
                      {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {request.status === 'denied' && <XCircle className="w-3 h-3 mr-1" />}
                      {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {request.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}