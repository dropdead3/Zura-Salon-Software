import { ArrowRight } from 'lucide-react';
import type { RankedResult } from '@/lib/searchRanker';

// Static descriptions for common pages
const PAGE_DESCRIPTIONS: Record<string, { description: string; bullets: string[] }> = {
  '/dashboard': {
    description: 'Your daily command center with key metrics and alerts.',
    bullets: ['Quick stats & KPIs', 'Today\'s appointments', 'Action items'],
  },
  '/dashboard/analytics': {
    description: 'Deep-dive into revenue, operations, and marketing data.',
    bullets: ['Revenue trends', 'Service performance', 'Client analytics'],
  },
  '/dashboard/schedule': {
    description: 'View and manage appointments across your team.',
    bullets: ['Daily/weekly calendar', 'Booking management', 'Availability'],
  },
  '/dashboard/directory': {
    description: 'Your complete team directory with roles and performance.',
    bullets: ['Team profiles', 'Role assignments', 'Performance snapshots'],
  },
  '/dashboard/clients': {
    description: 'Manage your client database and relationships.',
    bullets: ['Client search', 'Visit history', 'Retention data'],
  },
  '/dashboard/payroll': {
    description: 'Commission tracking, payroll runs, and compensation.',
    bullets: ['Commission tiers', 'Pay period summaries', 'Payout history'],
  },
  '/dashboard/inventory': {
    description: 'Track product stock, orders, and retail performance.',
    bullets: ['Stock levels', 'Reorder alerts', 'Retail analytics'],
  },
  '/dashboard/admin/settings': {
    description: 'Configure your organization settings and preferences.',
    bullets: ['Business info', 'Location management', 'Integrations'],
  },
};

interface NavigationPreviewProps {
  result: RankedResult;
}

export function NavigationPreview({ result }: NavigationPreviewProps) {
  const basePath = result.path?.split('?')[0] || '';
  const meta = PAGE_DESCRIPTIONS[basePath];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
        {result.subtitle && (
          <p className="font-sans text-xs text-muted-foreground mt-1">{result.subtitle}</p>
        )}
      </div>

      {meta ? (
        <>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
          <div className="space-y-1.5 pt-1">
            <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">What you'll find</span>
            {meta.bullets.map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs font-sans text-foreground/80">
                <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="font-sans text-xs text-muted-foreground/60">Open to explore this section.</p>
      )}

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>Navigate</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
