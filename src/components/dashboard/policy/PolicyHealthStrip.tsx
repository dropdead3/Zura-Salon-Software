import { Card, CardContent } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Library, FileCheck2, Megaphone, Network } from 'lucide-react';
import type { PolicyHealthSummary } from '@/hooks/policy/usePolicyData';
import { useApplicableRequiredPolicies } from '@/hooks/policy/usePolicyOrgProfile';

interface Props {
  summary: PolicyHealthSummary;
}

export function PolicyHealthStrip({ summary }: Props) {
  const applicable = useApplicableRequiredPolicies();

  const items = [
    {
      key: 'adopted',
      label: 'Adopted',
      icon: Library,
      value: `${applicable.adopted}/${applicable.total}`,
      sub: 'of required for your business',
    },
    {
      key: 'configured',
      label: 'Rule sets defined',
      icon: FileCheck2,
      value: `${summary.configured}`,
      sub: 'configured policies',
    },
    {
      key: 'published',
      label: 'Live to clients',
      icon: Megaphone,
      value: `${summary.published}`,
      sub: 'on public policy page',
    },
    {
      key: 'wired',
      label: 'Wired to surfaces',
      icon: Network,
      value: `${summary.wired}`,
      sub: 'rendered in workflows',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="relative rounded-xl border-border/60 bg-card/80">
            <CardContent className="p-5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={cn(tokens.kpi.label)}>{item.label}</span>
                <Icon className="w-4 h-4 text-muted-foreground/70" />
              </div>
              <span className={cn(tokens.stat.large)}>{item.value}</span>
              <span className="font-sans text-xs text-muted-foreground">{item.sub}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
