import { useState, useMemo } from 'react';
import { parseISO, getDay } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { UserCheck, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveAssistants } from '@/hooks/useAssistantAvailability';
import { cn } from '@/lib/utils';
import type { AssistantRequest } from '@/hooks/useAssistantRequests';

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ManualAssignmentDialogProps {
  request: AssistantRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualAssignmentDialog({ request, open, onOpenChange }: ManualAssignmentDialogProps) {
  const { formatDate } = useFormatDate();
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: allAssistants = [] } = useActiveAssistants();

  const dayOfWeek = request ? DAY_KEYS[getDay(parseISO(request.request_date))] : '';

  // Filter assistants: scheduled for this location & day
  const availableAssistants = useMemo(() => {
    if (!request) return [];
    
    return allAssistants.filter(assistant =>
      assistant.schedules.some(
        schedule => 
          schedule.location_id === request.location_id && 
          schedule.work_days?.includes(dayOfWeek)
      )
    );
  }, [allAssistants, request, dayOfWeek]);

  // Show all assistants but mark unavailable ones
  const allAssistantsWithStatus = useMemo(() => {
    if (!request) return [];
    
    return allAssistants.map(assistant => {
      const isAvailable = assistant.schedules.some(
        schedule => 
          schedule.location_id === request.location_id && 
          schedule.work_days?.includes(dayOfWeek)
      );
      const hasDeclined = request.declined_by?.includes(assistant.user_id) || false;
      
      return {
        ...assistant,
        isAvailable,
        hasDeclined,
      };
    }).sort((a, b) => {
      // Sort: available first, then by declined status
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      if (a.hasDeclined && !b.hasDeclined) return 1;
      if (!a.hasDeclined && b.hasDeclined) return -1;
      return 0;
    });
  }, [allAssistants, request, dayOfWeek]);

  const handleAssign = async () => {
    if (!request || !selectedAssistantId) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('assistant_requests')
        .update({
          assistant_id: selectedAssistantId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          accepted_at: null, // Reset acceptance
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Assistant manually assigned');
      queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Assignment failed:', error);
      toast.error('Failed to assign assistant');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Manual Assignment
          </DialogTitle>
          <DialogDescription>
            Assign an assistant to {request.client_name}'s appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Details */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatDate(parseISO(request.request_date), 'EEEE, MMM d')} • {request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{request.locations?.name || 'No location'}</span>
            </div>
            <div className="text-muted-foreground">
              Service: {request.salon_services?.name}
            </div>
          </div>

          {request.declined_by && request.declined_by.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {request.declined_by.length} assistant(s) have declined this request
              </AlertDescription>
            </Alert>
          )}

          {/* Assistant List */}
          <div>
            <h4 className="text-sm font-medium mb-2">Select Assistant</h4>
            <ScrollArea className="h-[240px] border rounded-lg">
              <div className="p-2 space-y-2">
                {allAssistantsWithStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No assistants found
                  </p>
                ) : (
                  allAssistantsWithStatus.map((assistant) => (
                    <button
                      key={assistant.user_id}
                      type="button"
                      onClick={() => setSelectedAssistantId(assistant.user_id)}
                      disabled={assistant.hasDeclined}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                        selectedAssistantId === assistant.user_id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted/50",
                        assistant.hasDeclined && "opacity-50 cursor-not-allowed",
                        !assistant.isAvailable && !assistant.hasDeclined && "opacity-70"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={assistant.photo_url || undefined} />
                        <AvatarFallback>
                          {(assistant.display_name || assistant.full_name).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {assistant.display_name || assistant.full_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {assistant.isAvailable ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not scheduled
                            </Badge>
                          )}
                          {assistant.hasDeclined && (
                            <Badge variant="destructive" className="text-xs">
                              Declined
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedAssistantId || isAssigning}
            >
              {isAssigning ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
