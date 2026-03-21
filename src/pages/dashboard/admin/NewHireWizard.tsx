import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

// Redirect to Hiring & Payroll Hub with hire tab
export default function NewHireWizard() {
  return <Navigate to="/dashboard/admin/payroll?tab=hire" replace />;
}
