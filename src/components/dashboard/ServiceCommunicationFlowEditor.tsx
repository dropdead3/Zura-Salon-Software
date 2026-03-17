import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSmsTemplates } from '@/hooks/useSmsTemplates';
import {
  useServiceCommunicationFlows,
  useBatchUpsertFlows,
  usePhorestServiceByName,
  TRIGGER_TYPES,
  type TriggerType,
  type FlowConfig,
} from '@/hooks/useServiceCommunicationFlows';

interface ServiceCommunicationFlowEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
}

interface FlowState {
  isActive: boolean;
  emailTemplateId: string | null;
  smsTemplateId: string | null;
}

const DEFAULT_FLOWS: Record<TriggerType, { email: string | null; sms: string | null }> = {
  booking_confirmed: { email: 'appointment_confirmation', sms: 'appointment_confirmation' },
  reminder_24h: { email: null, sms: 'appointment_reminder' },
  reminder_2h: { email: null, sms: null },
  follow_up_24h: { email: null, sms: null },
  follow_up_7d: { email: null, sms: null },
};

export function ServiceCommunicationFlowEditor({
  open,
  onOpenChange,
  serviceName,
}: ServiceCommunicationFlowEditorProps) {
  const { data: phorestService, isLoading: isLoadingService } = usePhorestServiceByName(serviceName);
  const { data: existingFlows, isLoading: isLoadingFlows } = useServiceCommunicationFlows(phorestService?.id);
  const { data: emailTemplates, isLoading: isLoadingEmailTemplates } = useEmailTemplates();
  const { data: smsTemplates, isLoading: isLoadingSmsTemplates } = useSmsTemplates();
  const batchUpsert = useBatchUpsertFlows();

  const [flows, setFlows] = useState<Record<TriggerType, FlowState>>(() => {
    const initial: Record<TriggerType, FlowState> = {} as Record<TriggerType, FlowState>;
    TRIGGER_TYPES.forEach(t => {
      initial[t.value] = {
        isActive: false,
        emailTemplateId: null,
        smsTemplateId: null,
      };
    });
    return initial;
  });

  // Load existing flows when data arrives
  useEffect(() => {
    if (existingFlows && emailTemplates && smsTemplates) {
      const newFlows: Record<TriggerType, FlowState> = {} as Record<TriggerType, FlowState>;
      
      TRIGGER_TYPES.forEach(t => {
        const existing = existingFlows.find(f => f.trigger_type === t.value);
        if (existing) {
          newFlows[t.value] = {
            isActive: existing.is_active,
            emailTemplateId: existing.email_template_id,
            smsTemplateId: existing.sms_template_id,
          };
        } else {
          // Use defaults
          const defaults = DEFAULT_FLOWS[t.value];
          const defaultEmail = defaults.email ? emailTemplates.find(e => e.template_key === defaults.email)?.id : null;
          const defaultSms = defaults.sms ? smsTemplates.find(s => s.template_key === defaults.sms)?.id : null;
          newFlows[t.value] = {
            isActive: false,
            emailTemplateId: defaultEmail || null,
            smsTemplateId: defaultSms || null,
          };
        }
      });
      
      setFlows(newFlows);
    }
  }, [existingFlows, emailTemplates, smsTemplates]);

  const handleToggleTrigger = (trigger: TriggerType, checked: boolean) => {
    setFlows(prev => ({
      ...prev,
      [trigger]: { ...prev[trigger], isActive: checked },
    }));
  };

  const handleEmailChange = (trigger: TriggerType, templateId: string) => {
    setFlows(prev => ({
      ...prev,
      [trigger]: { ...prev[trigger], emailTemplateId: templateId === 'none' ? null : templateId },
    }));
  };

  const handleSmsChange = (trigger: TriggerType, templateId: string) => {
    setFlows(prev => ({
      ...prev,
      [trigger]: { ...prev[trigger], smsTemplateId: templateId === 'none' ? null : templateId },
    }));
  };

  const handleSave = async () => {
    if (!phorestService?.id) return;

    const flowConfigs: FlowConfig[] = TRIGGER_TYPES.map(t => ({
      trigger_type: t.value,
      email_template_id: flows[t.value].emailTemplateId,
      sms_template_id: flows[t.value].smsTemplateId,
      is_active: flows[t.value].isActive,
    }));

    await batchUpsert.mutateAsync({
      serviceId: phorestService.id,
      flows: flowConfigs,
    });

    onOpenChange(false);
  };

  const isLoading = isLoadingService || isLoadingFlows || isLoadingEmailTemplates || isLoadingSmsTemplates;
  const activeCount = Object.values(flows).filter(f => f.isActive).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Communication Flows
          </DialogTitle>
          <DialogDescription>
            Configure automated email and SMS messages for <span className="font-medium text-foreground">{serviceName}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !phorestService ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Service not found in Phorest. Make sure the service is synced from Phorest before configuring flows.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {TRIGGER_TYPES.map(trigger => (
              <Card
                key={trigger.value}
                className={cn(
                  'p-4 transition-all',
                  flows[trigger.value].isActive ? 'border-primary/50 bg-primary/5' : 'opacity-75'
                )}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    id={trigger.value}
                    checked={flows[trigger.value].isActive}
                    onCheckedChange={(checked) => handleToggleTrigger(trigger.value, checked === true)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={trigger.value} className="text-sm font-medium cursor-pointer">
                        {trigger.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                    </div>

                    <div className={cn(
                      'grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity',
                      !flows[trigger.value].isActive && 'opacity-50 pointer-events-none'
                    )}>
                      {/* Email Template Select */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          Email Template
                        </Label>
                        <Select
                          value={flows[trigger.value].emailTemplateId || 'none'}
                          onValueChange={(val) => handleEmailChange(trigger.value, val)}
                          disabled={!flows[trigger.value].isActive}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No email</span>
                            </SelectItem>
                            {emailTemplates?.filter(t => t.is_active).map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* SMS Template Select */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          SMS Template
                        </Label>
                        <Select
                          value={flows[trigger.value].smsTemplateId || 'none'}
                          onValueChange={(val) => handleSmsChange(trigger.value, val)}
                          disabled={!flows[trigger.value].isActive}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No SMS</span>
                            </SelectItem>
                            {smsTemplates?.filter(t => t.is_active).map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{activeCount} active</Badge>
            <span>trigger{activeCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!phorestService || batchUpsert.isPending}
            >
              {batchUpsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Flows
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
