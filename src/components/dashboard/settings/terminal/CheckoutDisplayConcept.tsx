import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Monitor, Palette, Play, Pause } from 'lucide-react';
import { S710CheckoutSimulator } from './S710CheckoutSimulator';

const S710_SPECS = [
  { label: 'Display', value: '5.5" touchscreen · 1080×1920' },
  { label: 'Connectivity', value: 'Ethernet · WiFi · Cellular failover' },
  { label: 'Payments', value: 'Tap · Chip · Swipe' },
  { label: 'Offline', value: 'Store & forward when disconnected' },
];

interface CheckoutDisplayConceptProps {
  businessName?: string;
}

export function CheckoutDisplayConcept({ businessName = 'Your Salon' }: CheckoutDisplayConceptProps) {
  const [autoPlay, setAutoPlay] = useState(true);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Monitor className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CHECKOUT DISPLAY</CardTitle>
                <MetricInfoTooltip description="Preview the branded Zura Pay checkout experience that appears on your S710 readers during transactions." />
              </div>
              <CardDescription>What your clients see on the S710 touchscreen at checkout.</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30 text-[10px]">
            S710 · 5.5" DISPLAY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simulator + specs side by side */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Simulator */}
          <div className="flex flex-col items-center">
            <S710CheckoutSimulator
              businessName={businessName}
              autoPlay={autoPlay}
              cartItems={[
                { label: 'Balayage Full Head', amount: 18500 },
                { label: 'Olaplex Treatment', amount: 4500 },
                { label: 'Blowout & Style', amount: 6500 },
              ]}
            />
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans uppercase tracking-wider"
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoPlay ? 'Pause' : 'Auto-play'}
            </button>
          </div>

          {/* Right panel: specs + experience description */}
          <div className="flex-1 space-y-4">
            {/* Device specs */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">S710 Reader Specifications</p>
              {S710_SPECS.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-sans">{spec.label}</span>
                  <span className="font-mono text-foreground text-[10px]">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Checkout experience summary */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">Your Checkout Experience</p>
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Your readers display a branded checkout flow with your business name, itemized cart details, totals, and payment prompts. The experience updates automatically across all your readers — no manual device configuration needed.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Branded splash screen', 'Itemized cart display', 'Tap / chip / swipe prompts', 'Real-time status updates'].map((cap) => (
                  <span key={cap} className="text-[9px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground font-sans">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
