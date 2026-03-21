import { Navigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

// Redirect to Renter Hub with onboarding tab
export default function RenterOnboardWizard() {
  const { dashPath } = useOrgDashboardPath();
  return <Navigate to={dashPath('/admin/booth-renters?tab=onboarding'} replace />;
}
