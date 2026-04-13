import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Smartphone, Monitor, Code2, Layers, Server, Palette, ArrowRight, Play, Pause } from 'lucide-react';
import { S710CheckoutSimulator } from './S710CheckoutSimulator';
import { cn } from '@/lib/utils';

const INTEGRATION_PATHS = [
  {
    id: 'server-driven',
    icon: Server,
    title: 'Server-Driven Display',
    status: 'Ready',
    statusColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    description: 'Control the reader display remotely via API. Show cart details, totals, and payment prompts. No app deployment needed.',
    capabilities: ['Cart / line item display', 'Payment collection', 'Real-time status updates'],
    api: 'terminal-reader-display edge function',
    docs: 'https://docs.stripe.com/terminal/payments/collect-payment?terminal-sdk-platform=server-driven',
  },
  {
    id: 'apps-on-devices',
    icon: Layers,
    title: 'Apps on Devices (Full Custom)',
    status: 'Phase 2',
    statusColor: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
    description: 'Deploy a custom Android app to the S710 for full brand control — splash screens, animations, custom layouts, and interactive flows.',
    capabilities: ['Custom splash / idle screens', 'Branded animations', 'Interactive checkout UX', 'Multi-app support'],
    api: 'Android APK via Stripe app review',
    docs: 'https://docs.stripe.com/terminal/features/apps-on-devices/overview',
  },
];

const S710_SPECS = [
  { label: 'Display', value: '5.5" · 1080×1920 · 420dpi' },
  { label: 'OS', value: 'Android 10 (AOSP)' },
  { label: 'CPU / RAM', value: 'Snapdragon 665 · 4GB' },
  { label: 'Connectivity', value: 'Ethernet → WiFi → Cellular' },
  { label: 'Payments', value: 'Tap · Chip · Swipe · Store & Forward' },
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
                <MetricInfoTooltip description="Design and preview the branded Zura Pay checkout experience that runs on your S710 readers. The server-driven integration is ready now; full custom app deployment is planned for Phase 2." />
              </div>
              <CardDescription>Branded on-reader experience for the S710 touchscreen.</CardDescription>
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

          {/* Right panel: specs + integration paths */}
          <div className="flex-1 space-y-4">
            {/* Device specs */}
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">S710 Device Specifications</p>
              {S710_SPECS.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-sans">{spec.label}</span>
                  <span className="font-mono text-foreground text-[10px]">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Integration paths */}
            <div className="space-y-3">
              <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-sans">Integration Paths</p>
              {INTEGRATION_PATHS.map((path) => {
                const Icon = path.icon;
                return (
                  <div key={path.id} className="p-3 rounded-xl bg-muted/30 border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="font-sans text-sm font-medium">{path.title}</span>
                      </div>
                      <Badge variant="outline" className={cn(path.statusColor, 'text-[9px]')}>
                        {path.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">{path.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {path.capabilities.map((cap) => (
                        <span key={cap} className="text-[9px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground font-sans">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Apps on Devices deployment info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/[0.04] border border-violet-500/15">
          <Code2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div className="font-sans">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Full custom branding (Phase 2):</span> The S710 runs Android 10 and supports deploying custom APKs via Stripe's "Apps on Devices" program. This enables the branded splash screen, animations, and interactive checkout shown in the simulator. Apps require Stripe review before deployment to production readers. Web apps can be packaged with Cordova for Android compatibility.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
