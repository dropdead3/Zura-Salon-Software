import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KioskLocationStatusCard } from './KioskLocationStatusCard';
import { KioskLocationSettingsForm } from './KioskLocationSettingsForm';
import { KioskPreviewPanel } from './KioskPreviewPanel';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/useLocations';
import { usePushDefaultsToAllLocations, useLocationKioskOverrides } from '@/hooks/useKioskSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function KioskSettingsContent() {
  const { user } = useAuth();
  const [orgDefaultsOpen, setOrgDefaultsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const { data: businessSettings } = useBusinessSettings();

  const { data: orgId, isLoading: orgLoading } = useQuery({
    queryKey: ['user-org-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      return data?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Defaults — Collapsible */}
      <Collapsible open={orgDefaultsOpen} onOpenChange={setOrgDefaultsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg">ORGANIZATION DEFAULTS</CardTitle>
                  <CardDescription>
                    Baseline settings inherited by all locations without custom configuration
                  </CardDescription>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  orgDefaultsOpen && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {orgId && (
                <KioskLocationSettingsForm
                  locationId={null}
                  orgId={orgId}
                  locationName="Organization Defaults"
                  onPreviewOpen={(settings) => {
                    setPreviewSettings(settings);
                    setPreviewOpen(true);
                  }}
                />
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Locations with Expandable Settings */}
      {orgId && (
        <KioskLocationStatusCard orgId={orgId} />
      )}

      {/* Preview Sheet for org defaults */}
      <PremiumFloatingPanel open={previewOpen} onOpenChange={setPreviewOpen} maxWidth="720px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">
            Kiosk Preview — Organization Defaults
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live preview of default kiosk appearance
          </p>
        </div>
        {previewSettings && (
          <div className="flex-1 overflow-y-auto p-5">
            <KioskPreviewPanel 
              settings={previewSettings} 
              businessSettings={businessSettings}
            />
          </div>
        )}
      </PremiumFloatingPanel>
    </div>
  );
}
