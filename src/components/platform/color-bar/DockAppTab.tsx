import { Tablet, Scale, FlaskConical, ClipboardCheck, ExternalLink, Bluetooth } from 'lucide-react';
import { PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription, PlatformCardContent } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';

const modules = [
  {
    icon: Scale,
    title: 'Live Mixing',
    description: 'Real-time weighing, bowl management, and product dispensing with BLE scale integration.',
  },
  {
    icon: FlaskConical,
    title: 'Formula Memory',
    description: 'Client formula recall, clone, save, and version history for repeatable results.',
  },
  {
    icon: ClipboardCheck,
    title: 'Session Review',
    description: 'Reweigh compliance, waste logging, and session completion workflows.',
  },
];

export function DockAppTab() {
  return (
    <div className="space-y-6">
      <PlatformCard variant="glass" size="container" className="p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Tablet className="w-7 h-7 text-violet-400" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl tracking-wide text-[hsl(var(--platform-foreground))]">
              ZURA DOCK
            </h2>
            <p className="text-[hsl(var(--platform-foreground-muted))] max-w-md">
              The user-facing mixing station experience for iPad and mobile — weighing, formulas, and session management powered by the Zura Scale.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PlatformBadge variant="primary" size="sm">
              <Tablet className="w-3 h-3 mr-1" />
              iPad Optimized
            </PlatformBadge>
            <PlatformBadge variant="info" size="sm">
              <Bluetooth className="w-3 h-3 mr-1" />
              BLE Scale Ready
            </PlatformBadge>
          </div>
          <PlatformButton variant="outline" className="mt-2" onClick={() => window.open('/dock?demo=preview', '_blank')}>
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Dock Preview
          </PlatformButton>
        </div>
      </PlatformCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <PlatformCard key={mod.title} variant="interactive" size="md">
            <PlatformCardHeader>
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center mb-2">
                <mod.icon className="w-5 h-5 text-violet-400" />
              </div>
              <PlatformCardTitle className="text-base">{mod.title}</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <PlatformCardDescription>{mod.description}</PlatformCardDescription>
            </PlatformCardContent>
          </PlatformCard>
        ))}
      </div>
    </div>
  );
}
