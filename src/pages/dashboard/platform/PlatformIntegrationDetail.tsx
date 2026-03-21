import { useParams, Navigate } from 'react-router-dom';
import { PandaDocIntegrationPage } from '@/components/platform/settings/integrations/PandaDocIntegrationPage';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PLATFORM_INTEGRATIONS } from '@/config/platformIntegrations';

export default function PlatformIntegrationDetail() {
  const { integrationId } = useParams<{ integrationId: string }>();

  // Check if integration exists
  const integration = PLATFORM_INTEGRATIONS.find(i => i.id === integrationId);
  
  if (!integration) {
    return <Navigate to="/dashboard/platform/settings" replace />;
  }

  // Route to specific integration page
  const renderIntegrationPage = () => {
    switch (integrationId) {
      case 'pandadoc':
        return <PandaDocIntegrationPage />;
      default:
        // Coming soon integrations redirect back
        return <Navigate to="/dashboard/platform/settings" replace />;
    }
  };

  return (
    <PlatformPageContainer>
      {renderIntegrationPage()}
    </PlatformPageContainer>
  );
}
