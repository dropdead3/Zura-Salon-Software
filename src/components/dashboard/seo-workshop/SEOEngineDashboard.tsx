import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSEOHealthSummary } from '@/hooks/useSEOHealthScores';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { useSEOCampaigns } from '@/hooks/useSEOCampaigns';
import { useSEOObjectRevenue } from '@/hooks/useSEOObjectRevenue';
import { useSEOMomentum } from '@/hooks/useSEOMomentum';
import { SEO_HEALTH_DOMAINS, type SEOHealthDomain } from '@/config/seo-engine/seo-health-domains';
import { ACTIVE_TASK_STATES } from '@/config/seo-engine/seo-state-machine';
import { MOMENTUM_DIRECTION_CONFIG } from '@/lib/seo-engine/seo-momentum-calculator';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Target, Star, FileText, MapPin, Pencil, Flag, Crosshair, Minus, DollarSign } from 'lucide-react';
import { SEOPredictedLiftCard } from './SEOPredictedLiftCard';
import { SEOGrowthReport } from './SEOGrowthReport';
import { SEOGlobalGrowthDashboard } from './SEOGlobalGrowthDashboard';
import { SEODominationDashboard } from './SEODominationDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  organizationId: string | undefined;
  onGoToTasks?: () => void;
  onGoToCampaigns?: () => void;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  review: Star,
  page: FileText,
  local_presence: MapPin,
  content: Pencil,
  competitive_gap: Flag,
  conversion: Crosshair,
};

export function SEOEngineDashboard({ organizationId, onGoToTasks, onGoToCampaigns }: Props) {
  const { data: healthSummary, isLoading: healthLoading } = useSEOHealthSummary(organizationId);
  const { data: tasks = [], isLoading: tasksLoading } = useSEOTasks(organizationId, {
    status: [...ACTIVE_TASK_STATES, 'overdue', 'escalated'],
  });
  const { data: campaigns = [], isLoading: campaignsLoading } = useSEOCampaigns(organizationId, {
    status: ['active', 'at_risk', 'blocked'],
  });
  const { data: revenueMap = {}, isLoading: revenueLoading } = useSEOObjectRevenue(organizationId);
  const { data: momentumSignals = [], isLoading: momentumLoading } = useSEOMomentum(organizationId);

  const totalAttributedRevenue = Object.values(revenueMap).reduce(
    (sum, r) => sum + (r?.totalRevenue ?? 0), 0
  );

  const overdueTasks = tasks.filter((t: any) => t.status === 'overdue' || t.status === 'escalated');
  const activeTasks = tasks.filter((t: any) => ACTIVE_TASK_STATES.includes(t.status));

  const overallScore = healthSummary?.length
    ? Math.round(healthSummary.reduce((sum, d) => sum + d.averageScore, 0) / healthSummary.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Market Domination */}
      <SEODominationDashboard organizationId={organizationId} />

      {/* Global Growth Orchestration */}
      <SEOGlobalGrowthDashboard organizationId={organizationId} />

      {/* Growth Report */}
      <SEOGrowthReport organizationId={organizationId} />

      {/* Overall Score */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Overall SEO Score</p>
                {healthLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-display tracking-wide">
                    {overallScore !== null ? `${overallScore}` : '—'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Active Tasks</p>
                {tasksLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-display tracking-wide">{activeTasks.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Overdue</p>
                {tasksLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-display tracking-wide">{overdueTasks.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Active Campaigns</p>
                {campaignsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-display tracking-wide">{campaigns.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Revenue Attributed</p>
                {revenueLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-display tracking-wide">
                    {totalAttributedRevenue > 0
                      ? `$${totalAttributedRevenue >= 1000 ? `${(totalAttributedRevenue / 1000).toFixed(1)}k` : totalAttributedRevenue.toFixed(0)}`
                      : '—'}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground font-sans">30d rolling</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Momentum Signals */}
      {!momentumLoading && momentumSignals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={tokens.card.title}>Momentum Signals</CardTitle>
            <CardDescription>Directional movement across your top service-locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {momentumSignals.slice(0, 5).map((m, idx) => {
                const conf = MOMENTUM_DIRECTION_CONFIG[m.direction];
                const MomentumIcon = m.direction === 'gaining' ? TrendingUp : m.direction === 'losing' ? TrendingDown : Minus;
                return (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-sans flex items-center gap-2">
                      <MomentumIcon className={`w-4 h-4 ${conf.color}`} />
                      {m.label}
                    </span>
                    <Badge variant="outline" className={`font-display text-xs tracking-wide ${conf.color}`}>
                      {m.score > 0 ? '+' : ''}{m.score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predicted Revenue Opportunity */}
      <SEOPredictedLiftCard organizationId={organizationId} />

      {/* Health Domains */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={tokens.card.title}>Health by Domain</CardTitle>
          <CardDescription>Scores across 6 SEO health domains (0–100)</CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !healthSummary?.length ? (
            <div className={tokens.empty.container}>
              <p className={tokens.empty.description}>
                No health scores yet. Scores are computed when the SEO engine scans your site.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {healthSummary.map((d) => {
                const def = SEO_HEALTH_DOMAINS[d.domain as SEOHealthDomain];
                return (
                  <div key={d.domain} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-sans flex items-center gap-1.5">
                        {(() => {
                          const IconComp = DOMAIN_ICONS[d.domain];
                          return IconComp ? <IconComp className="w-3.5 h-3.5 text-muted-foreground" /> : null;
                        })()}
                        {def?.label ?? d.domain}
                      </span>
                       <span className="text-sm font-display tracking-wide">{d.averageScore}</span>
                     </div>
                     <Progress
                       value={d.averageScore}
                       className={`h-2 ${d.averageScore < 40 ? '[&>div]:bg-destructive' : d.averageScore < 60 ? '[&>div]:bg-amber-500' : ''}`}
                     />
                    <p className="text-xs text-muted-foreground">
                      {d.objectCount} object{d.objectCount !== 1 ? 's' : ''} scored
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className={tokens.card.title}>
              <AlertTriangle className="w-4 h-4 text-destructive inline mr-2" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="font-sans">{t.ai_generated_content?.title ?? t.template_key}</span>
                  <Badge variant="destructive">{t.status}</Badge>
                </div>
              ))}
              {overdueTasks.length > 5 && (
                <button
                  onClick={onGoToTasks}
                  className="text-xs text-primary hover:underline font-sans"
                >
                  View all {overdueTasks.length} overdue tasks
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
