import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SEO_QUOTA_LIST } from '@/config/seo-engine/seo-quotas';
import { SEO_TASK_TEMPLATE_LIST } from '@/config/seo-engine/seo-task-templates';
import { HEALTH_DOMAIN_LIST } from '@/config/seo-engine/seo-health-domains';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEOEngineSettings({ organizationId }: Props) {
  return (
    <div className="space-y-6">
      {/* Quotas */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Activity Quotas</CardTitle>
          <CardDescription>Target activity levels that drive recurring task generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SEO_QUOTA_LIST.map((q) => (
              <div key={q.key} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div>
                  <p className="text-sm font-sans font-medium">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{q.defaultTarget}/{q.period === 'weekly' ? 'wk' : 'mo'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Templates */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Task Templates ({SEO_TASK_TEMPLATE_LIST.length})</CardTitle>
          <CardDescription>Deterministic blueprints that generate SEO tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SEO_TASK_TEMPLATE_LIST.map((t) => (
              <div key={t.templateKey} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div>
                  <p className="text-sm font-sans font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Due in {t.defaultDueDays}d · Cooldown {t.cooldownDays}d · {t.systemVerifiable ? 'System-verified' : 'Manual approval'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">{t.taskType}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Domains */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Health Domains ({HEALTH_DOMAIN_LIST.length})</CardTitle>
          <CardDescription>Scoring dimensions that evaluate SEO object health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {HEALTH_DOMAIN_LIST.map((d) => (
              <div key={d.domain} className="py-2 border-b border-border/60 last:border-0">
                <p className="text-sm font-sans font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.description}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {d.applicableObjectTypes.map((ot) => (
                    <Badge key={ot} variant="secondary" className="text-[10px]">{ot}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
