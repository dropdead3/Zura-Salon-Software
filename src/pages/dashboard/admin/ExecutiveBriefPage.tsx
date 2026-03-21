import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


export default function ExecutiveBriefPage() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(dashPath('/admin/analytics?tab=leadership'), { replace: true });
  }, [navigate]);

  return null;
}
