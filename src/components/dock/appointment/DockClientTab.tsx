/**
 * DockClientTab — Client intelligence panel for the Dock appointment detail.
 * Surfaces identity, last formula, visit history, notes, and processing time.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, FlaskConical, Clock, FileText, CalendarDays, Loader2, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useInstantFormulaMemory } from '@/hooks/backroom/useInstantFormulaMemory';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { useClientMemory } from '@/hooks/useClientMemory';
import { calculateCLV, assignCLVTier, CLV_TIERS, type CLVTier } from '@/lib/clv-calculator';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import type { DockStaffSession } from '@/pages/Dock';

interface DockClientTabProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

export function DockClientTab({ appointment, staff }: DockClientTabProps) {
  const phorestClientId = appointment.phorest_client_id;
  const clientId = appointment.client_id;

  // Client profile
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId],
    queryFn: async () => {
      if (phorestClientId) {
        const { data } = await supabase
          .from('phorest_clients')
          .select('id, name, email, phone, notes, created_at')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data;
      }
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone, notes, created_at')
          .eq('id', clientId)
          .maybeSingle();
        if (data) {
          return { ...data, name: `${data.first_name || ''} ${data.last_name || ''}`.trim() };
        }
      }
      return null;
    },
    enabled: !!(phorestClientId || clientId),
  });

  // Visit history
  const { data: visits = [], isLoading: visitsLoading } = useClientVisitHistory(phorestClientId);

  // Formula memory
  const { data: formulaMemory, isLoading: formulaLoading } = useInstantFormulaMemory(
    phorestClientId || clientId,
    appointment.service_name,
  );

  // Client memory (processing time, visit count)
  const { data: memory } = useClientMemory(
    phorestClientId || clientId,
    appointment.service_name,
    staff.organizationId,
  );

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

  const isLoading = loadingClient || visitsLoading;

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

  return (
    <div className="px-5 py-4 space-y-5">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-display tracking-wide uppercase text-violet-400">
            <CalendarDays className="w-3 h-3" />
            {memory?.visitCount || completedVisits.length} visits
          </span>
          {firstVisitDate && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.2)] text-[10px] tracking-wide text-[hsl(var(--platform-foreground-muted))]">
              Since {format(parseISO(firstVisitDate), 'MMM yyyy')}
            </span>
          )}
          {clvTier && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-display tracking-wide uppercase ${
              clvTier.tier === 'platinum' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
              clvTier.tier === 'gold' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              clvTier.tier === 'silver' ? 'bg-slate-400/10 border-slate-400/20 text-slate-400' :
              'bg-orange-500/10 border-orange-500/20 text-orange-400'
            }`}>
              <Star className="w-3 h-3" />
              {clvTier.label}
            </span>
          )}
          {memory?.isFirstVisit && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-display tracking-wide uppercase text-emerald-400">
              First Visit
            </span>
          )}
        </div>
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

      {/* ─── Processing Time Hint ─── */}
      {memory?.lastProcessingTimeMinutes && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]">
          <Clock className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
          <span className="text-xs text-[hsl(var(--platform-foreground))]">
            Avg. {memory.lastProcessingTimeMinutes} min processing
          </span>
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
