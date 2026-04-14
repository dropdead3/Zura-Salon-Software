import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflinePaymentQueue } from '@/hooks/useOfflinePaymentQueue';
import { Wifi, WifiOff, Signal, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface OfflinePaymentStatusProps {
  readers?: { device_type: string }[];
}

export function OfflinePaymentStatus({ readers }: OfflinePaymentStatusProps) {
  const { isOnline, isOffline, offlineEvents, currentOfflineDuration } = useOfflineStatus();
  const { pendingCount, pendingTotalFormatted, forwardedCount, lastForwardedAt, isForwarding } = useOfflinePaymentQueue();
  const { clearOfflineEvents } = useOfflineStatus();

  const hasS710 = readers?.some((r) => r.device_type === 'stripe_s710') ?? false;
  const hasS700 = readers?.some((r) => r.device_type === 'stripe_s700') ?? false;
  const readerCount = readers?.length ?? 0;
  const modelLabel = hasS710 && hasS700 ? 'S700/S710' : hasS710 ? 'S710' : hasS700 ? 'S700' : 'S700/S710';

  const recentEvents = offlineEvents.slice(-5).reverse();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Signal className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CONNECTIVITY & OFFLINE PAYMENTS</CardTitle>
                <MetricInfoTooltip description={`Real-time connectivity status and offline payment queue visibility. The ${modelLabel} reader stores payments securely when offline and forwards them automatically when connection returns.`} />
              </div>
              <CardDescription>{modelLabel} store-and-forward payment protection status.</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5',
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            )}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Connected' : `Offline — ${modelLabel} Active`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Connection Status */}
          <div className="p-4 rounded-xl bg-muted/30 border relative">
            <MetricInfoTooltip description={hasS710 ? "Shows your current network status. When WiFi drops, your S710 automatically switches to cellular for real-time authorization." : "Shows your current network status. Your S700 uses store-and-forward to accept payments during outages."} className="absolute top-3 right-3" />
            <div className="flex items-center gap-2 mb-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <Signal className="w-4 h-4 text-amber-500" />
              )}
              <span className="font-sans text-xs text-muted-foreground">Connection</span>
            </div>
            <p className="font-display text-lg tracking-wide">
              {isOnline ? 'ONLINE' : hasS710 ? 'CELLULAR FAILOVER' : 'STORE & FORWARD'}
            </p>
            {isOffline && currentOfflineDuration && (
              <p className="font-sans text-xs text-amber-500 mt-1">
                Offline for {currentOfflineDuration}
              </p>
            )}
          </div>

          {/* Pending Payments */}
          <div className="p-4 rounded-xl bg-muted/30 border relative">
            <MetricInfoTooltip description="Payments accepted while offline that are queued on-device, waiting to be authorized when connectivity returns. A count above zero means payments are stored but not yet settled." className="absolute top-3 right-3" />
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-sans text-xs text-muted-foreground">Pending Forward</span>
            </div>
            <p className="font-display text-lg tracking-wide">
              {pendingCount}
            </p>
            {pendingCount > 0 && (
              <p className="font-sans text-xs text-amber-500 mt-1">
                {pendingTotalFormatted} queued{isForwarding ? ' — syncing…' : ''}
              </p>
            )}
            {pendingCount === 0 && (
              <p className="font-sans text-xs text-emerald-500 mt-1">All clear</p>
            )}
          </div>

          {/* Forwarded */}
          <div className="p-4 rounded-xl bg-muted/30 border relative">
            <MetricInfoTooltip description="Payments that were accepted offline and have since been successfully authorized and settled after connectivity was restored." className="absolute top-3 right-3" />
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-sans text-xs text-muted-foreground">Forwarded</span>
            </div>
            <p className="font-display text-lg tracking-wide">
              {forwardedCount}
            </p>
            {lastForwardedAt && (
              <p className="font-sans text-xs text-muted-foreground mt-1">
                Last: {formatDistanceToNow(lastForwardedAt, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {/* S710 Protection Banner */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-sans text-sm text-foreground">{modelLabel} Store & Forward Active</p>
            <p className="font-sans text-xs text-muted-foreground">
              {hasS710
                ? 'If connectivity is lost, your S710 continues authorizing payments over cellular. Store-and-forward activates as a last resort during total outages.'
                : 'If connectivity is lost, payments are stored securely on the device and forwarded automatically when connection returns.'}
            </p>
          </div>
        </div>

        {/* Offline Event Timeline */}
        {recentEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-xs text-muted-foreground">Recent connectivity events</p>
              <button
                onClick={clearOfflineEvents}
                className="font-sans text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Clear history
              </button>
            </div>
            <div className="space-y-2">
              {recentEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    event.type === 'offline' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <span className="font-sans text-muted-foreground">
                    {event.type === 'offline' ? 'Went offline' : 'Reconnected'}
                  </span>
                  <span className="font-mono text-muted-foreground/60">
                    {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                  </span>
                  {event.duration && (
                    <span className="font-sans text-muted-foreground/60">
                      ({event.duration})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
