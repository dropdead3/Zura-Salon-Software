/**
 * ReputationSettingsTab — Consolidated reputation settings.
 *
 * Single primary card (`ReviewGateAndBoostCard`) merges what used to be two
 * stacked cards: "Auto-Boost Triggers" + "Review Gate Settings". One mental
 * model for the operator; one Save action.
 *
 * Deep-link cards still expose the dedicated editor routes (Templates,
 * Automations, Location Links, Recovery Inbox) per the Routing redirects canon.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Send, Star, Settings as SettingsIcon, MessageSquareText } from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ReviewGateAndBoostCard } from './ReviewGateAndBoostCard';

export function ReputationSettingsTab() {
  const { dashPath } = useOrgDashboardPath();

  const editors = [
    {
      label: 'Review Request Templates',
      description: 'Edit the SMS / email body sent after eligible appointments.',
      href: dashPath('/admin/feedback/templates'),
      icon: MessageSquareText,
    },
    {
      label: 'Automation Rules',
      description: 'Cadence, frequency cap, channel, excluded service categories.',
      href: dashPath('/admin/feedback/automations'),
      icon: SettingsIcon,
    },
    {
      label: 'Location Review Links',
      description: 'Per-location Google, Apple, and Facebook URLs.',
      href: dashPath('/admin/feedback/links'),
      icon: Star,
    },
    {
      label: 'Recovery Inbox',
      description: 'Detractor follow-ups, recovery SLA, resolution outcomes.',
      href: dashPath('/admin/feedback/recovery'),
      icon: Send,
    },
  ];

  return (
    <div className="space-y-6">
      <ReviewGateAndBoostCard />

      <div className="grid gap-3 md:grid-cols-2">
        {editors.map((e) => (
          <Card key={e.href} className="hover:bg-muted/30 transition-colors">
            <Link to={e.href} className="block">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <e.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm tracking-wide">{e.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
