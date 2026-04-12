import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import type { BookingSurfaceFlow } from '@/hooks/useBookingSurfaceConfig';

interface BookingFlowConfiguratorProps {
  flow: BookingSurfaceFlow;
  onChange: (flow: BookingSurfaceFlow) => void;
}

const TEMPLATES = [
  {
    value: 'category-first' as const,
    label: 'Category → Service → Stylist → Time',
    description: 'Browse services first, then choose a stylist',
    bestFor: 'Most salons — clients explore services before choosing who',
    steps: ['Category', 'Service', 'Stylist', 'Time', 'Info', 'Confirm'],
  },
  {
    value: 'stylist-first' as const,
    label: 'Stylist → Service → Time',
    description: 'Choose a stylist first, then their available services',
    bestFor: 'Relationship-driven salons where clients follow a specific stylist',
    steps: ['Stylist', 'Service', 'Time', 'Info', 'Confirm'],
  },
  {
    value: 'location-first' as const,
    label: 'Location → Service → Stylist → Time',
    description: 'Start by picking a location (multi-location salons)',
    bestFor: 'Multi-location businesses where location matters first',
    steps: ['Location', 'Service', 'Stylist', 'Time', 'Info', 'Confirm'],
  },
];

export function BookingFlowConfigurator({ flow, onChange }: BookingFlowConfiguratorProps) {
  const [draft, setDraft] = useState(flow);

  const toggle = (key: keyof BookingSurfaceFlow) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => onChange(draft);

  const selectedTemplate = TEMPLATES.find(t => t.value === draft.template) || TEMPLATES[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">BOOKING FLOW</CardTitle>
        <CardDescription>Configure how clients move through the booking experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flow template */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Flow Template</Label>
          <Select value={draft.template} onValueChange={(v: BookingSurfaceFlow['template']) => setDraft((prev) => ({ ...prev, template: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Visual step preview */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-3">{selectedTemplate.bestFor}</p>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedTemplate.steps.map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border">
                    <span className="text-[10px] font-medium text-primary">{i + 1}</span>
                    <span className="text-xs text-foreground">{step}</span>
                  </div>
                  {i < selectedTemplate.steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visibility toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Display Options</Label>
          <div className="space-y-3">
            {[
              { key: 'showPrices' as const, label: 'Show Prices', desc: 'Display starting prices on service cards' },
              { key: 'showDuration' as const, label: 'Show Duration', desc: 'Show estimated service duration' },
              { key: 'showDescriptions' as const, label: 'Show Descriptions', desc: 'Show service descriptions in the browser' },
              { key: 'showStylistBios' as const, label: 'Show Stylist Bios', desc: 'Show stylist bios on the stylist picker' },
              { key: 'showAddOns' as const, label: 'Show Add-Ons', desc: 'Allow clients to add optional extras' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={draft[key] as boolean} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Flow Settings
        </Button>
      </CardContent>
    </Card>
  );
}
