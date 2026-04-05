import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { Loader2 } from 'lucide-react';

/**
 * Settings embed for Stylist Levels.
 * Redirects to the consolidated standalone editor at /admin/stylist-levels
 * which includes commission rates, criteria configuration, and team roster.
 */
export function StylistLevelsContent() {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();

  useEffect(() => {
    navigate(dashPath('/admin/stylist-levels'), { replace: true });
  }, [navigate, dashPath]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
