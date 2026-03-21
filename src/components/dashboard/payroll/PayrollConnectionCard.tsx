import { useState } from 'react';
import { DollarSign, Calculator, RefreshCw, Unlink, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { usePayrollConnection } from '@/hooks/usePayrollConnection';
import { usePayroll } from '@/hooks/usePayroll';
import { formatDistanceToNow } from 'date-fns';

const providerConfig: Record<string, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentColor: string;
}> = {
  gusto: {
    name: 'Gusto',
    icon: DollarSign,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    accentColor: 'bg-orange-500',
  },
  quickbooks: {
    name: 'QuickBooks Payroll',
    icon: Calculator,
    color: 'text-green-500 bg-green-500/10 border-green-500/20',
    accentColor: 'bg-green-500',
  },
  adp: {
    name: 'ADP',
    icon: RefreshCw,
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
    accentColor: 'bg-red-500',
  },
  paychex: {
    name: 'Paychex',
    icon: CheckCircle,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    accentColor: 'bg-blue-500',
  },
  square: {
    name: 'Square Payroll',
    icon: DollarSign,
    color: 'text-slate-700 bg-slate-500/10 border-slate-500/20',
    accentColor: 'bg-slate-700',
  },
  onpay: {
    name: 'OnPay',
    icon: DollarSign,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    accentColor: 'bg-teal-500',
  },
  homebase: {
    name: 'Homebase',
    icon: Clock,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    accentColor: 'bg-purple-500',
  },
  rippling: {
    name: 'Rippling',
    icon: RefreshCw,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    accentColor: 'bg-indigo-500',
  },
  wave: {
    name: 'Wave Payroll',
    icon: DollarSign,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    accentColor: 'bg-sky-500',
  },
};

const statusConfig = {
  connected: {
    label: 'Connected',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  disconnected: {
    label: 'Disconnected',
    icon: AlertCircle,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
};

export function PayrollConnectionCard() {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  
  const { 
    connection, 
    disconnect, 
    isDisconnecting,
  } = usePayrollConnection();
  
  const { syncPayrolls, isSyncing } = usePayroll();

  if (!connection) return null;

  const provider = providerConfig[connection.provider];
  const status = statusConfig[connection.connection_status];
  const Icon = provider.icon;
  const StatusIcon = status.icon;

  const lastSynced = connection.last_synced_at 
    ? formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })
    : 'Never';

  const connectedAt = connection.connected_at
    ? formatDistanceToNow(new Date(connection.connected_at), { addSuffix: true })
    : null;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={cn('p-2 rounded-lg border', provider.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span>{provider.name}</span>
              <p className="text-xs font-normal text-muted-foreground">
                Payroll Provider
              </p>
            </div>
          </CardTitle>
          <Badge className={cn('border', status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Company ID</p>
            <p className="font-mono text-xs truncate">
              {connection.external_company_id || 'Not linked'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Connected</p>
            <p>{connectedAt || 'N/A'}</p>
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last synced:</span>
            <span className="font-medium">{lastSynced}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => syncPayrolls({})}
            disabled={isSyncing || connection.connection_status !== 'connected'}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Unlink className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {provider.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will disconnect your {provider.name} account. Your existing payroll 
                  history will be preserved, but you won't be able to run new payrolls until 
                  you reconnect.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    disconnect();
                    setShowDisconnectDialog(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
