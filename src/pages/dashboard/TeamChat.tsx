import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamChatContainer } from '@/components/team-chat';
import { PlatformPresenceProvider } from '@/contexts/PlatformPresenceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useConnectEntitlement } from '@/hooks/connect/useConnectEntitlement';
import { ConnectSubscriptionGate } from '@/components/connect/ConnectSubscriptionGate';
import { Loader2 } from 'lucide-react';

export default function TeamChat() {
  const { effectiveOrganization, setSelectedOrganization } = useOrganizationContext();
  const { data: organizations } = useOrganizations();
  const { isEntitled, isLoading: entitlementLoading } = useConnectEntitlement();

  // Auto-select first organization if none selected
  useEffect(() => {
    if (!effectiveOrganization && organizations?.length > 0) {
      setSelectedOrganization(organizations[0]);
    }
  }, [effectiveOrganization, organizations, setSelectedOrganization]);

  if (entitlementLoading) {
    return (
      <DashboardLayout hideFooter>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isEntitled) {
    return (
      <DashboardLayout hideFooter>
        <ConnectSubscriptionGate />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideFooter>
      <PlatformPresenceProvider>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TeamChatContainer />
        </div>
      </PlatformPresenceProvider>
    </DashboardLayout>
  );
}
