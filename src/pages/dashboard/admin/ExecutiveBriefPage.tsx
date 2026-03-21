import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExecutiveBriefPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard/admin/analytics?tab=leadership', { replace: true });
  }, [navigate]);

  return null;
}
