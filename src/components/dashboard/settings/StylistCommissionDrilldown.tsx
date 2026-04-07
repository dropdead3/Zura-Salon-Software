import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn, formatDisplayName } from '@/lib/utils';
import { getLevelColor } from '@/lib/level-colors';
import { useNavigate } from 'react-router-dom';
import { useAssignStylistLevel } from '@/hooks/useAssignStylistLevel';
import { useUpsertCommissionOverride, useDeleteCommissionOverride } from '@/hooks/useStylistCommissionOverrides';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import type { StylistCommissionOverride } from '@/hooks/useStylistCommissionOverrides';
import { toast } from 'sonner';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface StylistCommissionDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id: string;
    display_name?: string | null;
    full_name?: string | null;
    stylist_level?: string | null;
    stylist_level_since?: string | null;
  } | null;
  orgId: string;
  levels: StylistLevel[];
  override: StylistCommissionOverride | null;
}

export function StylistCommissionDrilldown({
  open,
  onOpenChange,
  member,
  orgId,
  levels,
  override,
}: StylistCommissionDrilldownProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const assignLevel = useAssignStylistLevel();
  const upsertOverride = useUpsertCommissionOverride();
  const deleteOverride = useDeleteCommissionOverride();

  // --- Local buffered state ---
  const [pendingLevel, setPendingLevel] = useState<string>('__unassign');
  const [pendingLevelSince, setPendingLevelSince] = useState('');
  const [svcRate, setSvcRate] = useState('');
  const [retailRate, setRetailRate] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Snapshot initial values
  const initialLevel = member?.stylist_level || '__unassign';
  const initialLevelSince = member?.stylist_level_since ? member.stylist_level_since.split('T')[0] : '';
  const initialShowOverride = !!override;
  const initialSvcRate = override?.service_commission_rate != null ? String(Math.round(override.service_commission_rate * 100)) : '';
  const initialRetailRate = override?.retail_commission_rate != null ? String(Math.round(override.retail_commission_rate * 100)) : '';
  const initialReason = override?.reason || '';
  const initialExpiresAt = override?.expires_at ? override.expires_at.split('T')[0] : '';

  // Reset form when dialog opens or member changes
  useEffect(() => {
    if (!open) {
      setShowUnsavedWarning(false);
      return;
    }
    setPendingLevel(member?.stylist_level || '__unassign');
    setPendingLevelSince(member?.stylist_level_since ? member.stylist_level_since.split('T')[0] : '');
    if (override) {
      setSvcRate(override.service_commission_rate != null ? String(Math.round(override.service_commission_rate * 100)) : '');
      setRetailRate(override.retail_commission_rate != null ? String(Math.round(override.retail_commission_rate * 100)) : '');
      setReason(override.reason);
      setExpiresAt(override.expires_at ? override.expires_at.split('T')[0] : '');
      setShowOverride(true);
    } else {
      setSvcRate('');
      setRetailRate('');
      setReason('');
      setExpiresAt('');
      setShowOverride(false);
    }
    setShowUnsavedWarning(false);
  }, [override, member?.user_id, open]);

  // --- Dirty tracking ---
  const levelChanged = pendingLevel !== initialLevel;
  const levelSinceChanged = pendingLevelSince !== initialLevelSince;
  const overrideToggleChanged = showOverride !== initialShowOverride;
  const overrideFieldsChanged = svcRate !== initialSvcRate || retailRate !== initialRetailRate || reason !== initialReason || expiresAt !== initialExpiresAt;
  const isDirty = levelChanged || levelSinceChanged || overrideToggleChanged || (showOverride && overrideFieldsChanged);

  const slugToLevel = useMemo(() => {
    const map = new Map<string, StylistLevel>();
    levels.forEach(l => map.set(l.slug, l));
    return map;
  }, [levels]);

  if (!member) return null;

  const currentLevel = pendingLevel !== '__unassign' ? slugToLevel.get(pendingLevel) : null;
  const currentLevelIndex = currentLevel ? levels.indexOf(currentLevel) : -1;
  const levelColor = currentLevelIndex >= 0 ? getLevelColor(currentLevelIndex, levels.length) : null;

  // Effective rates based on current local state (preview)
  const previewSvc = showOverride && svcRate ? parseFloat(svcRate) / 100 : currentLevel?.service_commission_rate ?? null;
  const previewRetail = showOverride && retailRate ? parseFloat(retailRate) / 100 : currentLevel?.retail_commission_rate ?? null;
  const effectiveSource = showOverride && (svcRate || retailRate) ? 'Override' : currentLevel ? 'Level Default' : 'None';

  const displayName = formatDisplayName(member.full_name || '', member.display_name);

  // --- Dialog close guard ---
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setShowUnsavedWarning(true);
      return; // block close
    }
    onOpenChange(nextOpen);
  };

  // --- Discard ---
  const handleDiscard = () => {
    setPendingLevel(initialLevel);
    setSvcRate(initialSvcRate);
    setRetailRate(initialRetailRate);
    setReason(initialReason);
    setExpiresAt(initialExpiresAt);
    setShowOverride(initialShowOverride);
    setShowUnsavedWarning(false);
    onOpenChange(false);
  };

  // --- Save all ---
  const handleSaveAll = async () => {
    // Validate override fields if toggled on
    if (showOverride && !reason.trim()) {
      toast.error('Please provide a reason for the override.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Level change
      if (levelChanged) {
        const targetSlug = pendingLevel === '__unassign' ? null : pendingLevel;
        await assignLevel.mutateAsync({ userId: member.user_id, levelSlug: targetSlug });
      }

      // 1b. Level-since date override (update directly if changed)
      if (levelSinceChanged && pendingLevelSince) {
        const { error: sinceError } = await supabase
          .from('employee_profiles')
          .update({ stylist_level_since: new Date(pendingLevelSince).toISOString() } as any)
          .eq('user_id', member.user_id);
        if (sinceError) throw sinceError;
      }

      // 2. Override changes
      if (showOverride && (overrideToggleChanged || overrideFieldsChanged)) {
        await upsertOverride.mutateAsync({
          organization_id: orgId,
          user_id: member.user_id,
          service_commission_rate: svcRate ? parseFloat(svcRate) / 100 : null,
          retail_commission_rate: retailRate ? parseFloat(retailRate) / 100 : null,
          reason: reason.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
      } else if (!showOverride && initialShowOverride && override) {
        // Override was toggled off — delete it
        await deleteOverride.mutateAsync(override.id);
      }

      toast.success('Changes saved');
      setShowUnsavedWarning(false);
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOverride = (checked: boolean) => {
    if (!checked) {
      // Clear form fields when toggling off
      setSvcRate('');
      setRetailRate('');
      setReason('');
      setExpiresAt('');
    }
    setShowOverride(checked);
  };

  const fmtRate = (r: number | null) => (r != null ? `${Math.round(r * 100)}%` : '—');

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className={DRILLDOWN_DIALOG_CONTENT_CLASS}
        overlayClassName={DRILLDOWN_OVERLAY_CLASS}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-medium">{displayName}</DialogTitle>
              {levelColor ? (
                <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium", levelColor.bg, levelColor.text)}>
                  {currentLevel?.client_label} — {currentLevel?.label}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
                  Unassigned
                </span>
              )}
            </div>
            <DialogDescription className="sr-only">Commission details for {displayName}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Section 1: Level */}
          <section className="space-y-2">
            <Label className="text-[11px] font-display uppercase tracking-wider text-muted-foreground font-medium">Level</Label>
            <Select
              value={pendingLevel}
              onValueChange={setPendingLevel}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassign">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {levels.map((level, idx) => {
                  const c = getLevelColor(idx, levels.length);
                  return (
                    <SelectItem key={level.slug} value={level.slug}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", c.bg)} />
                        {level.client_label} — {level.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {currentLevel && (
              <p className="text-xs text-muted-foreground">
                Default rates: Svc {fmtRate(currentLevel.service_commission_rate)} / Retail {fmtRate(currentLevel.retail_commission_rate)}
              </p>
            )}
            {pendingLevel !== '__unassign' && (
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] text-muted-foreground">Level Since</Label>
                <Input
                  type="date"
                  value={pendingLevelSince}
                  onChange={(e) => setPendingLevelSince(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-9 text-sm w-48"
                />
                <p className="text-[10px] text-muted-foreground/70">Backdate if this level was earned before today</p>
              </div>
            )}
          </section>

          {/* Section 2: Override */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-display uppercase tracking-wider text-muted-foreground font-medium">Commission Override</Label>
                <p className="text-[10px] text-muted-foreground/70">Only enable for individual rate exceptions</p>
              </div>
              <Switch
                checked={showOverride}
                onCheckedChange={handleToggleOverride}
              />
            </div>

            {showOverride && (
              <div className="border-l-2 border-amber-500/60 pl-3 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-medium">This overrides the level default rates for this team member only</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Service %</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 45"
                      value={svcRate}
                      onChange={(e) => setSvcRate(e.target.value)}
                      min={0}
                      max={100}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Retail %</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15"
                      value={retailRate}
                      onChange={(e) => setRetailRate(e.target.value)}
                      min={0}
                      max={100}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    placeholder="e.g. Negotiated contract, 90-day probation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[56px] text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Expires (optional)</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Effective Rates Summary */}
          <section className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-display uppercase tracking-wider text-muted-foreground font-medium">Effective Rates</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Service</p>
                <p className="text-lg font-medium tabular-nums">{fmtRate(previewSvc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retail</p>
                <p className="text-lg font-medium tabular-nums">{fmtRate(previewRetail)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Source: <span className="font-medium text-foreground">{effectiveSource}</span>
              {showOverride && reason && <span className="ml-1">— {reason}</span>}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50">
          {isDirty || showUnsavedWarning ? (
            <div className="space-y-2">
              {showUnsavedWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
                  You have unsaved changes
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDiscard}
                  disabled={isSaving}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onOpenChange(false);
                navigate(dashPath('/admin/settings?category=services'));
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Review Services & Pricing
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
