import { Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankedResult } from '@/lib/searchRanker';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'text-emerald-500',
  checked_in: 'text-blue-500',
  in_progress: 'text-amber-500',
  completed: 'text-muted-foreground',
};

interface AppointmentPreviewProps {
  result: RankedResult;
}

export function AppointmentPreview({ result }: AppointmentPreviewProps) {
  const subtitleParts = result.subtitle?.split(' · ') || [];
  const time = subtitleParts[0] || '';
  const service = subtitleParts.slice(1).join(' · ') || '';
  const status = result.metadata || 'scheduled';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-primary/60" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
          <span className={cn('font-sans text-[10px] capitalize', STATUS_STYLES[status] || 'text-muted-foreground/70')}>
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {time && (
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
            <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">Time</span>
            <div className="font-sans text-sm text-foreground">{time}</div>
          </div>
        )}
        {service && (
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
            <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">Service</span>
            <div className="font-sans text-sm text-foreground truncate">{service}</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>View Schedule</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
