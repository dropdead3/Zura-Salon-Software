import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientMarketingStatusProps {
  clientId: string;
  organizationId?: string;
}

export function ClientMarketingStatus({ clientId, organizationId }: ClientMarketingStatusProps) {
  const { roles } = useAuth();
  const queryClient = useQueryClient();

  const canToggle = roles.some(role => ['admin', 'super_admin'].includes(role));

  // Fetch marketing preferences
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['client-marketing-prefs', clientId, organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('client_email_preferences')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!organizationId,
  });

  const emailOptOut = prefs?.marketing_opt_out ?? false;
  const smsOptOut = (prefs as any)?.sms_opt_out ?? false;

  const toggleMutation = useMutation({
    mutationFn: async ({ field, value }: { field: 'marketing_opt_out' | 'sms_opt_out'; value: boolean }) => {
      if (!organizationId) throw new Error('No organization context');
      
      // Upsert the preference record
      const updateData: any = { [field]: value };
      if (field === 'marketing_opt_out' && value) {
        updateData.opt_out_at = new Date().toISOString();
      }

      const { data: existing } = await supabase
        .from('client_email_preferences')
        .select('id')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('client_email_preferences')
          .update(updateData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_email_preferences')
          .insert({
            client_id: clientId,
            organization_id: organizationId,
            marketing_opt_out: field === 'marketing_opt_out' ? value : false,
            sms_opt_out: field === 'sms_opt_out' ? value : false,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-marketing-prefs', clientId] });
      const channel = variables.field === 'marketing_opt_out' ? 'Email' : 'SMS';
      const status = variables.value ? 'unsubscribed' : 'subscribed';
      toast.success(`${channel} marketing ${status}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update marketing preference', { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading marketing preferences...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Marketing Preferences</p>
      
      {/* Email Marketing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm">Email</Label>
          <Badge
            variant={emailOptOut ? 'destructive' : 'default'}
            className={emailOptOut 
              ? 'text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' 
              : 'text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            }
          >
            {emailOptOut ? 'Unsubscribed' : 'Subscribed'}
          </Badge>
        </div>
        {canToggle && (
          <Switch
            checked={!emailOptOut}
            onCheckedChange={(checked) => 
              toggleMutation.mutate({ field: 'marketing_opt_out', value: !checked })
            }
            disabled={toggleMutation.isPending || !organizationId}
          />
        )}
      </div>

      {/* SMS Marketing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm">SMS</Label>
          <Badge
            variant={smsOptOut ? 'destructive' : 'default'}
            className={smsOptOut 
              ? 'text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' 
              : 'text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            }
          >
            {smsOptOut ? 'Unsubscribed' : 'Subscribed'}
          </Badge>
        </div>
        {canToggle && (
          <Switch
            checked={!smsOptOut}
            onCheckedChange={(checked) => 
              toggleMutation.mutate({ field: 'sms_opt_out', value: !checked })
            }
            disabled={toggleMutation.isPending || !organizationId}
          />
        )}
      </div>

      {!organizationId && (
        <p className="text-xs text-muted-foreground italic">
          Marketing preferences require an organization context.
        </p>
      )}
    </div>
  );
}
