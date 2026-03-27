/**
 * DockServicesTab — Per-service bowl configurator.
 * Groups bowls by individual color/chemical service on the appointment.
 * Each service section has its own bowl grid and "Add Bowl" card.
 * Non-mixing services (haircuts, styling) are excluded.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, FlaskConical, Loader2, Circle, CheckCircle2, AlertCircle, Check, MoreVertical, Scale, History, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import { DockBowlActionSheet, type BowlAction } from '../mixing/DockBowlActionSheet';
import { DockRenameBowlDialog } from '../mixing/DockRenameBowlDialog';
import { cn } from '@/lib/utils';
import { DOCK_CARD } from '@/components/dock/dock-ui-tokens';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { useDockMixSessions, type DockMixSession } from '@/hooks/dock/useDockMixSessions';
import { normalizeSessionStatus, isTerminalSessionStatus, isActiveSession, requiresReweigh } from '@/lib/color-bar/session-state-machine';
import { DockNewBowlSheet } from '../mixing/DockNewBowlSheet';
import { DockLiveDispensing, type BowlLine } from '../mixing/DockLiveDispensing';
import { DockSessionCompleteSheet, type PendingChargeSummary } from '../mixing/DockSessionCompleteSheet';
import { DockBowlDetectionGate } from '../mixing/DockBowlDetectionGate';
import { useCreateDockBowl, type CreatedBowlResult } from '@/hooks/dock/useDockMixSession';
import { useCompleteDockSession, useMarkDockSessionUnresolved } from '@/hooks/dock/useDockSessionComplete';
import type { FormulaLine } from '../mixing/DockFormulaBuilder';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useDockSessionStats } from '@/hooks/dock/useDockSessionStats';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DockClientAlertsBanner } from './DockClientAlertsBanner';
import { DockFormulaHistorySheet } from './DockFormulaHistorySheet';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
import { useServiceLookup, type ContainerType } from '@/hooks/useServiceLookup';
import { useDepleteMixSession } from '@/hooks/color-bar/useDepleteMixSession';
import { useCalculateOverageCharge } from '@/hooks/billing/useCalculateOverageCharge';
import { useCheckoutUsageCharges } from '@/hooks/billing/useCheckoutUsageCharges';
import { useBackroomBillingSettings } from '@/hooks/billing/useColorBarBillingSettings';

interface DockServicesTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
  effectiveServiceName?: string | null;
}

type BowlStatusInfo = {
  icon: typeof FlaskConical;
  label: string;
  color: string;
  iconBg: string;
};

function getStatusDisplay(status: string): BowlStatusInfo {
  const normalized = normalizeSessionStatus(status as any);
  if (normalized === 'completed') return { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-400', iconBg: 'bg-emerald-500/15 border-emerald-500/20' };
  if (isActiveSession(normalized)) return { icon: FlaskConical, label: 'In Progress', color: 'text-amber-400', iconBg: 'bg-amber-500/15 border-amber-500/20' };
  if (requiresReweigh(normalized)) return { icon: Scale, label: 'Needs Reweigh', color: 'text-rose-400', iconBg: 'bg-rose-500/15 border-rose-500/20' };
  if (normalized === 'cancelled') return { icon: Circle, label: 'Cancelled', color: 'text-[hsl(var(--platform-foreground-muted)/0.4)]', iconBg: 'bg-muted/20 border-border/20' };
  if (normalized === 'unresolved_exception') return { icon: AlertCircle, label: 'Exception', color: 'text-red-400', iconBg: 'bg-red-500/15 border-red-500/20' };
  if (normalized === 'awaiting_stylist_approval') return { icon: AlertCircle, label: 'Approval', color: 'text-amber-400', iconBg: 'bg-amber-500/15 border-amber-500/20' };
  return { icon: Circle, label: 'Draft', color: 'text-blue-400', iconBg: 'bg-blue-500/15 border-blue-500/20' };
}

/** Convert builder FormulaLine[] to dispensing BowlLine[] */
function formulaLinesToBowlLines(lines: FormulaLine[]): BowlLine[] {
  return lines.map((l, i) => ({
    id: `demo-line-${i}`,
    product_id: l.product.id,
    product_name_snapshot: l.product.name,
    brand_snapshot: l.product.brand ?? null,
    dispensed_quantity: l.targetWeight * (l.ratio || 1),
    dispensed_unit: 'g',
    dispensed_cost_snapshot: l.product.wholesale_price ?? 0,
    swatch_color: l.product.swatch_color ?? null,
  }));
}

interface ActiveBowl {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
  status: string;
  demoLines?: BowlLine[];
}

/** Local demo bowl with ingredient info */
interface DemoBowl {
  id: string;
  bowlNumber: number;
  status: string;
  lines: FormulaLine[];
  totalWeight: number;
  totalCost: number;
  createdAt: string;
  serviceLabel: string | null;
  containerType: ContainerType;
}

/** Parse service_name into individual service tokens */
function parseServices(serviceName: string | null | undefined): string[] {
  if (!serviceName) return [];
  // Try ` + ` first (Phorest multi-service), then `, `
  const delim = serviceName.includes(' + ') ? ' + ' : ', ';
  return serviceName.split(delim).map(s => s.trim()).filter(Boolean);
}

/** Get only color/chemical services from an appointment */
function getChemicalServices(serviceName: string | null | undefined): string[] {
  return parseServices(serviceName).filter(s => isColorOrChemicalService(s));
}

export function DockServicesTab({ appointment, staff, effectiveServiceName }: DockServicesTabProps) {
  const { isDemoMode } = useDockDemo();
  const { data: sessions, isLoading } = useDockMixSessions(appointment.id);
  const { data: serviceLookup } = useServiceLookup();
  const [showNewBowl, setShowNewBowl] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showBowlDetection, setShowBowlDetection] = useState(false);
  const [activeBowl, setActiveBowl] = useState<ActiveBowl | null>(null);
  const [activeServiceLabel, setActiveServiceLabel] = useState<string | null>(null);
  const [activeContainerType, setActiveContainerType] = useState<ContainerType>('bowl');
  const createBowl = useCreateDockBowl();
  const completeSession = useCompleteDockSession();
  const markUnresolved = useMarkDockSessionUnresolved();
  const depleteInventory = useDepleteMixSession();
  const calculateOverage = useCalculateOverageCharge();
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const { data: existingCharges } = useCheckoutUsageCharges(appointment.id);
  const { data: billingSettings } = useBackroomBillingSettings(effectiveOrganization?.id);

  // Demo-mode local bowl state — persisted in sessionStorage per appointment
  const demoBowlsKey = `dock-demo-bowls::${appointment.id}`;
  const [demoBowls, setDemoBowls] = useState<DemoBowl[]>(() => {
    try {
      const stored = sessionStorage.getItem(demoBowlsKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showFormulaHistory, setShowFormulaHistory] = useState(false);
  const [bowlMenuTarget, setBowlMenuTarget] = useState<{ type: 'remote'; session: DockMixSession; index: number } | { type: 'demo'; bowl: DemoBowl } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'remote'; session: DockMixSession } | { type: 'demo'; bowl: DemoBowl } | null>(null);

  // Sync demo bowls to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(demoBowlsKey, JSON.stringify(demoBowls));
  }, [demoBowls, demoBowlsKey]);

  // Listen for demo reset event
  useEffect(() => {
    const handleReset = () => {
      setDemoBowls([]);
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('dock-demo-bowls::')) sessionStorage.removeItem(key);
      }
    };
    window.addEventListener('dock-demo-reset', handleReset);
    return () => window.removeEventListener('dock-demo-reset', handleReset);
  }, []);

  // Parse chemical services
  const chemicalServices = useMemo(() => getChemicalServices(effectiveServiceName ?? appointment.service_name), [effectiveServiceName, appointment.service_name]);

  // Aggregate stats across ALL active session IDs
  const activeSessionIds = useMemo(
    () => (sessions ?? []).filter(s => !isTerminalSessionStatus(s.status as any)).map(s => s.id),
    [sessions]
  );
  const { data: sessionStats } = useDockSessionStats(activeSessionIds.length > 0 ? activeSessionIds : (sessions?.[0]?.id ? [sessions[0].id] : null));

  const handleAddBowlForService = useCallback((serviceLabel: string, containerType: ContainerType = 'bowl') => {
    setActiveServiceLabel(serviceLabel);
    setActiveContainerType(containerType);
    if (!showBowlDetection) setShowBowlDetection(true);
  }, [showBowlDetection]);

  const handleCreateBowl = useCallback((lines: FormulaLine[], _baseWeight: number) => {
    if (isDemoMode) {
      const existingCount = (sessions?.length || 0) + demoBowls.length;
      const bowlNumber = existingCount + 1;
      const totalWeight = lines.reduce((sum, l) => sum + l.targetWeight * l.ratio, 0);
      const totalCost = lines.reduce((sum, l) => sum + (l.targetWeight * l.ratio) * (l.product.wholesale_price || 0), 0);

      const newBowl: DemoBowl = {
        id: `demo-local-bowl-${Date.now()}`,
        bowlNumber,
        status: 'in_progress',
        lines,
        totalWeight,
        totalCost,
        createdAt: new Date().toISOString(),
        serviceLabel: activeServiceLabel,
        containerType: activeContainerType,
      };
      setDemoBowls((prev) => [...prev, newBowl]);
      setActiveBowl({
        sessionId: newBowl.id,
        bowlId: newBowl.id,
        bowlNumber,
        status: 'open',
        demoLines: formulaLinesToBowlLines(lines),
      });
      setActiveServiceLabel(null);
      setActiveContainerType('bowl');
      return;
    }

    if (!effectiveOrganization?.id) return;

    createBowl.mutate({
      appointmentId: appointment.id,
      organizationId: effectiveOrganization.id,
      locationId: appointment.location_id || undefined,
      staffUserId: staff.userId,
      lines,
      baseWeight: _baseWeight,
      serviceLabel: activeServiceLabel || undefined,
      containerType: activeContainerType,
    }, {
      onSuccess: (result: CreatedBowlResult) => {
        setActiveBowl({
          sessionId: result.sessionId,
          bowlId: result.bowlId,
          bowlNumber: result.bowlNumber,
          status: 'open',
        });
        setActiveServiceLabel(null);
      },
    });
  }, [isDemoMode, sessions, demoBowls, effectiveOrganization, createBowl, appointment, staff, activeServiceLabel]);

  const handleBowlTap = (session: DockMixSession, index: number) => {
    setActiveBowl({
      sessionId: session.id,
      bowlId: session.id,
      bowlNumber: index,
      status: session.status,
    });
  };

  const handleDemoBowlTap = (bowl: DemoBowl) => {
    setActiveBowl({
      sessionId: bowl.id,
      bowlId: bowl.id,
      bowlNumber: bowl.bowlNumber,
      status: bowl.status,
      demoLines: formulaLinesToBowlLines(bowl.lines),
    });
  };

  const handleCompleteSession = async (notes?: string) => {
    if (isDemoMode) {
      setShowComplete(false);
      return;
    }
    if (!sessions?.length || !effectiveOrganization?.id) return;

    // Process ALL non-terminal sessions (not just sessions[0])
    const activeSessions = sessions.filter(
      s => !isTerminalSessionStatus(s.status as any)
    );

    if (activeSessions.length === 0) {
      toast.info('All sessions are already completed');
      setShowComplete(false);
      return;
    }

    const serviceNames = chemicalServices.length > 0
      ? chemicalServices
      : [effectiveServiceName ?? appointment.service_name].filter(Boolean) as string[];

    try {
      for (const session of activeSessions) {
        // 1. Deplete inventory FIRST (retryable if session stays active)
        await depleteInventory.mutateAsync({
          sessionId: session.id,
          organizationId: effectiveOrganization.id,
          locationId: appointment.location_id || undefined,
        });

        // 2. Calculate charges per chemical service
        for (const svcName of serviceNames) {
          await calculateOverage.mutateAsync({
            sessionId: session.id,
            appointmentId: appointment.id,
            organizationId: effectiveOrganization.id,
            serviceName: svcName,
          });
        }

        // 3. Mark session completed LAST (terminal — cannot retry after this)
        await completeSession.mutateAsync({
          sessionId: session.id,
          organizationId: effectiveOrganization.id,
          locationId: appointment.location_id || undefined,
          notes,
        });
      }

      // Invalidate charges so the sheet shows updated totals
      await queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });

      // Show charge total after all sessions processed
      const totalCharged = activeSessions.length;
      if (totalCharged > 1) {
        toast.success(`All ${totalCharged} sessions completed and charged`);
      }

      // Brief delay so user can see final charges before sheet closes
      setTimeout(() => setShowComplete(false), 1500);
    } catch (err) {
      console.error('Session completion chain error:', err);
      const step = depleteInventory.isError ? 'inventory depletion' : calculateOverage.isError ? 'charge calculation' : 'session completion';
      toast.error(`Failed during ${step} — retry to continue`);
    }
  };

  const handleMarkUnresolved = (reason: string) => {
    if (isDemoMode) {
      setShowComplete(false);
      return;
    }
    if (!sessions?.length || !effectiveOrganization?.id) return;

    // Flag ALL non-terminal sessions, not just sessions[0]
    const activeSessions = sessions.filter(
      s => !isTerminalSessionStatus(s.status as any)
    );

    if (activeSessions.length === 0) {
      toast.info('No active sessions to flag');
      setShowComplete(false);
      return;
    }

    // Flag each active session sequentially
    let completed = 0;
    const flagNext = () => {
      const session = activeSessions[completed];
      if (!session) {
        setShowComplete(false);
        return;
      }
      markUnresolved.mutate({
        sessionId: session.id,
        organizationId: effectiveOrganization!.id,
        locationId: appointment.location_id || undefined,
        reason,
      }, {
        onSuccess: () => {
          completed++;
          if (completed >= activeSessions.length) {
            setShowComplete(false);
          } else {
            flagNext();
          }
        },
      });
    };
    flagNext();
  };

  const handleBowlAction = useCallback((action: BowlAction) => {
    if (!bowlMenuTarget) return;
    switch (action) {
      case 'edit':
        if (bowlMenuTarget.type === 'remote') {
          handleBowlTap(bowlMenuTarget.session, bowlMenuTarget.index);
        } else {
          handleDemoBowlTap(bowlMenuTarget.bowl);
        }
        setBowlMenuTarget(null);
        break;
      case 'rename':
        setRenameTarget(bowlMenuTarget.type === 'remote' ? { type: 'remote', session: bowlMenuTarget.session } : { type: 'demo', bowl: bowlMenuTarget.bowl });
        setBowlMenuTarget(null);
        break;
      case 'discard':
        if (bowlMenuTarget.type === 'demo') {
          setDemoBowls(prev => prev.filter(b => b.id !== bowlMenuTarget.bowl.id));
          toast.success('Formula removed');
        } else {
          toast.success('Formula removed');
        }
        setBowlMenuTarget(null);
        break;
      default:
        toast('Coming soon', { description: `${action.replace('_', ' ')} will be available in a future update.` });
        setBowlMenuTarget(null);
        break;
    }
  }, [bowlMenuTarget]);

  const handleRename = useCallback((newName: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === 'demo') {
      setDemoBowls(prev => prev.map(b => b.id === renameTarget.bowl.id ? { ...b, serviceLabel: newName } : b));
    }
    toast.success('Formula renamed');
    setRenameTarget(null);
  }, [renameTarget]);

  // Full-screen dispensing view
  const remoteBowls = sessions || [];
  const allBowlCount = remoteBowls.length + demoBowls.length;

  // Group bowls by service label (must be before early returns)
  const bowlsByService = useMemo(() => {
    const map = new Map<string, { remote: DockMixSession[]; demo: DemoBowl[] }>();
    for (const svc of chemicalServices) {
      map.set(svc, { remote: [], demo: [] });
    }
    for (const s of remoteBowls) {
      const label = s.service_label || chemicalServices[0] || 'Uncategorized';
      if (!map.has(label)) map.set(label, { remote: [], demo: [] });
      map.get(label)!.remote.push(s);
    }
    for (const b of demoBowls) {
      const label = b.serviceLabel || chemicalServices[0] || 'Uncategorized';
      if (!map.has(label)) map.set(label, { remote: [], demo: [] });
      map.get(label)!.demo.push(b);
    }
    return map;
  }, [chemicalServices, remoteBowls, demoBowls]);

  const hasChemicalServices = chemicalServices.length > 0;

  // Full-screen dispensing view
  if (activeBowl) {
    return (
      <DockLiveDispensing
        sessionId={activeBowl.sessionId}
        bowlId={activeBowl.bowlId}
        bowlNumber={activeBowl.bowlNumber}
        organizationId={effectiveOrganization?.id || ''}
        bowlStatus={activeBowl.status}
        demoLines={activeBowl.demoLines}
        onBack={() => setActiveBowl(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  const hasActiveSessions = remoteBowls.some((s) => !isTerminalSessionStatus(s.status as any)) || demoBowls.length > 0;

  const demoTotalDispensed = demoBowls.reduce((sum, b) => sum + b.totalWeight, 0);
  const demoTotalCost = demoBowls.reduce((sum, b) => sum + b.totalCost, 0);

  const completeStats = sessionStats || {
    totalBowls: allBowlCount,
    reweighedBowls: remoteBowls.filter((s) => s.status === 'completed').length,
    totalDispensed: demoTotalDispensed,
    totalLeftover: 0,
    totalNetUsage: demoTotalDispensed,
    totalCost: demoTotalCost,
  };

  

  return (
    <div className="relative flex flex-col h-full">
      <DockClientAlertsBanner
        phorestClientId={appointment.phorest_client_id}
        clientId={appointment.client_id}
        clientName={appointment.client_name}
        bookingNotes={appointment.notes}
      />
      <div className={cn(
        'px-7 py-4 flex-1 overflow-y-auto',
        !hasChemicalServices && allBowlCount === 0 ? 'flex flex-col' : 'space-y-6'
      )}>
        {hasChemicalServices ? (
          <>
            {/* Per-service sections */}
            {Array.from(bowlsByService.entries()).map(([serviceLabel, { remote, demo }]) => {
              const svcBowlCount = remote.length + demo.length;
              // Running bowl index across all services
              let bowlIdx = 0;
              // Count bowls in previous services for numbering
              let globalOffset = 0;
              for (const [lbl, entry] of bowlsByService.entries()) {
                if (lbl === serviceLabel) break;
                globalOffset += entry.remote.length + entry.demo.length;
              }

              return (
                <div key={serviceLabel}>
                  {/* Service header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                      {serviceLabel}
                    </h3>
                    <span className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]">
                      {svcBowlCount} formulation{svcBowlCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bowl grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {remote.map((session) => {
                      bowlIdx++;
                      const ct = (session.container_type as ContainerType) || 'bowl';
                      return (
                         <BowlCard
                          key={session.id}
                          session={session}
                          index={globalOffset + bowlIdx}
                          containerType={ct}
                          onTap={() => handleBowlTap(session, globalOffset + bowlIdx)}
                          onMenuTap={() => setBowlMenuTarget({ type: 'remote', session, index: globalOffset + bowlIdx })}
                        />
                      );
                    })}
                    {demo.map((bowl) => {
                      bowlIdx++;
                      return (
                        <DemoBowlCard
                          key={bowl.id}
                          bowl={bowl}
                          onTap={() => handleDemoBowlTap(bowl)}
                          onMenuTap={() => setBowlMenuTarget({ type: 'demo', bowl })}
                        />
                      );
                    })}
                    {/* Inline Add cards based on service container types */}
                    {(() => {
                      const svcMeta = serviceLookup?.get(serviceLabel);
                      const allowedTypes: ContainerType[] = svcMeta?.container_types || ['bowl'];
                      return allowedTypes.map((ct) => (
                        <AddBowlCard
                          key={ct}
                          containerType={ct}
                          onClick={() => handleAddBowlForService(serviceLabel, ct)}
                          disabled={createBowl.isPending}
                        />
                      ));
                    })()}
                  </div>
                </div>
              );
            })}
          </>
        ) : allBowlCount > 0 ? (
          /* Fallback: flat grid for appointments with no parseable chemical services but existing bowls */
          <div className="grid grid-cols-2 gap-4">
             {remoteBowls.map((session, idx) => (
              <BowlCard
                key={session.id}
                session={session}
                index={idx + 1}
                onTap={() => handleBowlTap(session, idx + 1)}
                onMenuTap={() => setBowlMenuTarget({ type: 'remote', session, index: idx + 1 })}
              />
            ))}
            {demoBowls.map((bowl) => (
              <DemoBowlCard
                key={bowl.id}
                bowl={bowl}
                onTap={() => handleDemoBowlTap(bowl)}
                onMenuTap={() => setBowlMenuTarget({ type: 'demo', bowl })}
              />
            ))}
            <AddBowlCard
              onClick={() => {
                setActiveServiceLabel(null);
                if (!showBowlDetection) setShowBowlDetection(true);
              }}
              disabled={createBowl.isPending}
            />
          </div>
        ) : (
          /* Empty state — Start Mixing */
          <button
            onClick={() => {
              setActiveServiceLabel(chemicalServices[0] || null);
              if (!showBowlDetection) setShowBowlDetection(true);
            }}
            disabled={createBowl.isPending}
            className="flex-1 flex flex-col items-center justify-center text-center hover:opacity-80 active:opacity-60 active:scale-[0.98] transition-all cursor-pointer"
          >
            <motion.div
              className="relative mb-6"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 rounded-full bg-violet-500/20 scale-150 animate-[glow_2.5s_ease-in-out_infinite]" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-violet-500/30 bg-violet-600/10">
                <FlaskConical className="w-12 h-12 text-violet-400" />
              </div>
            </motion.div>
            <span className="font-display text-lg tracking-wide text-violet-300">
              Start Mixing
            </span>
            <span className="text-sm text-[hsl(var(--platform-muted-foreground))] mt-1">
              Tap anywhere to add your first bowl
            </span>
          </button>
        )}
      </div>


      {/* Bowl detection gate */}
      <DockBowlDetectionGate
        open={showBowlDetection}
        isDemoMode={isDemoMode}
        onReady={() => {
          setShowBowlDetection(false);
          setShowNewBowl(true);
        }}
        onCancel={() => {
          setShowBowlDetection(false);
          setActiveServiceLabel(null);
        }}
      />

      {/* New bowl sheet */}
      <DockNewBowlSheet
        open={showNewBowl}
        onClose={() => {
          setShowNewBowl(false);
          setActiveServiceLabel(null);
          setActiveContainerType('bowl');
        }}
        onCreateBowl={handleCreateBowl}
        clientId={appointment.client_id}
        containerType={activeContainerType}
      />

      {/* Session complete sheet */}
      <DockSessionCompleteSheet
        open={showComplete}
        stats={completeStats}
        onComplete={handleCompleteSession}
        onMarkUnresolved={handleMarkUnresolved}
        onClose={() => setShowComplete(false)}
        isPending={completeSession.isPending || markUnresolved.isPending || depleteInventory.isPending || calculateOverage.isPending}
        pendingCharges={existingCharges?.filter(c => c.charge_amount > 0).map(c => ({
          chargeType: c.charge_type === 'product_cost' ? 'product_cost' as const : 'overage' as const,
          chargeAmount: c.charge_amount,
          serviceName: c.service_name || undefined,
        }))}
        estimatedCharge={
          (!existingCharges || existingCharges.length === 0) && sessionStats?.totalCost
            ? sessionStats.totalCost * (1 + (billingSettings?.default_product_markup_pct ?? 0) / 100)
            : null
        }
      />

      {/* Complete Session FAB */}
      {hasActiveSessions && !activeBowl && (
        <button
          onClick={() => setShowComplete(true)}
          className="absolute bottom-4 right-5 z-[25] h-12 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Check className="w-4 h-4" />
          Complete Session
        </button>
      )}

      {/* Formula history floating button */}
      {appointment.client_id && (
        <button
          onClick={() => setShowFormulaHistory(prev => !prev)}
          className="absolute bottom-4 left-5 z-[25] w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-white/[0.12] to-white/[0.04] backdrop-blur-2xl border border-white/[0.18] ring-1 ring-white/[0.08] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-150 hover:from-white/[0.16] hover:to-white/[0.06]"
          aria-label="Formula history"
        >
          <History className="w-5 h-5 text-white/50" />
        </button>
      )}

      {/* Formula history sheet */}
      <DockFormulaHistorySheet
        isOpen={showFormulaHistory}
        onClose={() => setShowFormulaHistory(false)}
        clientId={appointment.client_id}
        clientName={appointment.client_name}
      />

      {/* Bowl action sheet */}
      <DockBowlActionSheet
        open={!!bowlMenuTarget}
        onClose={() => setBowlMenuTarget(null)}
        onAction={handleBowlAction}
        bowlLabel={bowlMenuTarget?.type === 'demo' ? (bowlMenuTarget.bowl.serviceLabel || 'New Formula') : bowlMenuTarget ? `${(bowlMenuTarget.session.container_type === 'bottle' ? 'Bottle' : 'Bowl')} ${bowlMenuTarget.index}` : undefined}
        containerLabel={bowlMenuTarget?.type === 'demo' ? (bowlMenuTarget.bowl.containerType === 'bottle' ? 'Bottle' : 'Bowl') : bowlMenuTarget?.session.container_type === 'bottle' ? 'Bottle' : 'Bowl'}
      />

      {/* Rename dialog */}
      <DockRenameBowlDialog
        open={!!renameTarget}
        currentName={renameTarget?.type === 'demo' ? (renameTarget.bowl.serviceLabel || 'New Formula') : 'Bowl'}
        containerLabel={renameTarget?.type === 'demo' ? (renameTarget.bowl.containerType === 'bottle' ? 'Bottle' : 'Bowl') : 'Bowl'}
        onConfirm={handleRename}
        onClose={() => setRenameTarget(null)}
      />
    </div>
  );
}


// ─── Inline Add Bowl/Bottle Card ─────────────────────────────
function AddBowlCard({ onClick, disabled, containerType = 'bowl' }: { onClick: () => void; disabled: boolean; containerType?: ContainerType }) {
  const isBottle = containerType === 'bottle';
  const label = isBottle ? 'Add Bottle' : 'Add Bowl';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={DOCK_CARD.addWrapper}
    >
      <div className={DOCK_CARD.addIconBox}>
        <Plus className={DOCK_CARD.addIcon} />
      </div>
      <span className={DOCK_CARD.addLabel}>{label}</span>
    </button>
  );
}

// ─── Bowl Card (DB sessions) ──────────────────────────
function BowlCard({ session, index, onTap, onMenuTap, containerType = 'bowl' }: { session: DockMixSession; index: number; onTap: () => void; onMenuTap: () => void; containerType?: ContainerType }) {
  const status = getStatusDisplay(session.status);
  const StatusIcon = status.icon;
  const isTerminal = isTerminalSessionStatus(session.status as any);
  const containerLabel = containerType === 'bottle' ? 'Bottle' : 'Bowl';

  return (
    <button
      onClick={onTap}
      className={cn(DOCK_CARD.wrapper, isTerminal && 'opacity-60')}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn(DOCK_CARD.iconBox, status.iconBg)}>
            <StatusIcon className={cn(DOCK_CARD.icon, status.color)} />
          </div>
          <div className="min-w-0">
            <p className={DOCK_CARD.title}>{containerLabel} {index}</p>
            <p className={cn(DOCK_CARD.statusLabel, status.color)}>{status.label}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onMenuTap(); }} className={DOCK_CARD.menuButton}>
          <MoreVertical className={DOCK_CARD.menuIcon} />
        </button>
      </div>

      <div className="flex-1 mt-1">
        {session.mixed_by_name && (
          <p className={cn(DOCK_CARD.meta, 'mb-1')}>Mixed by {session.mixed_by_name}</p>
        )}
        {session.unresolved_flag && (
          <p className={cn(DOCK_CARD.flag, 'mb-1')}>⚠ Flagged for review</p>
        )}
        {session.notes && (
          <p className={DOCK_CARD.notes}>{session.notes}</p>
        )}
      </div>
    </button>
  );
}

/** Demo-mode bowl card with ingredient summary */
function DemoBowlCard({ bowl, onTap, onMenuTap }: { bowl: DemoBowl; onTap: () => void; onMenuTap: () => void }) {
  const previewLines = bowl.lines.slice(0, 3);
  const overflowCount = bowl.lines.length - 3;
  const isBottle = bowl.containerType === 'bottle';
  const CardIcon = isBottle ? TestTube2 : FlaskConical;
  const containerLabel = isBottle ? 'New Bottle' : 'New Formula';

  return (
    <button
      onClick={onTap}
      className={DOCK_CARD.wrapper}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn(DOCK_CARD.iconBox, 'bg-amber-500/15 border-amber-500/20')}>
            <CardIcon className={cn(DOCK_CARD.icon, 'text-amber-400')} />
          </div>
          <div className="min-w-0">
            <p className={DOCK_CARD.title}>{containerLabel}</p>
            <p className={cn(DOCK_CARD.statusLabel, 'text-amber-400')}>In Progress</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onMenuTap(); }} className={DOCK_CARD.menuButton}>
          <MoreVertical className={DOCK_CARD.menuIcon} />
        </button>
      </div>

      <div className="flex-1 mt-1 space-y-1">
        {previewLines.map((line, i) => (
          <p key={i} className={DOCK_CARD.ingredientLine}>
            <span className={DOCK_CARD.ingredientName}>{line.product.name}</span>
            <span className="mx-1">·</span>
            <span>{(line.targetWeight * line.ratio).toFixed(1)}g</span>
          </p>
        ))}
        {overflowCount > 0 && (
          <p className={DOCK_CARD.overflow}>+{overflowCount} more</p>
        )}
        {previewLines.length === 0 && (
          <p className={cn(DOCK_CARD.overflow, 'italic')}>No ingredients yet</p>
        )}
      </div>

      <div className={DOCK_CARD.footer}>
        <span className={DOCK_CARD.footerText}>{bowl.totalWeight.toFixed(0)}g total</span>
        <span className={DOCK_CARD.footerText}>${bowl.totalCost.toFixed(2)}</span>
      </div>
    </button>
  );
}
