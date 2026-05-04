/**
 * ReputationSettingsTab — Consolidated settings: master toggle, cadence,
 * channel, message editor, auto-boost triggers, and links-out for the deeper
 * editors (Templates, Automations, Location Links).
 *
 * Keeps the standalone routes alive as deep-link targets per the
 * Routing redirects canon.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Send, Star, Settings as SettingsIcon, MessageSquareText, Zap } from 'lucide-react';
import { useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ReviewThresholdSettings } from './ReviewThresholdSettings';
import { AutoBoostTriggerDialog, useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { tokens } from '@/lib/design-tokens';

export function ReputationSettingsTab() {
  const { dashPath } = useOrgDashboardPath();
  const { data: autoBoost } = useAutoBoostConfig();
  const [autoBoostOpen, setAutoBoostOpen] = useState(false);

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
      {/* Auto-Boost row */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="font-display text-base tracking-wide flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Auto-Boost Triggers
            </CardTitle>
            <CardDescription className="mt-1">
              {autoBoost?.enabled
                ? `Ask after ${autoBoost.promptAfterNReviews} review${autoBoost.promptAfterNReviews === 1 ? '' : 's'} of ≥ ${autoBoost.minStarThreshold} stars`
                : 'Off — happy clients are not routed to public platforms.'}
            </CardDescription>
          </div>
          <Button variant="outline" size={tokens.button.card} onClick={() => setAutoBoostOpen(true)}>
            Configure
          </Button>
        </CardHeader>
      </Card>

      {/* Review gate / threshold settings (existing component) */}
      <ReviewThresholdSettings />

      {/* Deep-link cards for the dedicated editors */}
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

      <AutoBoostTriggerDialog open={autoBoostOpen} onOpenChange={setAutoBoostOpen} />
    </div>
  );
}
