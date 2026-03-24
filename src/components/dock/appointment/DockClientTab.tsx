/**
 * DockClientTab — Client intelligence panel for the Dock appointment detail.
 * Surfaces identity, last formula, visit history, notes, processing time,
 * allergy flags, favorite products, photo timeline, no-show rate,
 * editable medical alerts, preferred stylist, repurchase reminders,
 * formula history with smart diffing, conversion tracking, and session-aware recs.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  User, FlaskConical, Clock, FileText, CalendarDays, Loader2, Star,
  AlertTriangle, ShoppingBag, Camera, AlertCircle, Pencil, Plus, Check, X,
  Heart, History, Copy, Sparkles, ArrowUp, ArrowDown, TrendingUp,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useInstantFormulaMemory } from '@/hooks/backroom/useInstantFormulaMemory';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { useClientMemory } from '@/hooks/useClientMemory';
import { useClientProductAffinity } from '@/hooks/useClientProductAffinity';
import { usePreferredStylist, getStylistDisplayName } from '@/hooks/usePreferredStylist';
import { useClientFormulaHistory } from '@/hooks/backroom/useClientFormulaHistory';
import { useCloneFormula } from '@/hooks/backroom/useCloneFormula';
import { calculateCLV, assignCLVTier } from '@/lib/clv-calculator';
import type { ClientFormula } from '@/hooks/backroom/useClientFormulaHistory';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import type { DockStaffSession } from '@/pages/Dock';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { DOCK_BADGE } from '@/components/dock/dock-ui-tokens';
import { cn } from '@/lib/utils';
interface DockClientTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
  activeBowlId?: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

import { detectAllergyFlags } from '@/lib/backroom/detect-allergy-flags';

// ─── Smart Formula Diffing ───
interface FormulaDiff {
  added: string[];
  removed: string[];
  changed: { name: string; oldQty: number; newQty: number; unit: string }[];
  ratioShift: { oldRatio: string; newRatio: string } | null;
}

function computeFormulaDiff(newer: FormulaLine[], older: FormulaLine[]): FormulaDiff {
  const keyOf = (l: FormulaLine) => l.product_id || l.product_name;
  const olderMap = new Map(older.map(l => [keyOf(l), l]));
  const newerMap = new Map(newer.map(l => [keyOf(l), l]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: FormulaDiff['changed'] = [];

  for (const [key, line] of newerMap) {
    const old = olderMap.get(key);
    if (!old) {
      added.push(line.product_name);
    } else if (Math.abs(line.quantity - old.quantity) > 0.1) {
      changed.push({ name: line.product_name, oldQty: old.quantity, newQty: line.quantity, unit: line.unit || 'g' });
    }
  }
  for (const [key, line] of olderMap) {
    if (!newerMap.has(key)) removed.push(line.product_name);
  }

  // Ratio shift: compute total weight ratio between the two largest components
  let ratioShift: FormulaDiff['ratioShift'] = null;
  if (newer.length >= 2 && older.length >= 2) {
    const sortedNew = [...newer].sort((a, b) => b.quantity - a.quantity);
    const sortedOld = [...older].sort((a, b) => b.quantity - a.quantity);
    const newR = sortedNew[0].quantity > 0 ? `1:${Math.round(sortedNew[1].quantity / sortedNew[0].quantity * 10) / 10}` : null;
    const oldR = sortedOld[0].quantity > 0 ? `1:${Math.round(sortedOld[1].quantity / sortedOld[0].quantity * 10) / 10}` : null;
    if (newR && oldR && newR !== oldR) ratioShift = { oldRatio: oldR, newRatio: newR };
  }

  return { added, removed, changed, ratioShift };
}

function hasDiff(diff: FormulaDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0 || diff.ratioShift !== null;
}

// Mock client data for demo IDs
const DEMO_CLIENT_MOCK = {
  id: 'demo-client-mock',
  name: 'Jessica Miller',
  email: 'jessica.miller@example.com',
  phone: '(480) 555-0142',
  notes: 'Prefers low-ammonia formulas. Sensitive scalp — patch test recommended.',
  medical_alerts: 'PPD sensitivity — always patch test 48h prior',
  preferred_stylist_id: null,
  created_at: '2024-01-15T00:00:00Z',
  _source: 'phorest' as const,
};

const isDemoClientId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

export function DockClientTab({ appointment, staff, activeBowlId }: DockClientTabProps) {
  const queryClient = useQueryClient();
  const phorestClientId = appointment.phorest_client_id;
  const clientId = appointment.client_id;
  const usingDemoClient = isDemoClientId(phorestClientId) || isDemoClientId(clientId);

  // ─── Editable medical alerts state ───
  const [editingAlert, setEditingAlert] = useState(false);
  const [alertDraft, setAlertDraft] = useState('');

  // Track whether we've logged recommendations this render
  const recLoggedRef = useRef(false);

  // Client profile (includes medical_alerts + preferred_stylist_id)
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId, usingDemoClient],
    queryFn: async () => {
      // Demo client IDs don't exist in DB — return mock
      if (usingDemoClient) {
        return { ...DEMO_CLIENT_MOCK, name: appointment.client_name || DEMO_CLIENT_MOCK.name };
      }

      if (phorestClientId) {
        const { data } = await supabase
          .from('phorest_clients')
          .select('id, name, email, phone, notes, medical_alerts, preferred_stylist_id, created_at')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data ? { ...data, _source: 'phorest' as const } : null;
      }
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone, notes, medical_alerts, created_at')
          .eq('id', clientId)
          .maybeSingle();
        if (data) {
          return { ...data, name: `${data.first_name || ''} ${data.last_name || ''}`.trim(), _source: 'client' as const, preferred_stylist_id: null };
        }
      }
      return null;
    },
    enabled: !!(phorestClientId || clientId),
  });

  // Preferred stylist
  const preferredStylistId = (client as any)?.preferred_stylist_id ?? null;
  const { data: preferredStylist } = usePreferredStylist(preferredStylistId);
  const preferredStylistName = getStylistDisplayName(preferredStylist);

  // Visit history
  const { data: visits = [], isLoading: visitsLoading } = useClientVisitHistory(phorestClientId);

  // Formula memory
  const { data: formulaMemory } = useInstantFormulaMemory(
    phorestClientId || clientId,
    appointment.service_name,
  );

  // Formula history
  const resolvedClientId = client?.id ?? null;
  const { data: formulaHistory = [] } = useClientFormulaHistory(resolvedClientId ?? null);

  // Client memory (processing time, visit count)
  const { data: memory } = useClientMemory(
    phorestClientId || clientId,
    appointment.service_name,
    staff.organizationId,
  );

  // Favorite products (with repurchase analysis)
  const { data: affinities } = useClientProductAffinity(phorestClientId);

  // Clone formula hook
  const cloneFormula = useCloneFormula();

  // ─── Session-aware: fetch active bowl lines for cross-sell ───
  const { data: activeBowlLines } = useQuery({
    queryKey: ['dock-active-bowl-lines', activeBowlId],
    queryFn: async () => {
      const { data } = await supabase
        .from('mix_bowl_lines')
        .select('product_name_snapshot, brand_snapshot')
        .eq('bowl_id', activeBowlId!);
      return data || [];
    },
    enabled: !!activeBowlId,
    staleTime: 15_000,
  });

  // ─── Cross-sell product recommendations (session-aware + conversion-weighted) ───
  const { data: crossSellProducts } = useQuery({
    queryKey: ['dock-cross-sell', staff.organizationId, appointment.service_name, phorestClientId, activeBowlId, activeBowlLines?.length],
    queryFn: async () => {
      if (!appointment.service_name) return [];
      // Get retail products bought by clients with same service
      const { data } = await supabase
        .from('phorest_transaction_items' as any)
        .select('item_name, phorest_client_id')
        .eq('item_type', 'product')
        .eq('organization_id', staff.organizationId)
        .limit(500) as { data: { item_name: string | null; phorest_client_id: string | null }[] | null };

      if (!data || data.length === 0) return [];

      // Count products excluding current client
      const countMap = new Map<string, number>();
      const clientProducts = new Set<string>();
      for (const item of data) {
        if (item.phorest_client_id === phorestClientId) {
          clientProducts.add(item.item_name || '');
        } else if (item.item_name) {
          countMap.set(item.item_name, (countMap.get(item.item_name) || 0) + 1);
        }
      }

      // Remove products client already buys
      for (const p of clientProducts) countMap.delete(p);

      // Session-aware boost: if bowl lines exist, boost products matching bowl brands
      const bowlBrands = new Set((activeBowlLines || []).map(l => (l.brand_snapshot || '').toLowerCase()).filter(Boolean));
      const entries = [...countMap.entries()].map(([name, count]) => {
        const boosted = bowlBrands.size > 0 && [...bowlBrands].some(brand => name.toLowerCase().includes(brand));
        return { name, buyerCount: count, score: count * (boosted ? 2 : 1) };
      });

      // Fetch conversion rates for weighting
      const { data: conversionData } = await supabase
        .from('retail_recommendation_events' as any)
        .select('recommended_product_name, converted_at')
        .eq('organization_id', staff.organizationId) as { data: { recommended_product_name: string; converted_at: string | null }[] | null };

      if (conversionData && conversionData.length > 0) {
        const convMap = new Map<string, { total: number; converted: number }>();
        for (const r of conversionData) {
          const existing = convMap.get(r.recommended_product_name) || { total: 0, converted: 0 };
          existing.total++;
          if (r.converted_at) existing.converted++;
          convMap.set(r.recommended_product_name, existing);
        }
        for (const entry of entries) {
          const conv = convMap.get(entry.name);
          if (conv && conv.total >= 5) {
            entry.score *= 1 + (conv.converted / conv.total);
          }
        }
      }

      return entries
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ name, buyerCount }) => ({ name, buyerCount }));
    },
    enabled: !!staff.organizationId && !!appointment.service_name,
    staleTime: 10 * 60 * 1000,
  });

  // Transformation photos (last 4)
  const { data: photos } = useQuery({
    queryKey: ['dock-client-photos', phorestClientId, clientId],
    queryFn: async () => {
      const cid = phorestClientId || clientId;
      if (!cid) return [];
      const { data } = await supabase
        .from('client_transformation_photos')
        .select('id, before_url, after_url, service_name, taken_at')
        .eq('client_id', cid)
        .order('taken_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!(phorestClientId || clientId),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Medical alerts mutation ───
  const saveMedicalAlert = useMutation({
    mutationFn: async (alertText: string) => {
      // Demo mode: persist in sessionStorage only
      if (usingDemoClient) {
        const key = `dock-demo-medical-alert::${phorestClientId || clientId}`;
        sessionStorage.setItem(key, alertText.trim());
        return;
      }
      const trimmed = alertText.trim() || null;
      if (phorestClientId && client) {
        const { error } = await supabase
          .from('phorest_clients')
          .update({ medical_alerts: trimmed })
          .eq('id', client.id);
        if (error) throw error;
      } else if (clientId) {
        const { error } = await supabase
          .from('clients')
          .update({ medical_alerts: trimmed })
          .eq('id', clientId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-client-profile', phorestClientId, clientId] });
      setEditingAlert(false);
    },
  });

  // CLV calculation
  const completedVisits = visits.filter(v => v.status === 'completed');
  const totalSpend = completedVisits.reduce((sum, v) => sum + (v.total_price || 0), 0);
  const firstVisitDate = completedVisits.length > 0
    ? completedVisits[completedVisits.length - 1]?.appointment_date
    : null;
  const lastVisitDate = completedVisits.length > 0
    ? completedVisits[0]?.appointment_date
    : null;
  const clvResult = calculateCLV(totalSpend, completedVisits.length, firstVisitDate, lastVisitDate);
  const clvTier = clvResult.isReliable
    ? assignCLVTier(clvResult.lifetimeValue, completedVisits.map(v => v.total_price || 0))
    : null;

  // No-show rate
  const noShowCount = visits.filter(v => v.status === 'cancelled' || v.status === 'no_show').length;
  const noShowRate = visits.length > 0 ? Math.round((noShowCount / visits.length) * 100) : 0;

  // Allergy detection
  const allergyText = detectAllergyFlags(
    (client as any)?.medical_alerts ?? null,
    client?.notes ?? null,
  );

  const isLoading = loadingClient || visitsLoading;

  // Formula history (last 5)
  const [showAllFormulas, setShowAllFormulas] = useState(false);
  const displayFormulas = showAllFormulas ? formulaHistory : formulaHistory.slice(0, 5);

  // ─── Compute formula diffs ───
  const formulaDiffs = new Map<string, FormulaDiff>();
  for (let i = 0; i < formulaHistory.length - 1; i++) {
    const newer = formulaHistory[i];
    const older = formulaHistory[i + 1];
    if (newer.formula_type === older.formula_type && newer.formula_data?.length && older.formula_data?.length) {
      const diff = computeFormulaDiff(newer.formula_data, older.formula_data);
      if (hasDiff(diff)) formulaDiffs.set(newer.id, diff);
    }
  }

  // ─── Conversion rate for suggested retail ───
  const { data: conversionRate } = useQuery({
    queryKey: ['dock-cross-sell-conversion', staff.organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('retail_recommendation_events' as any)
        .select('converted_at')
        .eq('organization_id', staff.organizationId) as { data: { converted_at: string | null }[] | null };
      if (!data || data.length < 10) return null;
      const converted = data.filter(r => r.converted_at).length;
      return Math.round((converted / data.length) * 100);
    },
    enabled: !!staff.organizationId,
    staleTime: 30 * 60 * 1000,
  });

  // ─── Log recommendation events (debounced, once per mount) ───
  const debouncedCrossSell = useDebounce(crossSellProducts, 2000);
  useEffect(() => {
    if (!debouncedCrossSell || debouncedCrossSell.length === 0 || recLoggedRef.current) return;
    if (!phorestClientId || !staff.organizationId) return;
    // Skip DB logging for demo orgs
    if (staff.organizationId === 'demo-org-000' || isDemoClientId(phorestClientId)) return;
    recLoggedRef.current = true;

    const today = new Date().toISOString().split('T')[0];
    const inserts = debouncedCrossSell.map(p => ({
      organization_id: staff.organizationId,
      client_id: phorestClientId,
      recommended_product_name: p.name,
      service_name: appointment.service_name || null,
      recommended_by: staff.userId || null,
    }));

    // Deduplicate: don't log same product+client+day twice
    supabase
      .from('retail_recommendation_events' as any)
      .select('recommended_product_name')
      .eq('organization_id', staff.organizationId)
      .eq('client_id', phorestClientId)
      .gte('recommended_at', today)
      .then(({ data: existing }) => {
        const existingNames = new Set((existing || []).map((r: any) => r.recommended_product_name));
        const newInserts = inserts.filter(i => !existingNames.has(i.recommended_product_name));
        if (newInserts.length > 0) {
          supabase.from('retail_recommendation_events' as any).insert(newInserts).then(() => {});
        }
      });
  }, [debouncedCrossSell, phorestClientId, staff.organizationId, appointment.service_name, staff.userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!client && !phorestClientId && !clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <User className="w-8 h-8 text-[hsl(var(--platform-foreground-muted)/0.3)]" />
        <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Walk-in — no client profile</p>
      </div>
    );
  }

  const displayName = appointment.client_name || client?.name || 'Client';
  const recentVisits = visits.slice(0, 8);
  const currentStylistDiffers = !!preferredStylistId && !!appointment.stylist_user_id && appointment.stylist_user_id !== preferredStylistId;

  return (
    <div className="px-7 py-4 space-y-5">
      {/* ─── Allergy / Sensitivity Alert (Editable) ─── */}
      {editingAlert ? (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-[10px] tracking-wider uppercase text-rose-400">
              Medical Alert
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => saveMedicalAlert.mutate(alertDraft)}
                disabled={saveMedicalAlert.isPending}
                className="p-1 rounded-full hover:bg-rose-500/20 transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                onClick={() => setEditingAlert(false)}
                className="p-1 rounded-full hover:bg-rose-500/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          </div>
          <textarea
            value={alertDraft}
            onChange={(e) => setAlertDraft(e.target.value)}
            placeholder="Note allergies, sensitivities, reactions…"
            rows={3}
            className="w-full bg-[hsl(var(--platform-bg))] border border-rose-500/20 rounded-lg px-3 py-2 text-xs text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none"
          />
        </div>
      ) : allergyText ? (
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-display text-[10px] tracking-wider uppercase text-rose-400">
              Allergy / Sensitivity
            </span>
            <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{allergyText}</p>
          </div>
          <button
            onClick={() => { setAlertDraft((client as any)?.medical_alerts || ''); setEditingAlert(true); }}
            className="p-1 rounded-full hover:bg-rose-500/20 transition-colors shrink-0"
          >
            <Pencil className="w-3 h-3 text-rose-400" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setAlertDraft(''); setEditingAlert(true); }}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-[hsl(var(--platform-border)/0.3)] hover:border-rose-500/30 hover:bg-rose-500/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
          <span className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]">Add Medical Alert</span>
        </button>
      )}

      {/* ─── Identity Card ─── */}
      <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
            <span className="font-display text-sm tracking-wide text-violet-300">
              {getInitials(displayName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))] truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {client?.phone && (
                <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">{client.phone}</span>
              )}
              {client?.email && (
                <span className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">{client.email}</span>
              )}
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={cn(DOCK_BADGE.base, DOCK_BADGE.visits, 'inline-flex items-center gap-1')}>
            <CalendarDays className="w-3 h-3" />
            {memory?.visitCount || completedVisits.length} visits
          </span>
          {firstVisitDate && (
            <span className={cn(DOCK_BADGE.base, DOCK_BADGE.neutral)}>
              Since {format(parseISO(firstVisitDate), 'MMM yyyy')}
            </span>
          )}
          {clvTier && (
            <span className={cn(DOCK_BADGE.base, 'inline-flex items-center gap-1',
              clvTier.tier === 'platinum' ? DOCK_BADGE.clvPlatinum :
              clvTier.tier === 'gold' ? DOCK_BADGE.clvGold :
              clvTier.tier === 'silver' ? DOCK_BADGE.clvSilver :
              DOCK_BADGE.clvBronze
            )}>
              <Star className="w-3 h-3" />
              {clvTier.label}
            </span>
          )}
          {memory?.isFirstVisit && (
            <span className={cn(DOCK_BADGE.base, DOCK_BADGE.firstVisit)}>
              First Visit
            </span>
          )}
          {noShowRate > 10 && (
            <span className={cn(DOCK_BADGE.base, DOCK_BADGE.noShowRisk, 'inline-flex items-center gap-1')}>
              <AlertCircle className="w-3 h-3" />
              {noShowRate}% No-Show
            </span>
          )}
          {/* Preferred Stylist */}
          {preferredStylistId && preferredStylist && (
            <span className={cn(DOCK_BADGE.base, DOCK_BADGE.preferred, 'inline-flex items-center gap-1')}>
              <Heart className="w-3 h-3" />
              Prefers: {preferredStylistName}
            </span>
          )}
        </div>
        {/* Different stylist warning */}
        {currentStylistDiffers && preferredStylist && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-400">
              Seeing different stylist today — prefers {preferredStylistName}
            </span>
          </div>
        )}
      </div>

      {/* ─── Last Formula ─── */}
      {formulaMemory && (formulaMemory as any).lines?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Last Formula
            </span>
            {formulaMemory.serviceName && (
              <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
                — {formulaMemory.serviceName}
              </span>
            )}
          </div>
          <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] overflow-hidden">
            {((formulaMemory as any).lines || []).map((line: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--platform-border)/0.1)] last:border-b-0"
              >
                <span className="text-xs text-[hsl(var(--platform-foreground))]">
                  {line.product_name}
                </span>
                <span className="text-xs font-display tracking-wide text-violet-400">
                  {line.weight_g}g
                </span>
              </div>
            ))}
            {formulaMemory.ratio && (
              <div className="px-3 py-2 bg-[hsl(var(--platform-bg-elevated))]">
                <span className="text-[10px] tracking-wide text-[hsl(var(--platform-foreground-muted))]">
                  Ratio: {formulaMemory.ratio}
                </span>
              </div>
            )}
            {formulaMemory.createdAt && (
              <div className="px-3 py-1.5 bg-[hsl(var(--platform-bg-elevated))]">
                <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
                  {formulaMemory.sourceLabel} · {format(parseISO(formulaMemory.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Formula History Timeline ─── */}
      {formulaHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Formula History
            </span>
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
              ({formulaHistory.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {displayFormulas.map((f) => {
              const lines = (f.formula_data || []).slice(0, 2);
              const diff = formulaDiffs.get(f.id);
              return (
                <div key={f.id}>
                  <div
                    className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--platform-foreground))]">
                        {f.service_name || 'Formula'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                          {f.created_at ? format(parseISO(f.created_at), 'MMM d, yyyy') : ''}
                        </span>
                        {activeBowlId && f.formula_data?.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cloneFormula.mutate({ bowlId: activeBowlId, formulaLines: f.formula_data });
                            }}
                            disabled={cloneFormula.isPending}
                            className="p-1 rounded-lg hover:bg-violet-500/15 transition-colors"
                            title="Clone into active bowl"
                          >
                            <Copy className="w-3 h-3 text-violet-400" />
                          </button>
                        )}
                        {!activeBowlId && f.formula_data?.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Start a mixing session first to clone formulas');
                            }}
                            className="p-1 rounded-lg opacity-40 cursor-not-allowed"
                            title="No active bowl"
                          >
                            <Copy className="w-3 h-3 text-[hsl(var(--platform-foreground-muted))]" />
                          </button>
                        )}
                      </div>
                    </div>
                    {lines.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {lines.map((line, i) => (
                          <span key={i} className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                            {line.product_name} {line.quantity ? `${line.quantity}${line.unit || 'g'}` : ''}
                          </span>
                        ))}
                        {(f.formula_data || []).length > 2 && (
                          <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
                            +{(f.formula_data || []).length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                    {f.staff_name && (
                      <span className="text-[9px] text-[hsl(var(--platform-foreground-muted)/0.4)] mt-0.5 block">
                        by {f.staff_name}
                      </span>
                    )}
                  </div>
                  {/* ─── Smart Formula Diff Badges ─── */}
                  {diff && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-2">
                      {diff.added.map(name => (
                        <span key={`add-${name}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-display tracking-wide uppercase text-emerald-400">
                          <Plus className="w-2 h-2" />{name}
                        </span>
                      ))}
                      {diff.removed.map(name => (
                        <span key={`rm-${name}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[8px] font-display tracking-wide uppercase text-rose-400">
                          <X className="w-2 h-2" />{name}
                        </span>
                      ))}
                      {diff.changed.map(c => (
                        <span key={`chg-${c.name}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] tracking-wide text-amber-400">
                          {c.newQty > c.oldQty ? <ArrowUp className="w-2 h-2" /> : <ArrowDown className="w-2 h-2" />}
                          {c.oldQty}{c.unit} → {c.newQty}{c.unit}
                        </span>
                      ))}
                      {diff.ratioShift && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[8px] tracking-wide text-violet-400">
                          <TrendingUp className="w-2 h-2" />
                          {diff.ratioShift.oldRatio} → {diff.ratioShift.newRatio}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {formulaHistory.length > 5 && (
            <button
              onClick={() => setShowAllFormulas(!showAllFormulas)}
              className="mt-2 text-[10px] font-display tracking-wide uppercase text-violet-400 hover:text-violet-300 transition-colors"
            >
              {showAllFormulas ? 'Show less' : `Show all ${formulaHistory.length}`}
            </button>
          )}
        </div>
      )}

      {/* ─── Processing Time Hint ─── */}
      {memory?.lastProcessingTimeMinutes && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]">
          <Clock className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
          <span className="text-xs text-[hsl(var(--platform-foreground))]">
            Avg. {memory.lastProcessingTimeMinutes} min processing
          </span>
        </div>
      )}

      {/* ─── Favorite Products (with repurchase reminders) ─── */}
      {affinities && affinities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Frequently Purchased
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {affinities.map((a) => (
              <span
                key={a.itemName}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] text-xs text-[hsl(var(--platform-foreground))]"
              >
                {a.itemName}
                <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">×{a.purchaseCount}</span>
                {a.mayNeedRestock && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-display tracking-wide uppercase text-amber-400">
                    Restock
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Suggested Retail (Cross-Sell) ─── */}
      {crossSellProducts && crossSellProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Suggested Retail
            </span>
            {conversionRate !== null && conversionRate !== undefined && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-display tracking-wide uppercase text-emerald-400">
                {conversionRate}% conversion
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {crossSellProducts.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl bg-violet-500/5 border border-violet-500/15 px-3 py-2.5"
              >
                <span className="text-xs text-[hsl(var(--platform-foreground))]">{p.name}</span>
                <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                  {p.buyerCount} similar clients
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos && photos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Transformations
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {photos.map((photo) => (
              <div key={photo.id} className="flex-shrink-0 space-y-1">
                <div className="flex gap-1">
                  {photo.before_url && (
                    <img
                      src={photo.before_url}
                      alt="Before"
                      className="w-16 h-16 rounded-lg object-cover border border-[hsl(var(--platform-border)/0.2)]"
                    />
                  )}
                  {photo.after_url && (
                    <img
                      src={photo.after_url}
                      alt="After"
                      className="w-16 h-16 rounded-lg object-cover border border-[hsl(var(--platform-border)/0.2)]"
                    />
                  )}
                </div>
                <div className="text-center">
                  <span className="text-[9px] text-[hsl(var(--platform-foreground-muted))]">
                    {photo.taken_at ? format(parseISO(photo.taken_at), 'MMM d') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Client Notes ─── */}
      {client?.notes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
              Profile Notes
            </span>
          </div>
          <p className="text-sm text-[hsl(var(--platform-foreground))] bg-[hsl(var(--platform-bg-card))] rounded-xl p-3 border border-[hsl(var(--platform-border)/0.2)] leading-relaxed">
            {client.notes}
          </p>
        </div>
      )}

      {/* ─── Visit History ─── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
          <span className="font-display text-xs tracking-wider uppercase text-[hsl(var(--platform-foreground-muted))]">
            Recent Visits
          </span>
        </div>
        {recentVisits.length > 0 ? (
          <div className="space-y-1.5">
            {recentVisits.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[hsl(var(--platform-foreground))] truncate">
                    {v.service_name || 'Service'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                      {v.appointment_date ? format(parseISO(v.appointment_date), 'MMM d, yyyy') : ''}
                    </span>
                    {v.stylist_name && (
                      <>
                        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.3)]">·</span>
                        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                          {v.stylist_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wide font-display ${
                  v.status === 'completed' ? 'text-emerald-400' :
                  v.status === 'cancelled' || v.status === 'no_show' ? 'text-rose-400' :
                  'text-[hsl(var(--platform-foreground-muted)/0.5)]'
                }`}>
                  {v.status || 'completed'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">No previous visits</p>
        )}
      </div>
    </div>
  );
}
