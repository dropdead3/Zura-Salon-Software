import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';

export function PhorestWriteGateCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { providerLabel } = usePOSProviderLabel();

  const { data: writeEnabled, isLoading } = useQuery({
    queryKey: ['phorest-write-enabled', orgId],
    queryFn: async () => {
      if (!orgId) return false;
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      if (error) return false;
      const settings = (data?.settings || {}) as Record<string, any>;
      return settings.phorest_write_enabled === true;
    },
    enabled: !!orgId,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!orgId) throw new Error('No organization');
      // Fetch current settings first
      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      
      const currentSettings = (orgData?.settings || {}) as Record<string, any>;
      const newSettings = { ...currentSettings, phorest_write_enabled: enabled };

      const { error } = await supabase
        .from('organizations')
        .update({ settings: newSettings })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['phorest-write-enabled'] });
      toast({
        title: enabled ? `${providerLabel} write-back enabled` : `${providerLabel} write-back disabled`,
        description: enabled
          ? `Changes will now sync to ${providerLabel}.`
          : `Changes will only be saved locally. ${providerLabel} will not be updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update setting',
        variant: 'destructive',
      });
    },
  });

  if (!isPrimaryOwner) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <p>Only the primary owner can manage {providerLabel} write-back settings.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-display text-lg tracking-wide">Sync Changes to {providerLabel}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            When enabled, bookings, appointment updates, and new clients will be pushed to your live {providerLabel} system. 
            When disabled, all changes stay local only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={writeEnabled ? 'default' : 'secondary'} className="gap-1.5">
            {writeEnabled ? (
              <><ShieldCheck className="w-3.5 h-3.5" /> Live</>
            ) : (
              <><ShieldOff className="w-3.5 h-3.5" /> Local Only</>
            )}
          </Badge>
          <Switch
            checked={writeEnabled ?? false}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={isLoading || toggleMutation.isPending}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h4 className="font-display text-sm tracking-wide">What This Controls</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><span className="text-foreground">New bookings</span> — when off, appointments are created in the native system only</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><span className="text-foreground">Status changes</span> — check-in, complete, cancel, no-show updates stay local</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><span className="text-foreground">Reschedules</span> — time/date/stylist changes only update the local record</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><span className="text-foreground">New clients</span> — client profiles are created locally without pushing to {providerLabel}</span>
          </li>
        </ul>
      </div>

      {!writeEnabled && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-foreground">{providerLabel} data sync (reading from {providerLabel}) continues to work normally.</p>
            <p className="text-muted-foreground mt-1">
              Only write operations (creating/updating appointments and clients) are blocked.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
