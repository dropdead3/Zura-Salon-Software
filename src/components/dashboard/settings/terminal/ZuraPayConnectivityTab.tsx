import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { ShieldCheck, Signal, Wifi } from 'lucide-react';
import { OfflinePaymentStatus } from '../OfflinePaymentStatus';

export function ZuraPayConnectivityTab() {
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
            Your Zura Pay Reader S710 is equipped with cellular failover and store-and-forward technology, ensuring your business never misses a payment — even during internet outages.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <Wifi className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium">WiFi + Cellular</p>
                <p className="text-xs text-muted-foreground">Automatic cellular failover when WiFi drops — no manual intervention required.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <Signal className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium">Store-and-Forward</p>
                <p className="text-xs text-muted-foreground">During total outages, payments are securely stored on-device and forwarded when connectivity returns.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium">Revenue Protected</p>
                <p className="text-xs text-muted-foreground">No lost sales due to connectivity issues. Your revenue stream stays intact no matter what.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
