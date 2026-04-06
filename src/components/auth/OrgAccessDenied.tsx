import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface OrgAccessDeniedProps {
  organizationName?: string;
  myDashboardPath?: string;
}

export function OrgAccessDenied({ organizationName, myDashboardPath }: OrgAccessDeniedProps) {
  const navigate = useNavigate();

  const handleGoToMyDashboard = () => {
    navigate(myDashboardPath || '/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="font-display text-xl tracking-wide uppercase">
              Access Denied
            </CardTitle>
            <CardDescription className="text-base font-sans">
              You don't have access to{' '}
              {organizationName ? (
                <span className="font-medium text-foreground">{organizationName}</span>
              ) : (
                'this organization'
              )}
              's dashboard. If you believe this is an error, please contact the organization's administrator.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleGoToMyDashboard} className="w-full font-sans">
              <Home className="w-4 h-4 mr-2" />
              Go to My Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full font-sans"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
