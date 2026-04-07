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
import { Loader2, Trash2, ExternalLink, Info, AlertTriangle } from 'lucide-react';
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

  // Override form state
  const [svcRate, setSvcRate] = useState('');
  const [retailRate, setRetailRate] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  // Reset form when member changes
  useEffect(() => {
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
  }, [override, member?.user_id, open]);

  const handleToggleOverride = useCallback((checked: boolean) => {
    if (!checked && override) {
      // Existing override — remove it
      deleteOverride.mutate(override.id, {
        onSuccess: () => {
          setSvcRate('');
          setRetailRate('');
          setReason('');
          setExpiresAt('');
          setShowOverride(false);
          toast.success('Override removed');
        },
      });
    } else if (!checked) {
      // No saved override, just clear form
      setSvcRate('');
      setRetailRate('');
      setReason('');
      setExpiresAt('');
      setShowOverride(false);
    } else {
      setShowOverride(true);
    }
  }, [override, deleteOverride]);

  const slugToLevel = useMemo(() => {
    const map = new Map<string, StylistLevel>();
    levels.forEach(l => map.set(l.slug, l));
    return map;
  }, [levels]);

  if (!member) return null;

  const currentLevel = member.stylist_level ? slugToLevel.get(member.stylist_level) : null;
  const currentLevelIndex = currentLevel ? levels.indexOf(currentLevel) : -1;
  const levelColor = currentLevelIndex >= 0 ? getLevelColor(currentLevelIndex, levels.length) : null;

  // Effective rates resolution
  const effectiveSvc = override?.service_commission_rate ?? currentLevel?.service_commission_rate ?? null;
  const effectiveRetail = override?.retail_commission_rate ?? currentLevel?.retail_commission_rate ?? null;
  const effectiveSource = override ? 'Override' : currentLevel ? 'Level Default' : 'None';

  const displayName = formatDisplayName(member.full_name || '', member.display_name);

  const handleLevelChange = (slug: string) => {
    const targetSlug = slug === '__unassign' ? null : slug;
    assignLevel.mutate({ userId: member.user_id, levelSlug: targetSlug }, {
      onSuccess: () => {
        const lvl = targetSlug ? slugToLevel.get(targetSlug) : null;
        toast.success(`${displayName} → ${lvl?.label || 'Unassigned'}`);
      },
    });
  };

  const handleSaveOverride = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the override.');
      return;
    }
    upsertOverride.mutate({
      organization_id: orgId,
      user_id: member.user_id,
      service_commission_rate: svcRate ? parseFloat(svcRate) / 100 : null,
      retail_commission_rate: retailRate ? parseFloat(retailRate) / 100 : null,
      reason: reason.trim(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    }, {
      onSuccess: () => toast.success('Override saved'),
    });
  };

  const handleRemoveOverride = () => {
    if (!override) return;
    deleteOverride.mutate(override.id, {
      onSuccess: () => {
        setSvcRate('');
        setRetailRate('');
        setReason('');
        setExpiresAt('');
        toast.success('Override removed');
      },
    });
  };

  const fmtRate = (r: number | null) => (r != null ? `${Math.round(r * 100)}%` : '—');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={member.stylist_level && slugToLevel.has(member.stylist_level) ? member.stylist_level : '__unassign'}
              onValueChange={handleLevelChange}
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
          </section>

          {/* Section 2: Override */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-display uppercase tracking-wider text-muted-foreground font-medium">Commission Override</Label>
              {override && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRemoveOverride}
                  disabled={deleteOverride.isPending}
                >
                  {deleteOverride.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Remove
                </Button>
              )}
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

            <Button
              size="sm"
              className="w-full"
              onClick={handleSaveOverride}
              disabled={(!svcRate && !retailRate) || !reason.trim() || upsertOverride.isPending}
            >
              {upsertOverride.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
              {override ? 'Update Override' : 'Save Override'}
            </Button>
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
                <p className="text-lg font-medium tabular-nums">{fmtRate(effectiveSvc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retail</p>
                <p className="text-lg font-medium tabular-nums">{fmtRate(effectiveRetail)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Source: <span className="font-medium text-foreground">{effectiveSource}</span>
              {override && <span className="ml-1">— {override.reason}</span>}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
