import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { NetworkDashboard } from '@/components/dashboard/capital-engine/NetworkDashboard';

export default function Network() {
  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Network"
        description="Ownership intelligence, deal pipeline, and capital allocation across the network"
      />
      <NetworkDashboard />
    </PlatformPageContainer>
  );
}
