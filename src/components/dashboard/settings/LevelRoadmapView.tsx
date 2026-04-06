import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, FileDown, Printer, Check, AlertTriangle, ArrowRight, Shield, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLevelColor } from '@/lib/level-colors';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import type { LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';

interface LevelInfo {
  label: string;
  slug: string;
  dbId?: string;
  index: number;
  isConfigured: boolean;
  serviceCommissionRate: number;
  retailCommissionRate: number;
  hourlyWageEnabled: boolean;
  hourlyWage: number | null;
}

interface LevelRoadmapViewProps {
  levels: LevelInfo[];
  promotionCriteria: LevelPromotionCriteria[];
  retentionCriteria: LevelRetentionCriteria[];
  orgName: string;
  orgLogoUrl?: string | null;
  onClose: () => void;
  onDownloadPDF: () => void;
}

export function LevelRoadmapView({
  levels,
  promotionCriteria,
  retentionCriteria,
  orgName,
  onClose,
  onDownloadPDF,
}: LevelRoadmapViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const getPromo = (dbId?: string) => promotionCriteria.find(c => c.stylist_level_id === dbId && c.is_active);
  const getRetention = (dbId?: string) => retentionCriteria.find(r => r.stylist_level_id === dbId && r.is_active);

  const configuredCount = levels.filter(l => l.isConfigured).length;

  const fmtCurrency = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  return (
    <div className="fixed inset-0 z-[80] bg-white overflow-auto print:static print:z-auto">
      {/* Sticky action bar — hidden on print */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-wide uppercase text-neutral-900">Level Roadmap</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPDF}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-sans font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-sans font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div ref={contentRef} className="max-w-4xl mx-auto px-6 py-10 print:py-6">
        {/* Org header */}
        <div className="text-center mb-10 print:mb-6">
          <h1 className="font-display text-2xl tracking-wider uppercase text-neutral-900 mb-1">
            {orgName}
          </h1>
          <p className="font-display text-xs tracking-widest uppercase text-neutral-400 mb-3">
            Level Graduation Roadmap
          </p>
          <p className="text-xs text-neutral-400">
            Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Career progression timeline */}
        <div className="mb-10 print:mb-6">
          <div className="flex items-center justify-center gap-0 overflow-x-auto py-4">
            {levels.map((level, i) => {
              const color = getLevelColor(i, levels.length);
              return (
                <div key={level.slug} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-display tracking-wide border-2',
                      color.bg,
                      color.text,
                      level.isConfigured ? 'border-emerald-400' : 'border-amber-300 border-dashed'
                    )}>
                      {i + 1}
                    </div>
                    <span className="mt-1.5 text-[11px] font-display tracking-wide uppercase text-neutral-600 text-center leading-tight max-w-[80px]">
                      {level.label}
                    </span>
                    {level.isConfigured ? (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] text-emerald-600 font-medium">
                        <Check className="w-2.5 h-2.5" /> Ready
                      </span>
                    ) : (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                        <AlertTriangle className="w-2.5 h-2.5" /> Incomplete
                      </span>
                    )}
                  </div>
                  {i < levels.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-neutral-300 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 print:mb-6">
          <div className="text-center p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
            <p className="font-display text-2xl tracking-wide text-neutral-900">{levels.length}</p>
            <p className="text-xs text-neutral-500 mt-1 font-sans">Total Levels</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
            <p className="font-display text-2xl tracking-wide text-neutral-900">{configuredCount}/{levels.length}</p>
            <p className="text-xs text-neutral-500 mt-1 font-sans">Configured</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
            <p className="font-display text-2xl tracking-wide text-neutral-900">
              {retentionCriteria.filter(r => r.is_active).length}
            </p>
            <p className="text-xs text-neutral-500 mt-1 font-sans">Retention Rules</p>
          </div>
        </div>

        {/* Per-level detail cards */}
        <div className="space-y-6 print:space-y-4">
          {levels.map((level, i) => {
            const promo = getPromo(level.dbId);
            const retention = getRetention(level.dbId);
            const color = getLevelColor(i, levels.length);
            const isBase = i === 0;
            const isTop = i === levels.length - 1;

            // Gather enabled KPI requirements
            const kpis: { label: string; value: string }[] = [];
            if (isBase && retention) {
              // Base level shows retention minimums
              if (retention.revenue_enabled && retention.revenue_minimum > 0) kpis.push({ label: 'Revenue', value: fmtCurrency(retention.revenue_minimum) });
              if (retention.retail_enabled && retention.retail_pct_minimum > 0) kpis.push({ label: 'Retail %', value: `${retention.retail_pct_minimum}%` });
              if (retention.rebooking_enabled && retention.rebooking_pct_minimum > 0) kpis.push({ label: 'Rebooking %', value: `${retention.rebooking_pct_minimum}%` });
              if (retention.avg_ticket_enabled && retention.avg_ticket_minimum > 0) kpis.push({ label: 'Avg Ticket', value: `$${retention.avg_ticket_minimum}` });
              if (retention.retention_rate_enabled && Number(retention.retention_rate_minimum) > 0) kpis.push({ label: 'Client Retention', value: `${retention.retention_rate_minimum}%` });
              if (retention.new_clients_enabled && Number(retention.new_clients_minimum) > 0) kpis.push({ label: 'New Clients', value: `${retention.new_clients_minimum}/mo` });
              if (retention.utilization_enabled && Number(retention.utilization_minimum) > 0) kpis.push({ label: 'Utilization', value: `${retention.utilization_minimum}%` });
              if (retention.rev_per_hour_enabled && Number(retention.rev_per_hour_minimum) > 0) kpis.push({ label: 'Rev/Hr', value: `$${retention.rev_per_hour_minimum}` });
            } else if (promo) {
              if (promo.revenue_enabled && promo.revenue_threshold > 0) kpis.push({ label: 'Revenue', value: fmtCurrency(promo.revenue_threshold) });
              if (promo.retail_enabled && promo.retail_pct_threshold > 0) kpis.push({ label: 'Retail %', value: `${promo.retail_pct_threshold}%` });
              if (promo.rebooking_enabled && promo.rebooking_pct_threshold > 0) kpis.push({ label: 'Rebooking %', value: `${promo.rebooking_pct_threshold}%` });
              if (promo.avg_ticket_enabled && promo.avg_ticket_threshold > 0) kpis.push({ label: 'Avg Ticket', value: `$${promo.avg_ticket_threshold}` });
              if (promo.retention_rate_enabled && Number(promo.retention_rate_threshold) > 0) kpis.push({ label: 'Client Retention', value: `${promo.retention_rate_threshold}%` });
              if (promo.new_clients_enabled && Number(promo.new_clients_threshold) > 0) kpis.push({ label: 'New Clients', value: `${promo.new_clients_threshold}/mo` });
              if (promo.utilization_enabled && Number(promo.utilization_threshold) > 0) kpis.push({ label: 'Utilization', value: `${promo.utilization_threshold}%` });
              if (promo.rev_per_hour_enabled && Number(promo.rev_per_hour_threshold) > 0) kpis.push({ label: 'Rev/Hr', value: `$${promo.rev_per_hour_threshold}` });
            }

            return (
              <div
                key={level.slug}
                className={cn(
                  'rounded-lg border overflow-hidden break-inside-avoid print:break-inside-avoid',
                  level.isConfigured ? 'border-neutral-200' : 'border-amber-200 bg-amber-50/20'
                )}
              >
                {/* Color accent bar */}
                <div className={cn('h-1.5', color.bg)} />

                <div className="p-5">
                  {/* Level header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base tracking-wide uppercase text-neutral-900">
                          Level {i + 1} — {level.label}
                        </h3>
                        {level.isConfigured ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5">
                            <Check className="w-2.5 h-2.5 mr-0.5" /> Configured
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-2 py-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Setup Incomplete
                          </Badge>
                        )}
                      </div>
                      {isBase && (
                        <p className="text-xs text-neutral-500 mt-1 font-sans">Entry Level — Retention Minimums</p>
                      )}
                    </div>
                  </div>

                  {!level.isConfigured && (
                    <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200/60 text-xs text-amber-700 font-sans">
                      This level has not been marked as configured. The data shown may be incomplete.
                    </div>
                  )}

                  {/* Commission rates */}
                  <div className="mb-4">
                    <p className="font-display text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Compensation</p>
                    <div className="flex flex-wrap gap-3">
                      {level.serviceCommissionRate > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-display tracking-wide uppercase">Service</span>
                          <span className="font-display text-neutral-900">{level.serviceCommissionRate}%</span>
                        </div>
                      )}
                      {level.retailCommissionRate > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-display tracking-wide uppercase">Retail</span>
                          <span className="font-display text-neutral-900">{level.retailCommissionRate}%</span>
                        </div>
                      )}
                      {level.hourlyWageEnabled && level.hourlyWage != null && (
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                          <span className="text-[10px] text-neutral-400 font-display tracking-wide uppercase">Hourly</span>
                          <span className="font-display text-neutral-900">${level.hourlyWage}/hr</span>
                        </div>
                      )}
                      {level.serviceCommissionRate === 0 && level.retailCommissionRate === 0 && !level.hourlyWageEnabled && (
                        <span className="text-xs text-neutral-400 italic font-sans">No compensation configured</span>
                      )}
                    </div>
                  </div>

                  {/* KPI Requirements */}
                  {kpis.length > 0 && (
                    <div className="mb-4">
                      <p className="font-display text-[10px] tracking-widest uppercase text-neutral-400 mb-2">
                        {isBase ? 'Retention Minimums' : 'Graduation Requirements'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {kpis.map(kpi => (
                          <div key={kpi.label} className="p-2.5 rounded-md bg-neutral-50 border border-neutral-100">
                            <p className="text-[10px] text-neutral-400 font-sans mb-0.5">{kpi.label}</p>
                            <p className="font-display text-sm tracking-wide text-neutral-900">{kpi.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {kpis.length === 0 && !isBase && (
                    <div className="mb-4 p-3 rounded-md bg-neutral-50 border border-neutral-100 text-xs text-neutral-400 italic font-sans">
                      No KPI requirements configured for this level.
                    </div>
                  )}

                  {/* Evaluation details */}
                  {!isBase && promo && (
                    <div className="flex flex-wrap gap-4 mb-4 text-xs text-neutral-600 font-sans">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{promo.evaluation_window_days}d eval window</span>
                      </div>
                      {promo.tenure_enabled && promo.tenure_days > 0 && !isTop && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-neutral-400" />
                          <span>{promo.tenure_days}d tenure required</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-neutral-400" />
                        <span>{promo.requires_manual_approval ? 'Manual approval' : 'Auto-promote'}</span>
                      </div>
                    </div>
                  )}

                  {/* Retention policy */}
                  {retention?.retention_enabled && (
                    <div>
                      <p className="font-display text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Retention Policy</p>
                      <div className="flex flex-wrap gap-4 text-xs text-neutral-600 font-sans">
                        <span>{retention.evaluation_window_days}d evaluation window</span>
                        <span>{retention.grace_period_days}d grace period</span>
                        <span className={cn(
                          retention.action_type === 'demotion_eligible' ? 'text-red-600' : 'text-amber-600'
                        )}>
                          {retention.action_type === 'demotion_eligible' ? 'Demotion eligible' : 'Coaching flag'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-neutral-200 text-center print:mt-8">
          <p className="text-[10px] text-neutral-400 font-sans tracking-wide">
            Confidential — For internal use only · {orgName}
          </p>
        </div>
      </div>
    </div>
  );
}
