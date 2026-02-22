import { useAssistantsAtLocation } from '@/hooks/useAssistantAvailability';
import { Info } from 'lucide-react';

interface AssistantAvailabilityNoteProps {
  locationId: string;
  date: Date;
}

export function AssistantAvailabilityNote({ locationId, date }: AssistantAvailabilityNoteProps) {
  const available = useAssistantsAtLocation(locationId || undefined, date);
  const count = available.length;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Info className="h-3 w-3 shrink-0" />
      {count > 0 ? (
        <span>{count} assistant{count > 1 ? 's' : ''} scheduled at this location</span>
      ) : (
        <span>No assistants scheduled this day — request will go to the open pool</span>
      )}
    </div>
  );
}
