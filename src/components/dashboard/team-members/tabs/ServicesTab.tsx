import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useStaffQualifications, useToggleServiceQualification, useBulkToggleCategoryQualifications, type StaffQualification } from '@/hooks/useStaffServiceConfigurator';
import { useUndoToast } from '@/hooks/useUndoToast';
import { useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

interface Service {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number | null;
  price: number | null;
}

export function ServicesTab({ userId }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const showUndoToast = useUndoToast();

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services-for-team-member', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, duration_minutes, price')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: !!orgId,
  });

  const { data: qualifications, isLoading: qualsLoading } = useStaffQualifications(userId);
  const toggleService = useToggleServiceQualification();
  const bulkToggle = useBulkToggleCategoryQualifications();

  const qualMap = useMemo(() => {
    const map = new Map<string, StaffQualification>();
    qualifications?.forEach(q => map.set(q.service_id, q));
    return map;
  }, [qualifications]);

  const servicesByCategory = useMemo(() => {
    const map: Record<string, Service[]> = {};
    (services || []).forEach(s => {
      const cat = s.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [services]);

  const categories = useMemo(() => Object.keys(servicesByCategory).sort(), [servicesByCategory]);

  const hasAny = (qualifications?.length || 0) > 0;
  const isChecked = (id: string) => {
    if (!hasAny) return true;
    const q = qualMap.get(id);
    if (!q) return true;
    return q.is_active !== false;
  };

  const getCatState = (cat: string): 'all' | 'none' | 'some' => {
    const list = servicesByCategory[cat] || [];
    if (list.length === 0) return 'none';
    const checked = list.filter(s => isChecked(s.id)).length;
    if (checked === list.length) return 'all';
    if (checked === 0) return 'none';
    return 'some';
  };

  if (servicesLoading || qualsLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const handleToggle = (svc: Service, currently: boolean) => {
    const next = !currently;
    toggleService.mutate(
      { userId, serviceId: svc.id, isActive: next },
      {
        onSuccess: () => {
          showUndoToast(
            `${next ? 'Enabled' : 'Disabled'} '${svc.name}'`,
            () => toggleService.mutate({ userId, serviceId: svc.id, isActive: currently }),
          );
        },
      },
    );
  };

  const handleToggleCategory = (cat: string) => {
    const list = servicesByCategory[cat] || [];
    const state = getCatState(cat);
    const newActive = state !== 'all';
    bulkToggle.mutate(
      { userId, serviceIds: list.map(s => s.id), isActive: newActive },
      {
        onSuccess: () => {
          showUndoToast(
            `${newActive ? 'Enabled' : 'Disabled'} all ${cat} services`,
            () => bulkToggle.mutate({ userId, serviceIds: list.map(s => s.id), isActive: !newActive }),
          );
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <CardTitle className="font-display text-base tracking-wide">SERVICES PERFORMED</CardTitle>
        </div>
        <CardDescription>Toggle which services this team member is qualified to perform. By default, all services are available.</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className={tokens.body.muted + ' text-sm'}>No services configured for this organization.</p>
        ) : (
          <Accordion type="multiple" defaultValue={categories}>
            {categories.map(cat => {
              const list = servicesByCategory[cat];
              const state = getCatState(cat);
              const checkedCount = list.filter(s => isChecked(s.id)).length;
              return (
                <AccordionItem key={cat} value={cat} className="border-b-0">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={state === 'all'}
                      {...(state === 'some' ? { 'data-state': 'indeterminate' as any } : {})}
                      onCheckedChange={() => handleToggleCategory(cat)}
                      className="ml-1"
                      disabled={toggleService.isPending || bulkToggle.isPending}
                    />
                    <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm font-medium">{cat}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{checkedCount}/{list.length}</Badge>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent>
                    <div className="space-y-1 pl-7">
                      {list.map(svc => {
                        const checked = isChecked(svc.id);
                        return (
                          <label
                            key={svc.id}
                            className={cn('flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40', !checked && 'opacity-50')}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleToggle(svc, checked)}
                              disabled={toggleService.isPending || bulkToggle.isPending}
                            />
                            <span className="font-sans text-sm flex-1">{svc.name}</span>
                            {svc.price != null && <span className="font-sans text-xs text-muted-foreground">${svc.price}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
