import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSEOCampaigns } from '@/hooks/useSEOCampaigns';
import { CAMPAIGN_STATUS_CONFIG, type SEOCampaignStatus } from '@/config/seo-engine/seo-state-machine';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Rocket, Plus } from 'lucide-react';
import { useState } from 'react';
import { SEOCampaignDetailDialog } from './SEOCampaignDetailDialog';
import { SEOBootstrapDialog } from './SEOBootstrapDialog';

interface Props {
  organizationId: string | undefined;
}

export function SEOEngineCampaigns({ organizationId }: Props) {
  const { data: campaigns = [], isLoading } = useSEOCampaigns(organizationId);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showBootstrap, setShowBootstrap] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setShowBootstrap(true)} className="gap-1.5 font-sans" disabled={!organizationId}>
          <Rocket className="w-3.5 h-3.5" />
          New Location Bootstrap
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className={tokens.empty.container}>
          <Target className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No campaigns yet</h3>
          <p className={tokens.empty.description}>
            Use "New Location Bootstrap" to generate a foundational SEO campaign, or campaigns will be auto-created when the engine detects significant gaps.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign: any) => {
            const statusConf = CAMPAIGN_STATUS_CONFIG[campaign.status as SEOCampaignStatus];
            return (
              <Card key={campaign.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedCampaign(campaign)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={tokens.card.title}>{campaign.title}</CardTitle>
                    <Badge variant={statusConf?.variant as any ?? 'outline'}>
                      {statusConf?.label ?? campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.objective && (
                    <p className="text-sm text-muted-foreground font-sans mb-2">{campaign.objective}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {campaign.window_start && campaign.window_end && (
                      <span>
                        {new Date(campaign.window_start).toLocaleDateString()} – {new Date(campaign.window_end).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <SEOCampaignDetailDialog
        campaign={selectedCampaign}
        organizationId={organizationId ?? ''}
        open={!!selectedCampaign}
        onOpenChange={(open) => { if (!open) setSelectedCampaign(null); }}
      />

      {/* Bootstrap Dialog */}
      {organizationId && (
        <SEOBootstrapDialog
          organizationId={organizationId}
          open={showBootstrap}
          onOpenChange={setShowBootstrap}
        />
      )}
    </div>
  );
}
