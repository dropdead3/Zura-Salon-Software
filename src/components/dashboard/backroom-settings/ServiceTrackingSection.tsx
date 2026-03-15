import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useServiceTrackingComponents, useUpsertTrackingComponent, useDeleteTrackingComponent } from '@/hooks/backroom/useServiceTrackingComponents';
import { useServiceAllowancePolicies } from '@/hooks/billing/useServiceAllowancePolicies';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Wrench, Plus, Trash2, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  is_backroom_tracked: boolean;
  assistant_prep_allowed: boolean;
  smart_mix_assist_enabled: boolean;
  formula_memory_enabled: boolean;
  variance_threshold_pct: number;
}

interface Props {
  onNavigate?: (section: string) => void;
}

export function ServiceTrackingSection({ onNavigate }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [showSuggested, setShowSuggested] = useState(false);

  const { data: services, isLoading } = useQuery({
    queryKey: ['backroom-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, is_backroom_tracked, assistant_prep_allowed, smart_mix_assist_enabled, formula_memory_enabled, variance_threshold_pct')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as unknown as ServiceRow[];
    },
    enabled: !!orgId,
  });

  const toggleTracking = useMutation({
    mutationFn: async ({ id, tracked }: { id: string; tracked: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_backroom_tracked: tracked })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkTrackMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('services')
        .update({ is_backroom_tracked: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      setShowSuggested(false);
      toast.success('Color/chemical services tracked', {
        action: onNavigate ? {
          label: 'Next: Recipe Baselines →',
          onClick: () => onNavigate('recipes'),
        } : undefined,
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRow> }) => {
      const { error } = await supabase
        .from('services')
        .update(updates as Record<string, unknown>)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const tracked = (services || []).filter((s) => s.is_backroom_tracked);
  const untracked = (services || []).filter((s) => !s.is_backroom_tracked);
  const suggestedServices = untracked.filter((s) => isColorOrChemicalService(s.name, s.category));

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-services-guide"
        title="Service Tracking"
        description="Link your services (e.g. Balayage, Root Touch-Up) to the products they consume. This tells Zura which products to expect when a stylist mixes for that service. Requires products to be tracked first."
        icon={<Wrench className="h-4 w-4 text-primary" />}
      />

      {/* Auto-detect CTA */}
      {suggestedServices.length > 0 && !showSuggested && (
        <Card className={cn(tokens.card.wrapper, 'border-primary/30 bg-primary/5')}>
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={tokens.body.emphasis}>Auto-detected {suggestedServices.length} color/chemical services</p>
              <p className={tokens.body.muted}>Zura identified services that likely need backroom tracking based on their names.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="font-sans" onClick={() => setShowSuggested(true)}>
                Review
              </Button>
              <Button size="sm" className="font-sans" onClick={() => bulkTrackMutation.mutate(suggestedServices.map(s => s.id))}>
                Track All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested services detail */}
      {showSuggested && suggestedServices.length > 0 && (
        <Card className={tokens.card.wrapper}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={tokens.card.title}>Suggested Services</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="font-sans" onClick={() => setShowSuggested(false)}>Dismiss</Button>
                <Button size="sm" className="font-sans" onClick={() => bulkTrackMutation.mutate(suggestedServices.map(s => s.id))}>
                  Track All {suggestedServices.length}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {suggestedServices.map((service) => (
              <div key={service.id} className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Switch
                  checked={false}
                  onCheckedChange={() => toggleTracking.mutate({ id: service.id, tracked: true })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans font-medium truncate">{service.name}</p>
                  {service.category && <span className="text-xs text-muted-foreground">{service.category}</span>}
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Suggested</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tracked services */}
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Wrench className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Tracked Services</CardTitle>
              <CardDescription className={tokens.body.muted}>
                Services with backroom tracking enabled. Configure components and workflow options.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tracked.length === 0 ? (
            <div className={tokens.empty.container}>
              <Wrench className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No services tracked</h3>
              <p className={tokens.empty.description}>Enable tracking on your color and chemical services below. Make sure you've tracked products first in Products & Supplies.</p>
            </div>
          ) : (
            tracked.map((service) => (
              <div key={service.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <Switch
                  checked
                  onCheckedChange={() => toggleTracking.mutate({ id: service.id, tracked: false })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans font-medium truncate">{service.name}</p>
                  {service.category && <span className="text-xs text-muted-foreground">{service.category}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-muted-foreground whitespace-nowrap">Asst. Prep</label>
                    <MetricInfoTooltip description="Allows assistants to pre-mix bowls for this service before the stylist arrives." />
                    <Switch
                      checked={service.assistant_prep_allowed}
                      onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { assistant_prep_allowed: v } })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-muted-foreground whitespace-nowrap">Mix Assist</label>
                    <MetricInfoTooltip description="Enables AI-powered formula suggestions when mixing for this service." />
                    <Switch
                      checked={service.smart_mix_assist_enabled}
                      onCheckedChange={(v) => updateService.mutate({ id: service.id, updates: { smart_mix_assist_enabled: v } })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MetricInfoTooltip description="Map which tracked products are consumed during this service." />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedServiceId(service.id)}
                      className="text-xs font-sans"
                    >
                      Components
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Next step hint */}
          {onNavigate && tracked.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground" onClick={() => onNavigate('recipes')}>
                Next: Recipe Baselines <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Untracked services */}
      {untracked.length > 0 && (
        <Card className={tokens.card.wrapper}>
          <CardHeader>
            <CardTitle className={tokens.card.title}>Available Services</CardTitle>
            <CardDescription className={tokens.body.muted}>
              Enable backroom tracking for these services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {untracked.map((service) => (
              <div key={service.id} className="flex items-center gap-4 rounded-lg border border-border/40 p-3 bg-muted/20">
                <Switch
                  checked={false}
                  onCheckedChange={() => toggleTracking.mutate({ id: service.id, tracked: true })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans text-muted-foreground truncate">{service.name}</p>
                  {service.category && <span className="text-xs text-muted-foreground">{service.category}</span>}
                </div>
                {isColorOrChemicalService(service.name, service.category) && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Suggested</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Component mapping dialog */}
      {selectedServiceId && (
        <ComponentMappingDialog
          serviceId={selectedServiceId}
          serviceName={services?.find((s) => s.id === selectedServiceId)?.name || ''}
          orgId={orgId!}
          onClose={() => setSelectedServiceId(null)}
        />
      )}
    </div>
  );
}

function ComponentMappingDialog({ serviceId, serviceName, orgId, onClose }: {
  serviceId: string;
  serviceName: string;
  orgId: string;
  onClose: () => void;
}) {
  const { data: components, isLoading } = useServiceTrackingComponents(serviceId);
  const upsertComponent = useUpsertTrackingComponent();
  const deleteComponent = useDeleteTrackingComponent();
  const [addingProduct, setAddingProduct] = useState(false);

  // Fetch available backroom products
  const { data: backroomProducts } = useQuery({
    queryKey: ['backroom-products-for-mapping', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; category: string | null }[];
    },
    enabled: !!orgId,
  });

  const mappedIds = new Set((components || []).map((c) => c.product_id));
  const availableProducts = (backroomProducts || []).filter((p) => !mappedIds.has(p.id));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>{serviceName} — Components</DialogTitle>
          <DialogDescription className={tokens.body.muted}>
            Map tracked products that are consumed during this service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <>
              {(components || []).map((comp) => (
                <div key={comp.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans font-medium truncate">
                      {backroomProducts?.find((p) => p.id === comp.product_id)?.name || comp.product_id}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{comp.component_role}</Badge>
                      {comp.estimated_quantity && (
                        <span className="text-[10px] text-muted-foreground">{comp.estimated_quantity}{comp.unit}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MetricInfoTooltip description="Required = always used. Optional = sometimes used. Conditional = depends on technique." />
                    <Select
                      value={comp.component_role}
                      onValueChange={(v) => upsertComponent.mutate({
                        organization_id: orgId,
                        service_id: serviceId,
                        product_id: comp.product_id,
                        component_role: v,
                      })}
                    >
                      <SelectTrigger className="w-[100px] h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['required', 'optional', 'conditional', 'estimated', 'manual'].map((r) => (
                          <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteComponent.mutate(comp.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              {/* Add product */}
              {addingProduct ? (
                <Select
                  onValueChange={(productId) => {
                    upsertComponent.mutate({
                      organization_id: orgId,
                      service_id: serviceId,
                      product_id: productId,
                    });
                    setAddingProduct(false);
                  }}
                >
                  <SelectTrigger className="w-full font-sans text-sm">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingProduct(true)}
                  className="w-full font-sans"
                  disabled={availableProducts.length === 0}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {availableProducts.length === 0 ? 'No available products' : 'Add Component'}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
