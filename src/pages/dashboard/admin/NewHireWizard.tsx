import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

// Redirect to Hiring & Payroll Hub with hire tab
export default function NewHireWizard() {
  const { dashPath } = useOrgDashboardPath();
  return <Navigate to={dashPath('/admin/payroll?tab=hire'} replace />;
}
