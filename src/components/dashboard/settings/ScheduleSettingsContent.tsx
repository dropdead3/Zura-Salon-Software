import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function ScheduleSettingsContent() {
  const navigate = useNavigate();

  // Auto-redirect after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard/admin/settings?category=services', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <p className="text-lg font-display">These settings have moved</p>
        <p className="text-sm text-muted-foreground">
          Schedule and service settings are now combined in one place for easier management.
        </p>
        <Button onClick={() => navigate('/dashboard/admin/settings?category=services', { replace: true })}>
          Go to Services &amp; Schedule Settings
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground">Redirecting automatically…</p>
      </CardContent>
    </Card>
  );
}
