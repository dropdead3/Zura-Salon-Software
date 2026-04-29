import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Mail, MessageSquare, AlertTriangle, Eye, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useArchiveDeliveryReceipts } from '@/hooks/useArchiveDeliveryReceipts';
import { IdentityBlock } from '@/components/dashboard/team-members/IdentityBlock';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Props {
  organizationId: string;
  archiveLogId: string;
  archivedAt: string;
  fullName?: string;
  employeeId?: string | null;
  hireDate?: string | null;
}

/**
 * Delivery receipts for the soft-notify dispatch tied to a single archive event.
 * Auto-refreshes every 60s while within the 24h capture window.
 */
export function ArchiveDeliveryReceiptCard({
  organizationId,
  archiveLogId,
  archivedAt,
  fullName,
  employeeId,
  hireDate,
}: Props) {
  const { data, isLoading } = useArchiveDeliveryReceipts(archiveLogId, archivedAt, organizationId);
  const [open, setOpen] = useState(false);

  const showIdentity = Boolean(fullName && (employeeId || hireDate));

  const identityRow = showIdentity ? (
    <div className="pb-4 mb-4 border-b border-border/40">
      <IdentityBlock
        fullName={fullName!}
        employeeId={employeeId ?? null}
        hireDate={hireDate ?? null}
        size="md"
      />
    </div>
  ) : null;

  if (isLoading) {
    return (
      <TooltipProvider delayDuration={150}>
        <Card>
          <CardHeader>
            {identityRow}
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  const total = (data?.emailSent ?? 0) + (data?.smsSent ?? 0) + (data?.smsFailed ?? 0);

  if (total === 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Card>
          <CardHeader>
            {identityRow}
            <div className="flex items-start gap-3">
              <div className={tokens.card.iconBox}>
                <Inbox className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Delivery — last 24h</CardTitle>
                <CardDescription>No client notifications were dispatched for this archive.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <Card>
      <CardHeader>
        {identityRow}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Delivery — last 24h</CardTitle>
              <CardDescription>
                {data?.isWithinWindow
                  ? 'Auto-refreshes every minute while within the 24-hour capture window.'
                  : 'Capture window closed — totals are final.'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<Mail className="h-4 w-4" />} label="Emails sent" value={data?.emailSent ?? 0} />
          <Stat icon={<Eye className="h-4 w-4" />} label="Opens" value={data?.emailOpens ?? 0} muted />
          <Stat icon={<MessageSquare className="h-4 w-4" />} label="SMS sent" value={data?.smsSent ?? 0} />
          <Stat
            icon={<AlertTriangle className="h-4 w-4" />}
            label="SMS failed"
            value={data?.smsFailed ?? 0}
            tone={data && data.smsFailed > 0 ? 'destructive' : 'default'}
          />
        </div>

        {data && data.failedSmsReasons.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
              View {data.failedSmsReasons.length} failure {data.failedSmsReasons.length === 1 ? 'reason' : 'reasons'}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {data.failedSmsReasons.map((r, i) => (
                <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <p className="font-sans text-xs text-foreground">{r.to ?? 'Unknown number'}</p>
                  <p className="font-sans text-[11px] text-muted-foreground mt-0.5">{r.error ?? 'No error message'}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <p className="font-sans text-[11px] text-muted-foreground">
          Note: bounce and complaint signals from email providers are not captured in this view. Open-rate is the most reliable proxy for inbox delivery.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = 'default',
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'default' | 'destructive';
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-1">
      <div
        className={cn(
          'flex items-center gap-1.5 font-display text-[10px] uppercase tracking-wider',
          tone === 'destructive' ? 'text-destructive' : muted ? 'text-muted-foreground' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'font-display text-2xl tracking-wide',
          tone === 'destructive' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}
