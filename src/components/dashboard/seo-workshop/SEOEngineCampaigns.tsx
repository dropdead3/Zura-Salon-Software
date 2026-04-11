import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSEOCampaigns } from '@/hooks/useSEOCampaigns';
import { CAMPAIGN_STATUS_CONFIG, type SEOCampaignStatus } from '@/config/seo-engine/seo-state-machine';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEOEngineCampaigns({ organizationId }: Props) {
  const { data: campaigns = [], isLoading } = useSEOCampaigns(organizationId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Target className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No campaigns yet</h3>
        <p className={tokens.empty.description}>
          SEO campaigns group related tasks into time-bound initiatives. They are generated when the engine detects significant gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign: any) => {
        const statusConf = CAMPAIGN_STATUS_CONFIG[campaign.status as SEOCampaignStatus];
        return (
          <Card key={campaign.id}>
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
  );
}
