import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin,
  RefreshCw, 
  Users, 
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useTodaysQueue, useUpdateQueueStatus } from '@/hooks/useTodaysQueue';
import { useLocations } from '@/hooks/useLocations';
import { QueueCard } from './operations/QueueCard';
import { WalkInDialog } from './operations/WalkInDialog';
import { CheckoutSummarySheet } from './schedule/CheckoutSummarySheet';
import { EditAppointmentDialog } from './schedule/EditAppointmentDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QueueAppointment } from '@/hooks/useTodaysQueue';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface TodaysQueueSectionProps {
  locationId?: string;
  onLocationChange?: (locationId: string) => void;
  showLocationFilter?: boolean;
}

export function TodaysQueueSection({
  locationId: externalLocationId,
  onLocationChange,
  showLocationFilter = true,
}: TodaysQueueSectionProps) {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const [internalLocationId, setInternalLocationId] = useState<string>('all');
  const [checkoutAppointment, setCheckoutAppointment] = useState<QueueAppointment | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<QueueAppointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { formatDate } = useFormatDate();
  const locationId = externalLocationId ?? internalLocationId;
  const handleLocationChange = onLocationChange ?? setInternalLocationId;

  const { data: locations } = useLocations();
  const { data: queueData, isLoading, refetch, isFetching } = useTodaysQueue(locationId);
  const updateStatus = useUpdateQueueStatus();

  // Get business settings for checkout
  const { data: businessSettings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Get selected location details
  const selectedLocation = locations?.find(l => l.id === locationId);
  const taxRate = (selectedLocation as any)?.tax_rate ?? businessSettings?.default_tax_rate ?? 0.08;

  const handleCheckIn = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: 'checked_in' });
  };

  const handlePay = (appointment: QueueAppointment) => {
    setCheckoutAppointment(appointment);
    setCheckoutOpen(true);
  };

  const handleEdit = (appointment: QueueAppointment) => {
    setEditAppointment(appointment);
    setEditDialogOpen(true);
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      const { error } = await supabase
        .from('phorest_appointments')
        .delete()
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      toast.success('Appointment deleted');
      queryClient.invalidateQueries({ queryKey: ['todays-queue'] });
    } catch (error) {
      toast.error('Failed to delete appointment');
    }
  };

  const handleCheckoutConfirm = (tipAmount: number, rebooked: boolean, promoResult?: any, declineReason?: string) => {
    if (checkoutAppointment) {
      updateStatus.mutate({ 
        appointmentId: checkoutAppointment.id, 
        status: 'completed' 
      });
    }
    setCheckoutOpen(false);
    setCheckoutAppointment(null);
  };

  const today = formatDate(new Date(), 'EEEE, MMMM d, yyyy');
  const totalAppointments = queueData 
    ? queueData.waiting.length + queueData.inService.length + queueData.upcoming.length + queueData.completed.length
    : 0;

  return (
    <>
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg tracking-wide">TODAY'S QUEUE</h2>
              <Badge variant="secondary" className="font-sans">
                {totalAppointments} appointments
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{today}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {showLocationFilter && (
              <Select value={locationId} onValueChange={handleLocationChange}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            
            <WalkInDialog locationId={locationId} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <ChartSkeleton key={i} lines={5} className="h-40" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Waiting Section */}
            {queueData && queueData.waiting.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-amber-600" />
                  <h3 className="font-medium text-sm font-display uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Arrivals ({queueData.waiting.length})
                  </h3>
                </div>
                <ScrollArea className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    {queueData.waiting.map(apt => (
                      <QueueCard
                        key={apt.id}
                        appointment={apt}
                        variant="waiting"
                        onCheckIn={() => handleCheckIn(apt.id)}
                        onEdit={() => handleEdit(apt)}
                        onDelete={() => handleDelete(apt.id)}
                        isUpdating={updateStatus.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* In Service Section */}
            {queueData && queueData.inService.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-sm font-display uppercase tracking-wide text-blue-700 dark:text-blue-400">
                    In Service ({queueData.inService.length})
                  </h3>
                </div>
                <ScrollArea className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    {queueData.inService.map(apt => (
                      <QueueCard
                        key={apt.id}
                        appointment={apt}
                        variant="inService"
                        onPay={() => handlePay(apt)}
                        onEdit={() => handleEdit(apt)}
                        onDelete={() => handleDelete(apt.id)}
                        isUpdating={updateStatus.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Upcoming Section */}
            {queueData && queueData.upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm font-display uppercase tracking-wide text-muted-foreground">
                    Upcoming ({queueData.upcoming.length})
                  </h3>
                </div>
                <ScrollArea className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    {queueData.upcoming.slice(0, 6).map(apt => (
                      <QueueCard
                        key={apt.id}
                        appointment={apt}
                        variant="upcoming"
                        onCheckIn={() => handleCheckIn(apt.id)}
                        onEdit={() => handleEdit(apt)}
                        onDelete={() => handleDelete(apt.id)}
                        isUpdating={updateStatus.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
                {queueData.upcoming.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{queueData.upcoming.length - 6} more upcoming
                  </p>
                )}
              </div>
            )}

            {/* Empty State */}
            {queueData && 
              queueData.waiting.length === 0 && 
              queueData.inService.length === 0 && 
              queueData.upcoming.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No appointments in queue</p>
                <p className="text-sm mt-1">
                  {queueData.completed.length > 0 
                    ? `${queueData.completed.length} completed today` 
                    : 'Add a walk-in or wait for scheduled appointments'}
                </p>
              </div>
            )}

            {/* View Full Schedule Link */}
            <div className="flex justify-center pt-2">
              <Button variant="ghost" asChild className="text-muted-foreground">
                <Link to={dashPath('/schedule')}>
                  View Full Schedule
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Checkout Sheet */}
      {checkoutAppointment && (
        <CheckoutSummarySheet
          appointment={{
            id: checkoutAppointment.id,
            phorest_id: checkoutAppointment.phorest_id,
            stylist_user_id: checkoutAppointment.stylist_user_id,
            phorest_staff_id: checkoutAppointment.phorest_staff_id,
            client_name: checkoutAppointment.client_name || '',
            client_phone: checkoutAppointment.client_phone,
            appointment_date: checkoutAppointment.appointment_date,
            start_time: checkoutAppointment.start_time,
            end_time: checkoutAppointment.end_time,
            service_name: checkoutAppointment.service_name || '',
            service_category: checkoutAppointment.service_category,
            status: (checkoutAppointment.status as 'booked' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'),
            location_id: checkoutAppointment.location_id,
            total_price: checkoutAppointment.total_price,
            notes: checkoutAppointment.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phorest_client_id: checkoutAppointment.phorest_client_id,
            is_new_client: checkoutAppointment.is_new_client ?? false,
            recurrence_group_id: null,
            recurrence_index: null,
            recurrence_rule: null,
            is_redo: false,
            redo_reason: null,
            original_appointment_id: null,
            redo_pricing_override: null,
            redo_approved_by: null,
            original_price: null,
          }}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onConfirm={handleCheckoutConfirm}
          isUpdating={updateStatus.isPending}
          taxRate={taxRate}
          businessSettings={businessSettings as any}
          locationName={selectedLocation?.name || ''}
          locationAddress={(selectedLocation as any)?.address}
          locationPhone={(selectedLocation as any)?.phone}
          organizationId={effectiveOrganization?.id}
        />
      )}

      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        appointment={editAppointment}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditAppointment(null);
        }}
      />
    </>
  );
}
