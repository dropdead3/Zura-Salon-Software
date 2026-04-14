import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Monitor, Palette, Play, Pause, Settings2, ToggleLeft, ToggleRight, Receipt } from 'lucide-react';
import { S710CheckoutSimulator, SimCartItem } from './S710CheckoutSimulator';
import { cn } from '@/lib/utils';
import { useTipConfig } from '@/hooks/useTipConfig';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';

const S710_SPECS = [
  { label: 'Display', value: '5.5" touchscreen · 1080×1920' },
  { label: 'Connectivity', value: 'Ethernet · WiFi · Cellular failover' },
  { label: 'Payments', value: 'Tap · Chip · Swipe' },
  { label: 'Offline', value: 'Store & forward when disconnected' },
];

const SAMPLE_CART: SimCartItem[] = [
  { label: 'Balayage Full Head', amount: 18500 },
  { label: 'Olaplex Treatment', amount: 4500 },
  { label: 'Blowout & Style', amount: 6500 },
];

interface CheckoutDisplayConceptProps {
  businessName?: string;
  orgLogoUrl?: string | null;
}

export function CheckoutDisplayConcept({ businessName = 'Your Salon', orgLogoUrl }: CheckoutDisplayConceptProps) {
  const [autoPlay, setAutoPlay] = useState(true);

  // Pull live config from database
  const { data: tipConfig } = useTipConfig();
  const { data: receiptConfig } = useReceiptConfig();

  const tipEnabled = tipConfig?.enabled ?? true;
  const tipPercentages = tipConfig?.percentages ?? [20, 25, 30];
  const receiptSlogan = receiptConfig?.custom_message || '';

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
                <MetricInfoTooltip description="Live preview of the branded Zura Pay checkout experience on your S710 readers. This reflects your current tipping and receipt settings." />
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
        {/* Simulator + config side by side, stacks on narrow */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Simulator */}
          <div className="flex flex-col items-center shrink-0">
            <S710CheckoutSimulator
              businessName={businessName}
              autoPlay={autoPlay}
              cartItems={SAMPLE_CART}
              orgLogoUrl={orgLogoUrl}
              tipPercentages={tipPercentages}
              tipEnabled={tipEnabled}
              receiptSlogan={receiptSlogan}
            />
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-sans uppercase tracking-wider"
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoPlay ? 'Pause' : 'Auto-play'}
            </button>
          </div>

          {/* Right panel: live config + specs + experience */}
          <div className="flex-1 w-full space-y-4">
            {/* Live configuration summary */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">Live Configuration</p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 font-sans">
                This preview reflects your current settings. Changes in Tipping and Receipts tabs update here automatically.
              </p>
              <div className="space-y-2 pt-1">
                {/* Tipping status */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {tipEnabled ? (
                      <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
                    )}
                    <span className="text-muted-foreground font-sans">Tipping</span>
                  </div>
                  <span className={cn(
                    'text-[10px] font-mono',
                    tipEnabled ? 'text-foreground' : 'text-muted-foreground/50'
                  )}>
                    {tipEnabled ? `${tipPercentages.join('% · ')}%` : 'Disabled'}
                  </span>
                </div>

                {/* Receipt slogan */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <span className="text-muted-foreground font-sans">Receipt Message</span>
                  </div>
                  <span className="text-[10px] font-sans text-foreground truncate max-w-[180px]">
                    {receiptSlogan || '—'}
                  </span>
                </div>
              </div>
            </div>

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
                {[
                  'Branded splash screen',
                  'Itemized cart display',
                  ...(tipEnabled ? ['Tip selection'] : []),
                  'Tap / chip / swipe prompts',
                  'Real-time status updates',
                ].map((cap) => (
                  <span key={cap} className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground font-sans',
                    'transition-colors hover:text-foreground hover:border-foreground/20'
                  )}>
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
