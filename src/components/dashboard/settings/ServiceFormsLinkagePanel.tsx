import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Trash2, Plus, ExternalLink } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useActiveFormTemplates } from '@/hooks/useFormTemplates';
import {
  useRequiredFormsForService,
  useLinkFormToService,
  useUnlinkFormFromService,
  useUpdateFormRequirement,
} from '@/hooks/useServiceFormRequirements';

/**
 * Wave 4: Service ↔ Form linkage panel.
 *
 * Lets operators attach intake/consent/release forms to a service. Linked
 * forms surface to clients at booking confirmation and to staff at check-in.
 * Backed by `service_form_requirements` (FK now points to native `services`).
 */
interface ServiceFormsLinkagePanelProps {
  serviceId: string;
}

export function ServiceFormsLinkagePanel({ serviceId }: ServiceFormsLinkagePanelProps) {
  const { data: templates, isLoading: tplLoading } = useActiveFormTemplates();
  // Fetch ALL requirements for this service (not just is_required=true) so we can
  // show optional ones too.
  const { data: requirements, isLoading: reqLoading } = useQuery({
    queryKey: ['service-form-requirements', 'all', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select(`*, form_template:form_templates(*)`)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!serviceId,
  });

  // Mutation hooks own their own cache invalidation (incl. service-form-counts
  // and required-forms-for-services) — no manual invalidation needed here.
  const linkForm = useLinkFormToService();
  const unlinkForm = useUnlinkFormFromService();
  const updateReq = useUpdateFormRequirement();

  const [pickerValue, setPickerValue] = useState<string>('');

  const linkedTemplateIds = useMemo(
    () => new Set((requirements ?? []).map((r: any) => r.form_template_id)),
    [requirements],
  );

  const availableTemplates = useMemo(
    () => (templates ?? []).filter((t) => !linkedTemplateIds.has(t.id)),
    [templates, linkedTemplateIds],
  );

  const handleAdd = async () => {
    if (!pickerValue) return;
    await linkForm.mutateAsync({
      service_id: serviceId,
      form_template_id: pickerValue,
      is_required: true,
      signing_frequency: 'once',
    });
    setPickerValue('');
  };

  const handleRemove = async (id: string) => {
    await unlinkForm.mutateAsync(id);
  };

  const handleToggleRequired = async (id: string, isRequired: boolean) => {
    await updateReq.mutateAsync({ id, updates: { is_required: isRequired } });
  };

  const handleFrequency = async (id: string, freq: 'once' | 'per_visit' | 'annually') => {
    await updateReq.mutateAsync({ id, updates: { signing_frequency: freq } });
  };

  if (tplLoading || reqLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const noTemplates = (templates ?? []).length === 0;

  return (
    <div className="space-y-5">
      <div>
        <p className={tokens.body.emphasis}>Linked forms</p>
        <p className={tokens.body.muted}>
          Forms required or recommended for this service. Surfaced to clients at booking confirmation and to staff at check-in.
        </p>
      </div>

      {noTemplates ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className={tokens.body.emphasis}>No form templates yet</p>
          <p className={tokens.body.muted}>
            Create form templates in <span className="font-medium">Forms &amp; Consents</span>, then link them here.
          </p>
        </div>
      ) : (
        <>
          {/* Add form picker */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="add-form" className="text-xs">Attach a form template</Label>
              <Select value={pickerValue} onValueChange={setPickerValue}>
                <SelectTrigger id="add-form" disabled={availableTemplates.length === 0}>
                  <SelectValue placeholder={availableTemplates.length === 0 ? 'All templates linked' : 'Pick a template…'} />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      <span className="text-muted-foreground ml-2 text-xs">{t.form_type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!pickerValue || linkForm.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Attach
            </Button>
          </div>

          {/* Linked list */}
          {(requirements ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No forms linked yet. Pick one above to attach.
            </div>
          ) : (
            <div className="space-y-2">
              {(requirements ?? []).map((req: any) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={tokens.body.emphasis + ' truncate'}>
                      {req.form_template?.name ?? 'Unknown form'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {req.form_template?.form_type ?? 'custom'}
                      </Badge>
                      {req.form_template?.version && (
                        <span className="text-xs text-muted-foreground">
                          v{req.form_template.version}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={req.signing_frequency}
                      onValueChange={(v) => handleFrequency(req.id, v as 'once' | 'per_visit' | 'annually')}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="per_visit">Per visit</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={req.is_required}
                        onCheckedChange={(v) => handleToggleRequired(req.id, v)}
                      />
                      <span className="text-xs text-muted-foreground w-16">
                        {req.is_required ? 'Required' : 'Optional'}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemove(req.id)}
                      disabled={unlinkForm.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              Required forms gate booking confirmation. Optional forms are presented but skippable.
              Frequency controls when a fresh signature is needed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
