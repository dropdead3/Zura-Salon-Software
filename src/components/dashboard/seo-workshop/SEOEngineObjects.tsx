import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, DollarSign } from 'lucide-react';
import { useSEOObjectRevenue } from '@/hooks/useSEOObjectRevenue';

interface Props {
  organizationId: string | undefined;
}

const OBJECT_TYPE_LABELS: Record<string, string> = {
  location: 'Location',
  service: 'Service',
  location_service: 'Location-Service',
  stylist_page: 'Stylist Page',
  website_page: 'Website Page',
  gbp_listing: 'GBP Listing',
  review_stream: 'Review Stream',
  competitor: 'Competitor',
};

export function SEOEngineObjects({ organizationId }: Props) {
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ['seo-objects', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_objects' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('object_type')
        .order('label')
        .limit(100);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });

  const { data: revenueMap = {} } = useSEOObjectRevenue(organizationId);

  // Fetch latest health scores per object (deduplicated)
  const objectIds = objects.map((o: any) => o.id);
  const { data: healthScores = [] } = useQuery({
    queryKey: ['seo-object-health', objectIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_health_scores' as any)
        .select('seo_object_id, domain, score')
        .in('seo_object_id', objectIds)
        .order('scored_at', { ascending: false });

      if (error) throw error;

      // Deduplicate: latest per (object, domain), then average per object
      const seen = new Set<string>();
      const byObject: Record<string, number[]> = {};
      for (const row of (data || []) as any[]) {
        const key = `${row.seo_object_id}::${row.domain}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!byObject[row.seo_object_id]) byObject[row.seo_object_id] = [];
        byObject[row.seo_object_id].push(row.score);
      }

      const result: Record<string, number> = {};
      for (const [objId, scores] of Object.entries(byObject)) {
        result[objId] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
      return result;
    },
    enabled: objectIds.length > 0,
  });

  const healthMap = (healthScores || {}) as Record<string, number>;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Layers className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No SEO objects tracked</h3>
        <p className={tokens.empty.description}>
          SEO objects (locations, services, pages, listings) are registered when the engine scans your organization.
        </p>
      </div>
    );
  }

  // Group by type
  const grouped: Record<string, any[]> = {};
  for (const obj of objects) {
    if (!grouped[obj.object_type]) grouped[obj.object_type] = [];
    grouped[obj.object_type].push(obj);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-sm font-display tracking-wide uppercase text-muted-foreground mb-3">
            {OBJECT_TYPE_LABELS[type] ?? type} ({items.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((obj: any) => {
              const score = healthMap[obj.id];
              const scoreVariant = score !== undefined
                ? score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'
                : null;

              return (
                <Card key={obj.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-sans font-medium">{obj.label}</span>
                      <div className="flex items-center gap-1.5">
                        {score !== undefined && (
                          <Badge variant={scoreVariant as any} className="text-[10px] font-display tracking-wide">
                            {score}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {OBJECT_TYPE_LABELS[obj.object_type] ?? obj.object_type}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-sans truncate">
                      {obj.object_key}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
