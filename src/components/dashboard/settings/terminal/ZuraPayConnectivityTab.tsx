import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { AlertTriangle, ArrowUpCircle, ShieldCheck, Signal, Wifi } from 'lucide-react';
import { OfflinePaymentStatus } from '../OfflinePaymentStatus';

interface ZuraPayConnectivityTabProps {
  readers?: { device_type: string }[];
}

export function ZuraPayConnectivityTab({ readers }: ZuraPayConnectivityTabProps) {
  const hasS710 = readers?.some((r) => r.device_type === 'stripe_s710') ?? false;

  return (
    <div className="space-y-6">
      <OfflinePaymentStatus />

      {/* NeverDown Payments Callout */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <CardTitle className={tokens.card.title}>NEVERDOWN PAYMENTS</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-sans text-sm text-muted-foreground">
            {hasS710
              ? 'Your Zura Pay Reader S710 is equipped with cellular failover and store-and-forward technology, ensuring your business never misses a payment — even during internet outages.'
              : 'Your Zura Pay Reader S700 includes store-and-forward technology, allowing payments to be accepted and securely stored on-device during internet outages.'}
          </p>

          <div className={`grid gap-3 ${hasS710 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {hasS710 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                <Wifi className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-sans text-sm font-medium">WiFi + Cellular</p>
                  <p className="text-xs text-muted-foreground">
                    Real-time authorization continues over cellular when WiFi drops. Payments are approved or declined instantly — no deferred risk.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                    Built-in eSIM — no carrier contract or SIM card required. Cellular is enabled automatically for your S710 readers.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <Signal className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium">Store-and-Forward</p>
                <p className="text-xs text-muted-foreground">
                  {hasS710
                    ? 'Last-resort fallback during total outages. Payments are stored on-device and authorized when connectivity returns. Small risk of post-service declines.'
                    : 'During internet outages, payments are securely stored on-device and authorized when connectivity returns. Small risk of post-service declines.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium">Revenue Protected</p>
                <p className="text-xs text-muted-foreground">
                  No lost sales due to connectivity issues. Your revenue stream stays intact no matter what.
                </p>
              </div>
            </div>
          </div>

          {!hasS710 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <ArrowUpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium text-amber-600 dark:text-amber-400">
                  Upgrade to S710 for Cellular Failover
                </p>
                <p className="text-xs text-muted-foreground">
                  The S710 adds cellular connectivity for real-time payment authorization when WiFi is unavailable — eliminating the risk of deferred declines.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
