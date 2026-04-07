import { useRef, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, FileDown, Printer, Check, AlertTriangle, ChevronRight, Shield, Clock, Users, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onDownloadStaffReport?: () => void;
}

export function LevelRoadmapView({
  levels,
  promotionCriteria,
  retentionCriteria,
  orgName,
  onClose,
  onDownloadPDF,
  onDownloadStaffReport,
}: LevelRoadmapViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const getPromo = (dbId?: string) => promotionCriteria.find(c => c.stylist_level_id === dbId && c.is_active);
  const getRetention = (dbId?: string) => retentionCriteria.find(r => r.stylist_level_id === dbId && r.is_active);

  const configuredCount = levels.filter(l => l.isConfigured).length;
  const useAccordion = levels.length > 6;
  const showJumpNav = levels.length >= 10;

  // Default expanded: first card + any incomplete cards
  const defaultExpanded = useMemo(() => {
    const set = new Set<number>();
    set.add(0);
    levels.forEach((l, i) => { if (!l.isConfigured) set.add(i); });
    return set;
  }, [levels]);

  const [expandedCards, setExpandedCards] = useState<Set<number>>(defaultExpanded);

  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => setExpandedCards(new Set(levels.map((_, i) => i)));
  const collapseAll = () => setExpandedCards(new Set());

  const scrollToCard = (index: number) => {
    const el = document.getElementById(`level-card-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!expandedCards.has(index)) toggleCard(index);
    }
  };

  const fmtCurrency = (v: number) => v >= 1000 ? `$${parseFloat((v / 1000).toFixed(1))}K` : `$${v}`;

  const getCompensationSummary = (level: LevelInfo) => {
    const parts: string[] = [];
    if (level.serviceCommissionRate > 0) parts.push(`${level.serviceCommissionRate}% svc`);
    if (level.retailCommissionRate > 0) parts.push(`${level.retailCommissionRate}% retail`);
    if (level.hourlyWageEnabled && level.hourlyWage != null) parts.push(`$${level.hourlyWage}/hr`);
    return parts.length > 0 ? parts.join(' · ') : 'Not configured';
  };

  const handlePrint = () => {
    if (!contentRef.current) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Gather stylesheets from current document
    const styleSheets = Array.from(document.styleSheets);
    let cssText = '';
    styleSheets.forEach(sheet => {
      try {
        if (sheet.href) {
          cssText += `@import url("${sheet.href}");\n`;
        } else if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach(rule => {
            cssText += rule.cssText + '\n';
          });
        }
      } catch {
        if (sheet.href) cssText += `@import url("${sheet.href}");\n`;
      }
    });

    // Clone content and force-expand all accordion sections
    const clone = contentRef.current.cloneNode(true) as HTMLElement;

    // Force ALL hidden/collapsed content visible
    clone.querySelectorAll('.hidden').forEach(el => {
      (el as HTMLElement).classList.remove('hidden');
      (el as HTMLElement).style.display = 'block';
    });
    // Ensure accordion content marked with print:!block is visible
    clone.querySelectorAll('[class*="print\\:\\!block"]').forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });

    // Strip UI-only elements: jump nav, expand/collapse controls, accordion toggle buttons
    clone.querySelectorAll('[class*="print:hidden"], [class*="print\\:hidden"]').forEach(el => el.remove());

    // Remove overflow scroll from timeline
    const timelineWrap = clone.querySelector('[class*="overflow-x-auto"]');
    if (timelineWrap) {
      (timelineWrap as HTMLElement).style.overflow = 'visible';
      (timelineWrap as HTMLElement).style.flexWrap = 'wrap';
      (timelineWrap as HTMLElement).style.justifyContent = 'center';
    }

    // Remove gradient overlays from timeline
    clone.querySelectorAll('[class*="pointer-events-none"]').forEach(el => el.remove());

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Level Roadmap — ${orgName}</title>
<style>${cssText}</style>
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 14mm 22mm 14mm;
  }
  @media print {
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body { background: white; margin: 0; padding: 0; color: #1a1a1a; }

  /* Force card visibility and page-break handling */
  [data-level-card] {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 12px;
  }
  [data-level-card]:nth-child(4n+1):not(:first-child) {
    page-break-before: always;
  }

  /* Hide scrollbars and overflow artifacts */
  ::-webkit-scrollbar { display: none; }
  .overflow-x-auto { overflow: visible !important; flex-wrap: wrap !important; justify-content: center !important; }
  .overflow-auto { overflow: visible !important; }

  /* Print footer — running footer at bottom of each page */
  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8px;
    color: #b0b0b0;
    padding: 6px 0;
    font-family: sans-serif;
    letter-spacing: 0.03em;
  }
  /* Reserve space so content doesn't overlap the footer */
  body { margin-bottom: 20mm; }
</style>
</head><body>
<div style="max-width: 760px; margin: 0 auto; padding: 16px 0;">
${clone.innerHTML}
</div>
<div class="print-footer">
  Confidential — For internal use only · ${orgName}
</div>
</body></html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 400);
    };
  };

  return (
    <div data-roadmap-print className="fixed inset-0 z-[80] bg-white overflow-auto print:static print:z-auto">
      {/* Sticky action bar — hidden on print */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-wide uppercase text-neutral-900">Level Roadmap</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-sans font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Download
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 z-[90]">
                <DropdownMenuItem onClick={onDownloadPDF} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                  Level Roadmap
                </DropdownMenuItem>
                {onDownloadStaffReport && (
                  <DropdownMenuItem onClick={onDownloadStaffReport} className="gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    Staff Level Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-sans font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-xs font-sans"
            >
              Exit View
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
        <div className="mb-10 print:mb-6 relative">
          {levels.length > 8 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            </>
          )}
          <div className={cn(
            "flex items-center gap-0 py-6 print:flex-wrap print:justify-center",
            levels.length > 8
              ? "overflow-x-auto px-6 justify-start"
              : "justify-center"
          )}>
            {levels.map((level, i) => {
              const color = getLevelColor(i, levels.length);
              const isConfigured = level.isConfigured;
              const bgHexStops = ['#f5f5f4', '#e7e5e4', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b'];
              const ratio = levels.length <= 1 ? 1 : i / (levels.length - 1);
              const bgIdx = Math.round(ratio * (bgHexStops.length - 1));
              const bgHex = bgHexStops[Math.min(bgIdx, bgHexStops.length - 1)];

              const isCompact = levels.length > 10;
              const nodeSize = isCompact ? 'w-10 h-10' : 'w-14 h-14';
              const textSize = isCompact ? 'text-sm' : 'text-base';
              const dotSize = isCompact ? 'w-4 h-4' : 'w-5 h-5';
              const dotIconSize = isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5';
              const minW = isCompact ? 'min-w-[70px]' : 'min-w-[90px]';
              const maxW = isCompact ? 'max-w-[70px]' : 'max-w-[90px]';
              const labelSize = isCompact ? 'text-[9px]' : 'text-[11px]';

              return (
                <div key={level.slug} className="flex items-center flex-shrink-0">
                  <div className={cn("flex flex-col items-center", minW)}>
                    <div className="relative">
                      <div
                        className={cn(
                          nodeSize, 'rounded-full flex items-center justify-center font-display tracking-wide transition-all',
                          textSize,
                          isConfigured
                            ? 'ring-2 ring-offset-2 ring-emerald-400 shadow-md'
                            : 'ring-2 ring-offset-2 ring-neutral-200'
                        )}
                        style={{ background: bgHex }}
                      >
                        <span className="text-neutral-900 relative z-10">{i + 1}</span>
                      </div>
                      {isConfigured ? (
                        <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center", dotSize)}>
                          <Check className={cn(dotIconSize, "text-white")} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className={cn("absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center", dotSize)}>
                          <AlertTriangle className={cn(dotIconSize, "text-white")} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className={cn("mt-2 font-display tracking-wide uppercase text-neutral-600 text-center leading-tight", labelSize, maxW)}>
                      {level.label}
                    </span>
                    <span className={cn(
                      'mt-0.5 text-[9px] font-medium',
                      isConfigured ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {isConfigured ? 'Configured' : 'Setup Incomplete'}
                    </span>
                  </div>
                  {i < levels.length - 1 && (
                    <div className="flex items-center mx-0.5 flex-shrink-0">
                      <div className={cn(isCompact ? "w-3" : "w-6", "h-px bg-neutral-300")} />
                      <ChevronRight className={cn(isCompact ? "w-2.5 h-2.5" : "w-3 h-3", "text-neutral-300 -ml-0.5")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Jump-to-level quick nav */}
        {showJumpNav && (
          <div className="sticky top-[57px] z-[5] bg-white/90 backdrop-blur-sm border-b border-neutral-100 -mx-6 px-6 py-2 mb-6 print:hidden">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-display tracking-widest uppercase text-neutral-400 flex-shrink-0 mr-1">Jump to</span>
              {levels.map((level, i) => {
                const color = getLevelColor(i, levels.length);
                return (
                  <button
                    key={level.slug}
                    onClick={() => scrollToCard(i)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-sans font-medium border transition-colors",
                      level.isConfigured
                        ? "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    )}
                  >
                    <span className="font-display text-[10px]">{i + 1}</span>
                    <span className="hidden sm:inline truncate max-w-[80px]">{level.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 print:mb-6 print:grid-cols-3">
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

        {/* Expand/Collapse controls for accordion mode */}
        {useAccordion && (
          <div className="flex items-center gap-3 mb-4 print:hidden">
            <button onClick={expandAll} className="text-xs font-sans text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors">
              Expand all
            </button>
            <span className="text-neutral-300">·</span>
            <button onClick={collapseAll} className="text-xs font-sans text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors">
              Collapse all
            </button>
          </div>
        )}

        {/* Per-level detail cards */}
        <div className="space-y-6 print:space-y-4">
          {levels.map((level, i) => {
            const promo = getPromo(level.dbId);
            const retention = getRetention(level.dbId);
            const color = getLevelColor(i, levels.length);
            const isBase = i === 0;
            const isTop = i === levels.length - 1;
            const isExpanded = !useAccordion || expandedCards.has(i);

            // Gather enabled KPI requirements
            const kpis: { label: string; value: string }[] = [];
            if (isBase && retention) {
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

            // Print page break every 4th card
            const printBreak = i > 0 && i % 4 === 0;

            return (
              <div
                key={level.slug}
                id={`level-card-${i}`}
                className={cn(
                  'rounded-lg border overflow-hidden break-inside-avoid print:break-inside-avoid',
                  printBreak && 'print:mt-0 print:[page-break-before:always]',
                  level.isConfigured ? 'border-neutral-200' : 'border-amber-200 bg-amber-50/20'
                )}
                data-level-card
              >
                {/* Color accent bar */}
                <div className={cn('h-1.5', color.bg)} />

                {/* Level header — always visible */}
                {(() => {
                  const headerContent = (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-sm tracking-wide text-neutral-900 flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-display text-sm tracking-wide uppercase text-neutral-900 truncate">
                          {level.label}
                        </span>
                        {level.isConfigured ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 mr-0.5" /> Configured
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-2 py-0.5 flex-shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Setup Incomplete
                          </Badge>
                        )}
                        {isBase && (
                          <span className="text-[11px] text-neutral-400 font-sans hidden sm:inline">Entry Level — Retention Minimums</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-[11px] text-neutral-400 font-sans hidden sm:inline">
                          {getCompensationSummary(level)}
                        </span>
                        {useAccordion && (
                          <ChevronDown className={cn(
                            "w-4 h-4 text-neutral-400 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        )}
                      </div>
                    </>
                  );

                  return useAccordion ? (
                    <button
                      type="button"
                      onClick={() => toggleCard(i)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 transition-colors"
                    >
                      {headerContent}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-4">
                      {headerContent}
                    </div>
                  );
                })()}

                {/* Card content — always visible on print */}
                <div className={cn(
                  useAccordion && !isExpanded ? 'hidden' : 'block',
                  'print:!block'
                )}>
                  <div className="p-5 pt-0">

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
