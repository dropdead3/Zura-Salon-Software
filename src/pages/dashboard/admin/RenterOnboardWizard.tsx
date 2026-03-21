import { Navigate } from 'react-router-dom';

// Redirect to Renter Hub with onboarding tab
export default function RenterOnboardWizard() {
  return <Navigate to="/dashboard/admin/booth-renters?tab=onboarding" replace />;
}
