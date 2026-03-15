import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Package, Beaker, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Package,
    title: 'Product Catalog',
    description: 'Track every product with real-time inventory projections and par-level alerts.',
  },
  {
    icon: Beaker,
    title: 'Recipe & Mixing',
    description: 'Define formulas, track dispensed vs leftover, and eliminate chemical waste.',
  },
  {
    icon: BarChart3,
    title: 'Cost Intelligence',
    description: 'Wholesale price sync, markup calculations, and cost-per-service analytics.',
  },
  {
    icon: Shield,
    title: 'Waste & Compliance',
    description: 'Ghost loss detection, reweigh compliance, and variance tracking.',
  },
];

export function BackroomPaywall() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Hero */}
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className={cn(tokens.heading.page, 'text-2xl')}>
            Unlock Zura Backroom
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto font-sans">
            Take control of your backroom operations with inventory intelligence, chemical tracking, and cost optimization.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/60 border-border/40">
              <CardContent className="p-4 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-sm text-foreground')}>{f.title}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button size="lg" className="font-sans font-medium gap-2">
            Contact Sales to Enable
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground font-sans">
            Available as a paid add-on to your Zura subscription.
          </p>
        </div>
      </div>
    </div>
  );
}
