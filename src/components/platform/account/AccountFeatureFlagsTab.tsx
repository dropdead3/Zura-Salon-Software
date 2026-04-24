import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { 
  Flag, 
  Zap, 
  RotateCcw,
  Plus,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import {
  AlertDialog,
  AlertDialogAction,
  PlatformAlertDialogCancel as AlertDialogCancel,
  PlatformAlertDialogContent as AlertDialogContent,
  PlatformAlertDialogDescription as AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  PlatformAlertDialogTitle as AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/platform/ui/PlatformDialog';
import { toast } from 'sonner';
import { 
  useOrganizationFeatureFlags, 
  useUpdateOrgFeatureFlag,
  useDeleteOrgFeatureFlag,
  useResetAllOrgFlags,
  type MergedFeatureFlag 
} from '@/hooks/useOrganizationFeatureFlags';
import { cn } from '@/lib/utils';

interface AccountFeatureFlagsTabProps {
  organizationId: string;
  organizationName: string;
}

export function AccountFeatureFlagsTab({ organizationId, organizationName }: AccountFeatureFlagsTabProps) {
  const { data: flags, isLoading } = useOrganizationFeatureFlags(organizationId);
  const updateFlag = useUpdateOrgFeatureFlag();
  const deleteFlag = useDeleteOrgFeatureFlag();
  const resetAll = useResetAllOrgFlags();
  const [overrideDialog, setOverrideDialog] = useState<{ flag: MergedFeatureFlag; enabled: boolean } | null>(null);
  const [reason, setReason] = useState('');

  const handleToggle = async (flag: MergedFeatureFlag, newValue: boolean) => {
    // If toggling away from global default, show reason dialog
    if (newValue !== flag.global_enabled) {
      setOverrideDialog({ flag, enabled: newValue });
      setReason('');
    } else {
      // Removing override - just delete it
      if (flag.has_override) {
        try {
          await deleteFlag.mutateAsync({
            organizationId,
            flagKey: flag.flag_key,
          });
          toast.success('Override removed');
        } catch (error) {
          toast.error('Failed to remove override');
        }
      }
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideDialog) return;

    try {
      await updateFlag.mutateAsync({
        organizationId,
        flagKey: overrideDialog.flag.flag_key,
        isEnabled: overrideDialog.enabled,
        reason: reason || undefined,
      });
      toast.success('Feature flag override saved');
      setOverrideDialog(null);
      setReason('');
    } catch (error) {
      toast.error('Failed to save override');
    }
  };

  const handleResetAll = async () => {
    try {
      await resetAll.mutateAsync(organizationId);
      toast.success('All overrides reset to global defaults');
    } catch (error) {
      toast.error('Failed to reset overrides');
    }
  };

  const overrideCount = flags?.filter(f => f.has_override).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Flag className="h-5 w-5 text-violet-400" />
            Feature Flags
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Customize feature availability for {organizationName}
          </p>
        </div>

        {overrideCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <PlatformButton variant="outline" size={tokens.button.card}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset All ({overrideCount})
              </PlatformButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Overrides?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all {overrideCount} custom overrides and revert to global defaults.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAll} className="bg-rose-600 hover:bg-rose-700">
                  Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span className="flex items-center gap-1">
          <Check className="h-4 w-4 text-emerald-400" /> Enabled
        </span>
        <span className="flex items-center gap-1">
          <X className="h-4 w-4 text-slate-500" /> Disabled
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-amber-400" /> Override active
        </span>
      </div>

      {/* Flags Table */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/60">
          <div className="col-span-5 text-sm font-medium text-slate-400">Flag</div>
          <div className="col-span-2 text-sm font-medium text-slate-400 text-center">Global</div>
          <div className="col-span-2 text-sm font-medium text-slate-400 text-center">This Org</div>
          <div className="col-span-3 text-sm font-medium text-slate-400">Override</div>
        </div>

        {(!flags || flags.length === 0) ? (
          <div className="px-4 py-8 text-center text-slate-500">
            No feature flags configured
          </div>
        ) : (
          flags.map(flag => (
            <div 
              key={flag.flag_key} 
              className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-slate-700/30 last:border-0 items-center"
            >
              <div className="col-span-5">
                <span className="font-mono text-sm text-white">{flag.flag_key}</span>
              </div>
              <div className="col-span-2 flex justify-center">
                {flag.global_enabled ? (
                  <Check className="h-5 w-5 text-emerald-400" />
                ) : (
                  <X className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div className="col-span-2 flex justify-center items-center gap-2">
                <Switch
                  checked={flag.org_enabled}
                  onCheckedChange={(v) => handleToggle(flag, v)}
                  disabled={updateFlag.isPending || deleteFlag.isPending}
                />
                {flag.has_override && (
                  <Zap className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="col-span-3">
                {flag.has_override ? (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                    {flag.override_reason || 'Custom override'}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-500">—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Override Dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={(open) => !open && setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature Override</DialogTitle>
            <DialogDescription>
              You're changing <code className="text-violet-400">{overrideDialog?.flag.flag_key}</code> from 
              the global default ({overrideDialog?.flag.global_enabled ? 'enabled' : 'disabled'}) to 
              {overrideDialog?.enabled ? ' enabled' : ' disabled'} for this organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Reason (optional)</label>
              <PlatformTextarea
                placeholder="Why is this organization different?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <PlatformButton variant="outline" onClick={() => setOverrideDialog(null)}>
              Cancel
            </PlatformButton>
            <PlatformButton onClick={handleConfirmOverride} disabled={updateFlag.isPending}>
              {updateFlag.isPending ? 'Saving...' : 'Save Override'}
            </PlatformButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
