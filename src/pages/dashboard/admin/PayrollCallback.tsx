import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePayrollConnection, PayrollProvider } from '@/hooks/usePayrollConnection';

export default function PayrollCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback, isHandlingCallback, connection } = usePayrollConnection();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId'); // QuickBooks specific
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Determine provider from state or URL pattern
  const provider: PayrollProvider = realmId ? 'quickbooks' : 'gusto';

  useEffect(() => {
    if (code && state && !isHandlingCallback && !connection) {
      handleCallback({
        provider,
        code,
        state,
        realmId: realmId || undefined,
      });
    }
  }, [code, state, realmId, provider, handleCallback, isHandlingCallback, connection]);

  // Success state
  if (connection?.connection_status === 'connected') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Successfully Connected!</h2>
              <p className="text-muted-foreground mb-6">
                Your payroll provider has been connected. You can now manage payroll for your team.
              </p>
              <Button onClick={() => navigate('/dashboard/admin/payroll')}>
                Go to Payroll
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Connection Failed</h2>
              <p className="text-muted-foreground mb-4">
                {errorDescription || 'An error occurred while connecting your payroll provider.'}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Error: {error}
              </p>
              <Button onClick={() => navigate('/dashboard/admin/payroll')}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-medium mb-2">Connecting...</h2>
            <p className="text-muted-foreground">
              Please wait while we complete the connection to your payroll provider.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
