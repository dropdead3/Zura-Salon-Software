/**
 * MixSessionManager — Orchestrates the full mixing workflow for an appointment.
 * Manages session lifecycle, bowls, lines, reweigh, waste, and formula saving.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Play, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { BowlCard } from './BowlCard';
import { SessionSummary } from './SessionSummary';
import { WasteRecordDialog } from './WasteRecordDialog';
import { ScaleConnectionStatus } from './ScaleConnectionStatus';
import { StationSelector } from './StationSelector';
import { useMixSession, useCreateMixSession, useUpdateMixSessionStatus, type MixSession } from '@/hooks/backroom/useMixSession';
import { useMixBowls, useCreateMixBowl, useUpdateBowlStatus } from '@/hooks/backroom/useMixBowls';
import { useMixBowlLines, useAddBowlLine, useDeleteBowlLine } from '@/hooks/backroom/useMixBowlLines';
import { useCreateReweighEvent } from '@/hooks/backroom/useReweighEvents';
import { useCreateWasteEvent, type WasteCategory } from '@/hooks/backroom/useWasteEvents';
import { useSaveFormulaHistory } from '@/hooks/backroom/useClientFormulaHistory';
import { useDepleteMixSession } from '@/hooks/backroom/useDepleteMixSession';
import { useCalculateOverageCharge } from '@/hooks/billing/useCalculateOverageCharge';
import { supabase } from '@/integrations/supabase/client';
import { calculateBowlWeight, calculateBowlCost, calculateNetUsage, extractActualFormula, extractRefinedFormula } from '@/lib/backroom/mix-calculations';
import { isTerminalSessionStatus } from '@/lib/backroom/session-state-machine';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MixSessionManagerProps {
  organizationId: string;
  appointmentId: string;
  appointmentServiceId?: string;
  clientId?: string;
  clientName?: string;
  staffUserId?: string;
  locationId?: string;
  serviceId?: string;
  serviceName?: string;
  staffName?: string;
}

export function MixSessionManager({
  organizationId,
  appointmentId,
  appointmentServiceId,
  clientId,
  staffUserId,
  locationId,
  serviceId,
  serviceName,
  staffName,
}: MixSessionManagerProps) {
  const { user } = useAuth();
  const [stationId, setStationId] = useState<string | null>(null);
  const [showWasteDialog, setShowWasteDialog] = useState(false);

  // Data hooks
  const { data: sessions = [], isLoading: loadingSessions } = useMixSession(appointmentId);
  const activeSession = sessions.find((s) => !isTerminalSessionStatus(s.status));
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  const { data: bowls = [] } = useMixBowls(activeSession?.id ?? null);

  // Mutation hooks
  const createSession = useCreateMixSession();
  const updateSessionStatus = useUpdateMixSessionStatus();
  const createBowl = useCreateMixBowl();
  const updateBowlStatus = useUpdateBowlStatus();
  const addBowlLine = useAddBowlLine();
  const deleteBowlLine = useDeleteBowlLine();
  const createReweigh = useCreateReweighEvent();
  const createWaste = useCreateWasteEvent();
  const saveFormula = useSaveFormulaHistory();
  const depleteInventory = useDepleteMixSession();

  const calculateOverage = useCalculateOverageCharge();

  // ─── Session Actions ──────────────────────────────
  const handleStartSession = useCallback(() => {
    createSession.mutate({
      organization_id: organizationId,
      appointment_id: appointmentId,
      appointment_service_id: appointmentServiceId,
      client_id: clientId,
      mixed_by_staff_id: user?.id,
      service_performed_by_staff_id: staffUserId,
      station_id: stationId ?? undefined,
      location_id: locationId,
    });
  }, [organizationId, appointmentId, appointmentServiceId, clientId, user?.id, staffUserId, stationId, locationId, createSession]);

  const handleBeginMixing = useCallback(() => {
    if (!activeSession) return;
    updateSessionStatus.mutate({
      id: activeSession.id,
      currentStatus: activeSession.status,
      newStatus: 'mixing',
    });
  }, [activeSession, updateSessionStatus]);

  const handleMoveToReweigh = useCallback(async () => {
    if (!activeSession) return;

    const openBowls = bowls.filter((b) => b.status === 'open');
    if (openBowls.length > 0) {
      // Batch-seal open bowls with lines, discard empty ones
      const sealPromises: Promise<unknown>[] = [];
      const sealed: number[] = [];
      const discarded: number[] = [];

      for (const bowl of openBowls) {
        // Check if bowl has lines by looking at total_dispensed_weight
        if (bowl.total_dispensed_weight > 0) {
          sealPromises.push(
            updateBowlStatus.mutateAsync({
              id: bowl.id,
              sessionId: activeSession.id,
              currentStatus: bowl.status,
              newStatus: 'sealed',
            })
          );
          sealed.push(bowl.bowl_number);
        } else {
          sealPromises.push(
            updateBowlStatus.mutateAsync({
              id: bowl.id,
              sessionId: activeSession.id,
              currentStatus: bowl.status,
              newStatus: 'discarded',
            })
          );
          discarded.push(bowl.bowl_number);
        }
      }

      try {
        await Promise.all(sealPromises);
        const parts: string[] = [];
        if (sealed.length) parts.push(`Sealed bowl${sealed.length > 1 ? 's' : ''} ${sealed.join(', ')}`);
        if (discarded.length) parts.push(`Discarded empty bowl${discarded.length > 1 ? 's' : ''} ${discarded.join(', ')}`);
        if (parts.length) toast.info(parts.join('. '));
      } catch {
        toast.error('Failed to auto-seal bowls');
        return;
      }
    }

    updateSessionStatus.mutate({
      id: activeSession.id,
      currentStatus: activeSession.status,
      newStatus: 'pending_reweigh',
    });
  }, [activeSession, bowls, updateSessionStatus, updateBowlStatus]);

  const handleCompleteSession = useCallback(async () => {
    if (!activeSession) return;

    // Check for unreweighed bowls
    const sealedNotReweighed = bowls.filter((b) => b.status === 'sealed');
    const unresolvedReason = sealedNotReweighed.length > 0
      ? `${sealedNotReweighed.length} bowl(s) not reweighed`
      : undefined;

    updateSessionStatus.mutate({
      id: activeSession.id,
      currentStatus: activeSession.status,
      newStatus: 'completed',
      unresolvedReason,
    });

    // Deplete inventory from stock
    depleteInventory.mutate({
      sessionId: activeSession.id,
      organizationId,
      locationId,
    });

    // Calculate overage charge if allowance policy exists
    calculateOverage.mutate({
      sessionId: activeSession.id,
      appointmentId,
      organizationId,
      serviceId,
      serviceName,
    });

    // Save formulas if we have a client
    if (clientId) {
      try {
        // Gather bowl IDs (non-discarded only)
        const validBowls = bowls.filter((b) => b.status !== 'discarded');
        const bowlIds = validBowls.map((b) => b.id);

        if (bowlIds.length > 0) {
          // Batch-fetch all lines across all valid bowls
          const { data: allLines, error: linesError } = await supabase
            .from('mix_bowl_lines')
            .select('*')
            .in('bowl_id', bowlIds)
            .order('sequence_order', { ascending: true });

          if (linesError) throw linesError;

          const castLines = (allLines ?? []) as unknown as Array<{
            product_id: string | null;
            product_name_snapshot: string;
            brand_snapshot: string | null;
            dispensed_quantity: number;
            dispensed_unit: string;
            dispensed_cost_snapshot: number;
          }>;

          if (castLines.length > 0) {
            // Calculate aggregated totals for refined formula
            const totalDispensed = calculateBowlWeight(castLines);
            const totalNetUsage = validBowls.reduce(
              (sum, b) => sum + (b.net_usage_weight ?? b.total_dispensed_weight ?? 0),
              0
            );

            const actualFormula = extractActualFormula(castLines);
            const refinedFormula = extractRefinedFormula(castLines, totalDispensed, totalNetUsage);

            const baseParams = {
              organization_id: organizationId,
              client_id: clientId,
              appointment_id: appointmentId,
              appointment_service_id: appointmentServiceId,
              mix_session_id: activeSession.id,
              service_name: serviceName,
              staff_id: staffUserId,
              staff_name: staffName,
            };

            // Save both formula types
            await Promise.all([
              saveFormula.mutateAsync({
                ...baseParams,
                formula_type: 'actual',
                formula_data: actualFormula,
              }),
              saveFormula.mutateAsync({
                ...baseParams,
                formula_type: 'refined',
                formula_data: refinedFormula,
              }),
            ]);

            toast.success('Session completed. Formula saved to client history.');
          } else {
            toast.success('Session completed. No products to save.');
          }
        } else {
          toast.success('Session completed.');
        }
      } catch (error) {
        console.error('Failed to save formula:', error);
        toast.error('Session completed but formula save failed. Check client history.');
      }
    } else {
      toast.info('Session completed. No client linked — formula not saved.');
    }
  }, [activeSession, bowls, clientId, organizationId, appointmentId, appointmentServiceId, serviceId, serviceName, staffUserId, staffName, updateSessionStatus, saveFormula, depleteInventory, calculateOverage]);

  // ─── Bowl Actions ─────────────────────────────────
  const handleAddBowl = useCallback(() => {
    if (!activeSession) return;
    createBowl.mutate({
      mix_session_id: activeSession.id,
      bowl_number: bowls.length + 1,
    });
  }, [activeSession, bowls.length, createBowl]);

  const handleAddLine = useCallback((
    bowlId: string,
    productId: string,
    productName: string,
    brand: string | null,
    costPerUnit: number,
    quantity: number,
    unit: string,
    capturedVia: string
  ) => {
    addBowlLine.mutate({
      bowl_id: bowlId,
      product_id: productId,
      product_name_snapshot: productName,
      brand_snapshot: brand ?? undefined,
      dispensed_quantity: quantity,
      dispensed_unit: unit,
      dispensed_cost_snapshot: costPerUnit,
      captured_via: capturedVia,
      sequence_order: 0, // Auto-incremented in hook
    });
  }, [addBowlLine]);

  const handleDeleteLine = useCallback((lineId: string, bowlId: string) => {
    deleteBowlLine.mutate({ id: lineId, bowlId });
  }, [deleteBowlLine]);

  const handleSealBowl = useCallback((bowlId: string) => {
    const bowl = bowls.find((b) => b.id === bowlId);
    if (!bowl) return;
    updateBowlStatus.mutate({
      id: bowlId,
      sessionId: activeSession!.id,
      currentStatus: bowl.status,
      newStatus: 'sealed',
    });
  }, [bowls, activeSession, updateBowlStatus]);

  const handleReweighBowl = useCallback(async (bowlId: string, leftover: number, unit: string) => {
    if (!activeSession) return;
    const bowl = bowls.find((b) => b.id === bowlId);
    if (!bowl) return;

    const netUsage = calculateNetUsage(bowl.total_dispensed_weight ?? 0, leftover);

    // Coordinate: reweigh event must succeed before status update
    try {
      await createReweigh.mutateAsync({
        bowl_id: bowlId,
        mix_session_id: activeSession.id,
        leftover_quantity: leftover,
        leftover_unit: unit,
      });

      updateBowlStatus.mutate({
        id: bowlId,
        sessionId: activeSession.id,
        currentStatus: bowl.status,
        newStatus: 'reweighed',
        totals: {
          leftover_weight: leftover,
          net_usage_weight: netUsage,
        },
      });
    } catch {
      toast.error('Reweigh failed — bowl remains sealed. Please retry.');
    }
  }, [activeSession, bowls, createReweigh, updateBowlStatus]);

  const handleDiscardBowl = useCallback((bowlId: string) => {
    const bowl = bowls.find((b) => b.id === bowlId);
    if (!bowl || !activeSession) return;
    updateBowlStatus.mutate({
      id: bowlId,
      sessionId: activeSession.id,
      currentStatus: bowl.status,
      newStatus: 'discarded',
    });
  }, [bowls, activeSession, updateBowlStatus]);

  // ─── Waste ────────────────────────────────────────
  const handleRecordWaste = useCallback((category: WasteCategory, quantity: number, unit: string, notes: string) => {
    if (!activeSession) return;
    createWaste.mutate({
      mix_session_id: activeSession.id,
      waste_category: category,
      quantity,
      unit,
      notes: notes || undefined,
    });
  }, [activeSession, createWaste]);

  // ─── Render ───────────────────────────────────────
  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse font-sans text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No active session — show start button
  if (!activeSession) {
    return (
      <div className="space-y-4">
        {completedSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-sm tracking-wide text-muted-foreground">Previous Sessions</h3>
            {completedSessions.map((s) => (
              <CompletedSessionSummary key={s.id} session={s} />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center space-y-4">
          <div>
            <h3 className="font-display text-base tracking-wide">Start Backroom Session</h3>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              Create bowls, add products, capture weights, and save formulas
            </p>
          </div>

          <StationSelector
            locationId={locationId}
            value={stationId}
            onValueChange={setStationId}
          />

          <div className="flex items-center justify-center gap-2">
            <ScaleConnectionStatus state="manual_override" />
          </div>

          <Button
            size="lg"
            onClick={handleStartSession}
            disabled={createSession.isPending}
            className="h-12 px-8 font-sans"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm tracking-wide">
            Mix Session
          </h3>
          <ScaleConnectionStatus state="manual_override" />
        </div>

        <div className="flex items-center gap-2">
          {activeSession.status === 'draft' && (
            <Button size="sm" onClick={handleBeginMixing} className="h-9 font-sans">
              <Play className="w-3.5 h-3.5 mr-1" />
              Begin Mixing
            </Button>
          )}

          {activeSession.status === 'mixing' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWasteDialog(true)}
                className="h-9 font-sans"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Waste
              </Button>
              <Button size="sm" onClick={handleMoveToReweigh} className="h-9 font-sans">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Move to Reweigh
              </Button>
            </>
          )}

          {activeSession.status === 'pending_reweigh' && (
            <Button size="sm" onClick={handleCompleteSession} className="h-9 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Complete Session
            </Button>
          )}
        </div>
      </div>

      {/* Bowls */}
      <div className="space-y-3">
        {bowls.map((bowl) => (
          <BowlCardWithLines
            key={bowl.id}
            bowl={bowl}
            onAddLine={handleAddLine}
            onDeleteLine={handleDeleteLine}
            onSealBowl={handleSealBowl}
            onReweighBowl={handleReweighBowl}
            onDiscardBowl={handleDiscardBowl}
          />
        ))}
      </div>

      {/* Add bowl button */}
      {(activeSession.status === 'draft' || activeSession.status === 'mixing') && (
        <Button
          variant="outline"
          onClick={handleAddBowl}
          disabled={createBowl.isPending}
          className="w-full h-11 font-sans"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Bowl
        </Button>
      )}

      {/* Waste dialog */}
      <WasteRecordDialog
        open={showWasteDialog}
        onOpenChange={setShowWasteDialog}
        onSubmit={handleRecordWaste}
      />
    </div>
  );
}

/**
 * Wrapper that fetches lines for a bowl and renders BowlCard.
 */
function BowlCardWithLines({
  bowl,
  onAddLine,
  onDeleteLine,
  onSealBowl,
  onReweighBowl,
  onDiscardBowl,
}: {
  bowl: ReturnType<typeof useMixBowls>['data'] extends (infer T)[] ? T : never;
  onAddLine: (bowlId: string, productId: string, productName: string, brand: string | null, costPerUnit: number, quantity: number, unit: string, capturedVia: string) => void;
  onDeleteLine: (lineId: string, bowlId: string) => void;
  onSealBowl: (bowlId: string) => void;
  onReweighBowl: (bowlId: string, leftover: number, unit: string) => void;
  onDiscardBowl: (bowlId: string) => void;
}) {
  const { data: lines = [] } = useMixBowlLines(bowl.id);

  return (
    <BowlCard
      bowl={bowl as any}
      lines={lines}
      onAddLine={onAddLine}
      onDeleteLine={onDeleteLine}
      onSealBowl={onSealBowl}
      onReweighBowl={onReweighBowl}
      onDiscardBowl={onDiscardBowl}
    />
  );
}

/**
 * Wrapper that fetches bowls for a completed session and renders SessionSummary.
 */
function CompletedSessionSummary({ session }: { session: MixSession }) {
  const { data: sessionBowls = [] } = useMixBowls(session.id);

  return <SessionSummary session={session} bowls={sessionBowls} />;
}
