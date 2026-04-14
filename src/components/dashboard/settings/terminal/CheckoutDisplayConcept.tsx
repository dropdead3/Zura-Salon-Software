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
import { useColorTheme } from '@/hooks/useColorTheme';
import { useTerminalSplashScreen } from '@/hooks/useTerminalSplashScreen';
import { useTerminalLocations } from '@/hooks/useStripeTerminals';
import { useLocations } from '@/hooks/useLocations';

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
  const { colorTheme } = useColorTheme();

  // Pull live config from database
  const { data: tipConfig } = useTipConfig();
  const { data: receiptConfig } = useReceiptConfig();

  // Fetch splash screen for first available location
  const { data: locations = [] } = useLocations();
  const firstLocationId = locations[0]?.id || null;
  const { data: terminalLocations = [] } = useTerminalLocations(firstLocationId);
  const terminalLocationId = terminalLocations[0]?.id;
  const { data: splashStatus } = useTerminalSplashScreen(firstLocationId, terminalLocationId);
  const splashImageUrl = splashStatus?.splash_url || null;

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
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-display tracking-wider">
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
              splashImageUrl={splashImageUrl}
              tipPercentages={tipPercentages}
              tipEnabled={tipEnabled}
              receiptSlogan={receiptSlogan}
              colorTheme={colorTheme}
            />
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans uppercase tracking-wider"
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
                <p className={tokens.heading.subsection}>Live Configuration</p>
              </div>
              <p className={tokens.body.muted}>
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
                    <span className={tokens.body.muted}>Tipping</span>
                  </div>
                  <span className={cn(
                    'text-xs font-mono',
                    tipEnabled ? 'text-foreground' : 'text-muted-foreground/50'
                  )}>
                    {tipEnabled ? `${tipPercentages.join('% · ')}%` : 'Disabled'}
                  </span>
                </div>

                {/* Receipt slogan */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <span className={tokens.body.muted}>Receipt Message</span>
                  </div>
                  <span className="text-xs font-sans text-foreground truncate max-w-[180px]">
                    {receiptSlogan || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Device specs */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <p className={tokens.heading.subsection}>S710 Reader Specifications</p>
              {S710_SPECS.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between text-xs">
                  <span className={tokens.body.muted}>{spec.label}</span>
                  <span className="font-mono text-foreground text-xs">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Checkout experience summary */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <p className={tokens.heading.subsection}>Your Checkout Experience</p>
              </div>
              <p className={cn(tokens.body.muted, 'leading-relaxed')}>
                Your readers display a branded checkout flow with your business name, itemized cart details, totals, and payment prompts. The experience updates automatically across all your readers — no manual device configuration needed.
              </p>

              {/* Brandable vs firmware-locked */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-emerald-600 font-display">Brandable</p>
                  {[
                    'Splash / idle screen',
                    'Itemized cart display',
                    ...(tipEnabled ? ['Tip percentages'] : []),
                  ].map((cap) => (
                    <span key={cap} className={cn(
                      'block text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-sans',
                    )}>
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground/60 font-display">Not Brandable</p>
                  {[
                    'Tap / insert screen',
                    'Processing screen',
                    'Success screen',
                  ].map((cap) => (
                    <span key={cap} className={cn(
                      'block text-xs px-2.5 py-1 rounded-full bg-muted border text-muted-foreground/60 font-sans',
                    )}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <p className={cn(tokens.body.muted, 'text-[10px] leading-relaxed pt-1')}>
                Payment, processing, and success screens are controlled by the reader's firmware and cannot be customized. Splash, cart, and tip screens reflect your brand settings.
              </p>
              <div className="space-y-1.5 pt-1">
                <p className={cn(tokens.body.muted, 'text-[10px] leading-relaxed')}>
                  <span className="text-foreground/70">Sleep timeout:</span> The screen dim and sleep timer is a device-level setting. On the physical reader, go to <span className="font-mono text-foreground/70">Settings → Display → Sleep</span> to adjust the inactivity timeout.
                </p>
                <p className={cn(tokens.body.muted, 'text-[10px] leading-relaxed')}>
                  <span className="text-foreground/70">Admin passcode:</span> The default reader admin PIN is <span className="font-mono text-foreground/70">07139</span>. This reader is registered under your organization's payment account — device settings and reader details are managed through that account, not the Zura platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
