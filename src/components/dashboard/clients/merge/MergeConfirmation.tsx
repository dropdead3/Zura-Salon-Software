import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, GitMerge, Loader2 } from 'lucide-react';
import { useExecuteMerge, useClientRecordCounts } from '@/hooks/useClientMerge';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { MergeClient } from './MergeWizard';

interface MergeConfirmationProps {
  primaryClient: MergeClient;
  secondaryClients: MergeClient[];
  fieldResolutions: Record<string, any>;
  onComplete: () => void;
}

export function MergeConfirmation({ primaryClient, secondaryClients, fieldResolutions, onComplete }: MergeConfirmationProps) {
  const [confirmText, setConfirmText] = useState('');
  const { formatCurrencyWhole } = useFormatCurrency();
  const executeMerge = useExecuteMerge();
  const allIds = [primaryClient.id, ...secondaryClients.map(c => c.id)];
  const { data: recordCounts } = useClientRecordCounts(allIds);

  const isConfirmed = confirmText.toUpperCase() === 'MERGE';

  const handleMerge = async () => {
    await executeMerge.mutateAsync({
      primaryClientId: primaryClient.id,
      secondaryClientIds: secondaryClients.map(c => c.id),
      fieldResolutions,
    });
    onComplete();
  };

  const totalAppointments = Object.values(recordCounts || {}).reduce(
    (sum, c) => sum + c.appointments, 0
  );

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">This action merges client profiles</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            All records from secondary profiles will be moved to the primary client. 
            You can undo this merge within 7 days.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-4">
        {/* Primary */}
        <div className="p-4 rounded-lg border bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="gap-1 bg-primary/10 text-primary border-0">
              <Crown className="w-3 h-3" /> Primary (Survives)
            </Badge>
          </div>
          <p className="font-medium">{primaryClient.first_name} {primaryClient.last_name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {primaryClient.email} · {primaryClient.mobile || primaryClient.phone} · {formatCurrencyWhole(Number(primaryClient.total_spend || 0))} total spend
          </p>
        </div>

        {/* Secondary */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Will be merged into primary:</p>
          {secondaryClients.map(client => (
            <div key={client.id} className="p-3 rounded-lg border">
              <p className="font-medium text-sm">{client.first_name} {client.last_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {client.email} · {formatCurrencyWhole(Number(client.total_spend || 0))} spend · {client.visit_count || 0} visits
              </p>
              {recordCounts?.[client.id] && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {recordCounts[client.id].appointments} appointments will be re-parented
                </p>
              )}
            </div>
          ))}
        </div>

        {/* What will move */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <p className="text-sm font-medium mb-2">What will be moved</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Total appointments: {totalAppointments}</span>
            <span>Field resolutions: {Object.keys(fieldResolutions).length}</span>
          </div>
        </div>
      </div>

      {/* Typed confirmation */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Type <code className="px-1.5 py-0.5 bg-muted rounded text-xs">MERGE</code> to confirm
        </p>
        <Input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="Type MERGE to confirm"
          className="max-w-[240px]"
        />
      </div>

      {/* Execute */}
      <Button
        onClick={handleMerge}
        disabled={!isConfirmed || executeMerge.isPending}
        className="gap-2 w-full sm:w-auto"
        variant="destructive"
      >
        {executeMerge.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GitMerge className="w-4 h-4" />
        )}
        {executeMerge.isPending ? 'Merging...' : 'Execute Merge'}
      </Button>
    </div>
  );
}
