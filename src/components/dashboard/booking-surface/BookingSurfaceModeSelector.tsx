import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Code, Layers } from 'lucide-react';
import type { BookingSurfaceConfig } from '@/hooks/useBookingSurfaceConfig';

interface BookingSurfaceModeSelectorProps {
  mode: BookingSurfaceConfig['mode'];
  onChange: (mode: BookingSurfaceConfig['mode']) => void;
}

const MODES = [
  {
    value: 'hosted' as const,
    icon: Globe,
    title: 'Hosted Booking Page',
    description: 'A branded standalone booking page hosted by Zura. Link out from your website.',
    best: 'Best for salons that want a dedicated booking URL',
  },
  {
    value: 'embed' as const,
    icon: Code,
    title: 'Embedded Widget',
    description: 'Add Zura booking directly into your existing website with a simple code snippet.',
    best: 'Best for salons embedding booking on their own site',
  },
  {
    value: 'both' as const,
    icon: Layers,
    title: 'Both',
    description: 'Offer both an embedded booking experience and a standalone booking page.',
    best: 'Maximum flexibility for client access',
  },
];

export function BookingSurfaceModeSelector({ mode, onChange }: BookingSurfaceModeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">DEPLOYMENT MODE</CardTitle>
        <CardDescription>Choose how clients will access your booking experience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const isSelected = mode === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => onChange(m.value)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 bg-card'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
                <p className="font-sans text-sm font-medium text-foreground mb-1">{m.title}</p>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed mb-2">{m.description}</p>
                <p className="font-sans text-xs text-primary/70 italic">{m.best}</p>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
