import { format } from 'date-fns';
import { Calendar, Star, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useClientPreviewData } from '@/hooks/useClientPreviewData';
import { PreviewSkeleton } from '../CommandPreviewPanel';
import type { RankedResult } from '@/lib/searchRanker';

interface ClientPreviewProps {
  result: RankedResult;
}

function extractClientId(result: RankedResult): string | null {
  // Try to extract from result.id pattern "client-{uuid}"
  if (result.id.startsWith('client-')) return result.id.slice(7);
  // Try from path ?id=...
  if (result.path) {
    const match = result.path.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
  }
  return null;
}

export function ClientPreview({ result }: ClientPreviewProps) {
  const clientId = extractClientId(result);
  const { data: client, isLoading } = useClientPreviewData(clientId);

  if (isLoading) return <PreviewSkeleton />;

  if (!client) {
    return (
      <div className="space-y-3">
        <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
        {result.subtitle && <p className="font-sans text-xs text-muted-foreground">{result.subtitle}</p>}
        <p className="font-sans text-xs text-muted-foreground/60 pt-2">Open to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-sm tracking-wide text-foreground">
          {client.firstName} {client.lastName}
        </h3>
        {client.isVip && (
          <span className="flex items-center gap-0.5 text-[10px] font-sans font-medium text-amber-500">
            <Star className="w-3 h-3 fill-amber-500" /> VIP
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniTile label="Last Visit" value={client.lastVisitDate ? format(new Date(client.lastVisitDate), 'MMM d') : '—'} />
        <MiniTile label="Total Spend">
          <AnimatedBlurredAmount value={client.totalSpend} currency="USD" className="font-sans text-sm text-foreground" />
        </MiniTile>
        <MiniTile label="Visits" value={String(client.visitCount)} />
        <MiniTile
          label="Upcoming"
          value={client.nextAppointmentDate ? format(new Date(client.nextAppointmentDate), 'MMM d') : '—'}
          icon={client.nextAppointmentDate ? <Calendar className="w-3 h-3 text-primary/60" /> : undefined}
        />
      </div>

      {client.notes && (
        <p className="font-sans text-xs text-muted-foreground line-clamp-2 border-t border-border/20 pt-3">
          {client.notes}
        </p>
      )}

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>Open Client Profile</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}

function MiniTile({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
      <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {icon}
        {children || <span className="font-sans text-sm text-foreground">{value}</span>}
      </div>
    </div>
  );
}
