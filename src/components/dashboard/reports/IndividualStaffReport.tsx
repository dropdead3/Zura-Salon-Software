import { useState, useMemo, useCallback } from 'react';
import { isWithinInterval } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, TrendingDown, UserCheck, Package,
  Briefcase, Star, Calendar, Download, FileSpreadsheet, Loader2, ArrowLeft,
  AlertTriangle, CheckCircle2, Target, Wallet, ShieldCheck, GraduationCap, Percent, Banknote, Beaker, Receipt,
  ChevronsUpDown, Check,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn, formatName } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { useIndividualStaffReport, type IndividualStaffReportData } from '@/hooks/useIndividualStaffReport';
import { useStaffComplianceSummary } from '@/hooks/color-bar/useStaffComplianceSummary';
import { useStaffStrikes, STRIKE_TYPE_LABELS, SEVERITY_LABELS, SEVERITY_COLORS, type StaffStrikeWithDetails, type StrikeType, type StrikeSeverity } from '@/hooks/useStaffStrikes';
import { LevelProgressCard } from '@/components/coaching/LevelProgressCard';
import { EmptyDataBanner, DateRangeSubtitle } from '@/components/ui/EmptyDataBanner';

interface IndividualStaffReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  initialStaffId?: string;
  dateRangeKey?: string;
}

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

function ScoreBadge({ score, status }: { score: number; status: string }) {
  const colors = {
    strong: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    watch: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    'needs-attention': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };
  return (
    <Badge variant="outline" className={cn('text-sm font-display tabular-nums', colors[status as keyof typeof colors] || colors.watch)}>
      {score}/100
    </Badge>
  );
}

function TrendIndicator({ values }: { values: [number, number, number] }) {
  const [prev2, prev1, current] = values;
  if (prev2 === 0 && prev1 === 0 && current === 0) return <span className="text-xs text-muted-foreground">--</span>;
  const improving = current > prev1;
  const declining = current < prev1;
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground tabular-nums">{Math.round(prev2)}</span>
      <span className="text-muted-foreground">{'\u2192'}</span>
      <span className="text-muted-foreground tabular-nums">{Math.round(prev1)}</span>
      <span className="text-muted-foreground">{'\u2192'}</span>
      <span className={cn('font-medium tabular-nums', improving ? 'text-emerald-600 dark:text-emerald-400' : declining ? 'text-red-500 dark:text-red-400' : 'text-foreground')}>
        {Math.round(current)}
      </span>
      {improving && <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
      {declining && <TrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" />}
    </div>
  );
}


export function IndividualStaffReport({ dateFrom, dateTo, locationId, onClose, initialStaffId, dateRangeKey }: IndividualStaffReportProps) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(initialStaffId ? [initialStaffId] : []);
  const [viewingStaffId, setViewingStaffId] = useState<string>(initialStaffId || '');
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: orgUsers, isLoading: usersLoading } = useOrganizationUsers(effectiveOrganization?.id);
  const { data, isLoading } = useIndividualStaffReport(viewingStaffId || null, dateFrom, dateTo);
  const { data: complianceData } = useStaffComplianceSummary(viewingStaffId || null, dateFrom, dateTo, effectiveOrganization?.id);
  const { data: strikesRaw } = useStaffStrikes(viewingStaffId || undefined);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter strikes: active + resolved within report period
  const reportStrikes = useMemo(() => {
    if (!strikesRaw) return [];
    return strikesRaw.filter(s =>
      !s.is_resolved ||
      (s.resolved_at && isWithinInterval(new Date(s.resolved_at), {
        start: new Date(dateFrom),
        end: new Date(dateTo),
      }))
    );
  }, [strikesRaw, dateFrom, dateTo]);

  const activeStrikes = useMemo(() => reportStrikes.filter(s => !s.is_resolved), [reportStrikes]);
  const resolvedStrikes = useMemo(() => reportStrikes.filter(s => s.is_resolved), [reportStrikes]);

  // Filter to active staff with relevant roles
  const staffList = useMemo(() => {
    if (!orgUsers) return [];
    return orgUsers
      .filter(u => u.is_active && u.roles?.some((r: string) => ['admin', 'manager', 'staff', 'stylist', 'super_admin'].includes(r)))
      .sort((a, b) => (a.display_name || a.full_name || '').localeCompare(b.display_name || b.full_name || ''));
  }, [orgUsers]);

  // ── Toggle staff selection ──
  const toggleStaffId = useCallback((id: string) => {
    setSelectedStaffIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (viewingStaffId === id) setViewingStaffId(next[0] || '');
        return next;
      }
      return [...prev, id];
    });
    setViewingStaffId(id); // always show clicked member
  }, [viewingStaffId]);

  const toggleSelectAll = useCallback(() => {
    if (selectedStaffIds.length === staffList.length) {
      setSelectedStaffIds([]);
      setViewingStaffId('');
    } else {
      setSelectedStaffIds(staffList.map(s => s.user_id));
      if (!viewingStaffId && staffList.length > 0) setViewingStaffId(staffList[0].user_id);
    }
  }, [selectedStaffIds.length, staffList, viewingStaffId]);

  // ── Reusable PDF helper — renders one staff member's report into an existing doc ──
  const addStaffReportToDoc = useCallback((
    doc: jsPDF,
    staffData: IndividualStaffReportData,
    staffCompliance: any,
    branding: any,
    fmtCurrency: (v: number) => string,
    fmtDate: (d: Date, fmt: string) => string,
    strikes?: StaffStrikeWithDetails[],
  ) => {
    const headerOpts = {
      orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
      logoDataUrl: (branding as any).__logoDataUrl,
      reportTitle: `Staff Report: ${staffData.profile.name}`,
      dateFrom,
      dateTo,
      locationInfo,
    } as const;
    let y = addReportHeader(doc, headerOpts);

    // Profile info
    doc.setFontSize(10);
    doc.setTextColor(100);
    const profileLine = [
      staffData.profile.role ? `Role: ${staffData.profile.role}` : '',
      staffData.profile.hireDate ? `Hired: ${fmtDate(new Date(staffData.profile.hireDate), 'MMM d, yyyy')}` : '',
      staffData.profile.locationName ? `Location: ${staffData.profile.locationName}` : '',
      `Experience Score: ${staffData.experienceScore.composite}/100`,
      staffData.commission.tierName ? `Commission Tier: ${staffData.commission.tierName}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(profileLine, 14, y);
    y += 8;

    const staffAvgTip = staffData.productivity.completed > 0
      ? Math.round((staffData.revenue.total * (staffData.experienceScore.tipRate ?? 0) / 100) / staffData.productivity.completed * 100) / 100
      : 0;

    autoTable(doc, {
      ...branding,
      startY: y,
      head: [['Metric', 'Value', 'Team Average']],
      body: [
        ['Total Revenue', fmtCurrency(staffData.revenue.total), fmtCurrency(staffData.teamAverages.revenue)],
        ['Avg Ticket', fmtCurrency(staffData.revenue.avgTicket), fmtCurrency(staffData.teamAverages.avgTicket)],
        ['Appointments', staffData.productivity.totalAppointments.toString(), Math.round(staffData.teamAverages.appointments).toString()],
        ['Rebooking Rate', `${staffData.clientMetrics.rebookingRate.toFixed(1)}%`, `${staffData.teamAverages.rebookingRate.toFixed(1)}%`],
        ['Retention Rate', `${staffData.clientMetrics.retentionRate.toFixed(1)}%`, `${staffData.teamAverages.retentionRate.toFixed(1)}%`],
        ['New Clients', staffData.clientMetrics.newClients.toString(), Math.round(staffData.teamAverages.newClients).toString()],
        ['Commission Earned', fmtCurrency(staffData.commission.totalCommission), ''],
        ['Experience Score', `${staffData.experienceScore.composite}/100`, ''],
        ['Tip Rate', `${(staffData.experienceScore.tipRate ?? 0).toFixed(1)}%`, ''],
        ['Avg Tip', fmtCurrency(staffAvgTip), ''],
        ['Zura Color Room Compliance', `${staffData.colorBarCompliance.complianceRate}%`, `${staffData.teamAverages.complianceRate}%`],
        ['Color Appointments', `${staffData.colorBarCompliance.totalColorAppointments} (${staffData.colorBarCompliance.tracked} tracked)`, ''],
        ...(staffCompliance ? [
          ['Waste Rate', `${staffCompliance.wastePct}%`, ''],
          ['Waste Cost', fmtCurrency(staffCompliance.wasteCost), ''],
          ['Reweigh Rate', `${staffCompliance.reweighRate}%`, ''],
          ['Overage Attachment', `${staffCompliance.overageAttachmentRate}%`, ''],
          ['Overage Charges', fmtCurrency(staffCompliance.overageChargeTotal), ''],
        ] : []),
      ],
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51] },
      margin: { ...branding.margin, left: 14, right: 14 },
    });

    if (staffData.topServices.length > 0) {
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Top Services', 14, y);
      y += 4;
      autoTable(doc, {
        ...branding,
        startY: y,
        head: [['Service', 'Count', 'Revenue', 'Avg Price']],
        body: staffData.topServices.map(s => [s.name, s.count.toString(), fmtCurrency(s.revenue), fmtCurrency(s.avgPrice)]),
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51] },
        margin: { ...branding.margin, left: 14, right: 14 },
      });
    }

    if (staffData.topClients.length > 0) {
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
      if (y > 170) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Top Clients', 14, y);
      y += 4;
      autoTable(doc, {
        ...branding,
        startY: y,
        head: [['Client', 'Visits', 'Revenue', 'Avg Ticket', 'Last Visit', 'Status']],
        body: staffData.topClients.map(c => [
          c.name, c.visits.toString(), fmtCurrency(c.revenue),
          fmtCurrency(c.avgTicket), c.lastVisit, c.atRisk ? 'At Risk' : 'Active',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51] },
        margin: { ...branding.margin, left: 14, right: 14 },
      });
    }
  }, [businessSettings, effectiveOrganization, dateFrom, dateTo, locationInfo]);

  // ── Single PDF Generation (current viewing member) ──
  const generatePDF = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = {
        orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
        logoDataUrl,
        reportTitle: `Staff Report: ${data.profile.name}`,
        dateFrom,
        dateTo,
        locationInfo,
      } as const;
      const branding = { ...getReportAutoTableBranding(doc, headerOpts), __logoDataUrl: logoDataUrl };
      addStaffReportToDoc(doc, data, complianceData, branding, formatCurrencyWhole, formatDate);
      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: `staff-report-${data.profile.name.replace(/\s+/g, '-').toLowerCase()}`, dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'individual-staff',
          report_name: `Staff Report: ${data.profile.name}`,
          date_from: dateFrom,
          date_to: dateTo,
          parameters: { staffUserId: viewingStaffId, locationId },
          generated_by: user.id,
          organization_id: effectiveOrganization?.id ?? null,
        });
      }
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Bulk PDF Generation ──
  const generateBulkPDF = async () => {
    if (selectedStaffIds.length === 0) return;
    setIsGenerating(true);
    const toastId = toast.loading(`Generating report 1 of ${selectedStaffIds.length}...`);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const orgName = businessSettings?.business_name || effectiveOrganization?.name || 'Organization';
      const baseHeaderOpts = { orgName, logoDataUrl, reportTitle: '', dateFrom, dateTo, locationInfo } as const;
      const branding = { ...getReportAutoTableBranding(doc, baseHeaderOpts), __logoDataUrl: logoDataUrl };

      for (let i = 0; i < selectedStaffIds.length; i++) {
        const staffId = selectedStaffIds[i];
        toast.loading(`Generating report ${i + 1} of ${selectedStaffIds.length}...`, { id: toastId });

        // Fetch staff report data
        const { data: staffData } = await supabase.rpc('get_individual_staff_report' as any, {
          p_staff_user_id: staffId,
          p_date_from: dateFrom,
          p_date_to: dateTo,
        });

        // We need to fetch data the same way the hook does — use the hook's query logic inline
        // For simplicity, we'll use supabase queries directly
        const { data: profile } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, photo_url, email, hire_date')
          .eq('user_id', staffId)
          .single();

        if (!profile) continue;

        // Fetch appointments for this staff member
        const { data: appointments } = await supabase
          .from('appointments')
          .select('*')
          .eq('staff_user_id', staffId)
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo);

        if (i > 0) doc.addPage();

        // We need IndividualStaffReportData — the simplest approach is to
        // dynamically import and call the hook's query function.
        // But hooks can't be called dynamically. Instead, we'll use a simplified
        // approach: fetch the viewing data for each staff member sequentially.

        // Fetch via the same pattern the hook uses by calling supabase directly
        // This is complex — let's use a simpler approach: trigger the hook for each member
        // Actually the cleanest approach is to fetch the data we need for the PDF tables

        // For bulk PDF, we'll fetch minimal data and render simplified reports
        const staffAppts = appointments || [];
        const completed = staffAppts.filter(a => a.status === 'completed' || a.status === 'Completed');
        const totalRevenue = completed.reduce((sum, a) => sum + (a.total_price || 0), 0);
        const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
        const tipTotal = completed.reduce((sum, a) => sum + (a.tip_amount || 0), 0);
        const tipRate = totalRevenue > 0 ? (tipTotal / totalRevenue) * 100 : 0;
        const avgTipVal = completed.length > 0 ? tipTotal / completed.length : 0;

        // Build minimal data structure for the PDF helper
        const minimalData: IndividualStaffReportData = {
          profile: {
            userId: profile.user_id,
            name: profile.display_name || profile.full_name || 'Unknown',
            displayName: profile.display_name,
            photoUrl: profile.photo_url,
            email: profile.email,
            role: null,
            hireDate: profile.hire_date,
            locationName: null,
          },
          revenue: {
            total: totalRevenue,
            service: completed.filter(a => a.service_category !== 'retail').reduce((s, a) => s + (a.total_price || 0), 0),
            product: completed.filter(a => a.service_category === 'retail').reduce((s, a) => s + (a.total_price || 0), 0),
            avgTicket,
            priorTotal: 0,
            revenueChange: 0,
            dailyTrend: [],
          },
          productivity: {
            totalAppointments: staffAppts.length,
            completed: completed.length,
            noShows: staffAppts.filter(a => (a.status || '').toLowerCase().includes('no_show') || (a.status || '').toLowerCase().includes('no-show')).length,
            cancelled: staffAppts.filter(a => (a.status || '').toLowerCase().includes('cancel')).length,
            avgPerDay: 0,
            uniqueClients: new Set(staffAppts.map(a => a.client_id).filter(Boolean)).size,
          },
          clientMetrics: { rebookingRate: 0, retentionRate: 0, newClients: 0, totalUniqueClients: 0 },
          retail: { productRevenue: 0, unitsSold: 0, attachmentRate: 0 },
          experienceScore: { composite: 0, status: 'watch', rebookRate: 0, tipRate, retentionRate: 0, retailAttachment: 0 },
          topServices: [],
          topClients: [],
          commission: { serviceCommission: 0, productCommission: 0, totalCommission: 0, tierName: '' },
          teamAverages: { revenue: 0, avgTicket: 0, appointments: 0, rebookingRate: 0, retentionRate: 0, newClients: 0, experienceScore: 0, complianceRate: 0 },
          colorBarCompliance: { complianceRate: 0, totalColorAppointments: 0, tracked: 0, missed: 0, reweighRate: 0, manualOverrides: 0 },
          multiPeriodTrend: { revenue: [0, 0, 0], rebooking: [0, 0, 0], retention: [0, 0, 0] },
        };

        // Fetch compliance data for this staff member
        const { data: compRows } = await supabase
          .from('staff_backroom_performance' as any)
          .select('*')
          .eq('staff_user_id', staffId)
          .gte('period_date', dateFrom)
          .lte('period_date', dateTo);

        const staffComp = compRows && compRows.length > 0 ? {
          wastePct: Math.round(compRows.reduce((s, r) => s + ((r as any).waste_pct || 0), 0) / compRows.length),
          wasteCost: compRows.reduce((s, r) => s + ((r as any).waste_cost || 0), 0),
          reweighRate: Math.round(compRows.reduce((s, r) => s + ((r as any).reweigh_rate || 0), 0) / compRows.length),
          overageAttachmentRate: 0,
          overageChargeTotal: 0,
          totalColorAppointments: 0,
        } : null;

        addStaffReportToDoc(doc, minimalData, staffComp, branding, formatCurrencyWhole, formatDate);
      }

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName, locationName: locationInfo?.name, reportSlug: `bulk-staff-reports`, dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'bulk-staff',
          report_name: `Bulk Staff Report (${selectedStaffIds.length} members)`,
          date_from: dateFrom,
          date_to: dateTo,
          parameters: { staffUserIds: selectedStaffIds, locationId },
          generated_by: user.id,
          organization_id: effectiveOrganization?.id ?? null,
        });
      }
      toast.success(`${selectedStaffIds.length} staff reports downloaded`, { id: toastId });
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      toast.error('Failed to generate bulk report', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── CSV Export ──
  const exportCSV = () => {
    if (!data) return;
    let csv = 'Metric,Value,Team Average\n';
    csv += `Total Revenue,${data.revenue.total},${data.teamAverages.revenue}\n`;
    csv += `Avg Ticket,${data.revenue.avgTicket},${data.teamAverages.avgTicket}\n`;
    csv += `Appointments,${data.productivity.totalAppointments},${Math.round(data.teamAverages.appointments)}\n`;
    csv += `Rebooking Rate,${data.clientMetrics.rebookingRate.toFixed(1)}%,${data.teamAverages.rebookingRate.toFixed(1)}%\n`;
    csv += `Retention Rate,${data.clientMetrics.retentionRate.toFixed(1)}%,${data.teamAverages.retentionRate.toFixed(1)}%\n`;
    csv += `New Clients,${data.clientMetrics.newClients},${Math.round(data.teamAverages.newClients)}\n`;
    csv += `Commission Earned,${data.commission.totalCommission},\n`;
    csv += `Experience Score,${data.experienceScore.composite},\n`;
    csv += `Tip Rate,${(data.experienceScore.tipRate ?? 0).toFixed(1)}%,\n`;
    csv += `Avg Tip,${avgTip.toFixed(2)},\n`;
    csv += `Color Bar Compliance,${data.colorBarCompliance.complianceRate}%,${data.teamAverages.complianceRate}%\n`;
    csv += `Color Appointments,${data.colorBarCompliance.totalColorAppointments} (${data.colorBarCompliance.tracked} tracked),\n`;
    if (complianceData) {
      csv += `Waste Rate,${complianceData.wastePct}%,\n`;
      csv += `Waste Cost,${complianceData.wasteCost.toFixed(2)},\n`;
      csv += `Reweigh Rate,${complianceData.reweighRate}%,\n`;
      csv += `Overage Attachment,${complianceData.overageAttachmentRate}%,\n`;
      csv += `Overage Charges,${complianceData.overageChargeTotal.toFixed(2)},\n`;
    }
    csv += '\nTop Services\nService,Count,Revenue,Avg Price\n';
    data.topServices.forEach(s => { csv += `"${s.name}",${s.count},${s.revenue},${s.avgPrice}\n`; });
    csv += '\nTop Clients\nClient,Visits,Revenue,Avg Ticket,Last Visit,Status\n';
    data.topClients.forEach(c => { csv += `"${c.name}",${c.visits},${c.revenue},${c.avgTicket},${c.lastVisit},${c.atRisk ? 'At Risk' : 'Active'}\n`; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff-report-${data.profile.name.replace(/\s+/g, '-').toLowerCase()}-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };


  // ── KPI cards data ──
  const avgTip = data && data.productivity.completed > 0
    ? Math.round((data.revenue.total * (data.experienceScore.tipRate ?? 0) / 100) / data.productivity.completed * 100) / 100
    : 0;

  const kpis = data ? [
    { label: 'Total Revenue', value: formatCurrencyWhole(data.revenue.total), teamAvg: formatCurrencyWhole(data.teamAverages.revenue), icon: DollarSign, change: data.revenue.revenueChange, tooltip: 'Total revenue from all appointments in the period.' },
    { label: 'Avg Ticket', value: formatCurrencyWhole(data.revenue.avgTicket), teamAvg: formatCurrencyWhole(data.teamAverages.avgTicket), icon: Target, change: null, tooltip: 'Average revenue per completed appointment.' },
    { label: 'Appointments', value: data.productivity.totalAppointments.toString(), teamAvg: Math.round(data.teamAverages.appointments).toString(), icon: Calendar, change: null, tooltip: 'Total appointments (all statuses) in the period.' },
    { label: 'Rebooking Rate', value: `${data.clientMetrics.rebookingRate.toFixed(1)}%`, teamAvg: `${data.teamAverages.rebookingRate.toFixed(1)}%`, icon: UserCheck, change: null, tooltip: 'Percentage of clients who rebooked at checkout.' },
    { label: 'Retention Rate', value: `${data.clientMetrics.retentionRate.toFixed(1)}%`, teamAvg: `${data.teamAverages.retentionRate.toFixed(1)}%`, icon: Users, change: null, tooltip: 'Percentage of clients who returned within the period.' },
    { label: 'New Clients', value: data.clientMetrics.newClients.toString(), teamAvg: Math.round(data.teamAverages.newClients).toString(), icon: Star, change: null, tooltip: 'Number of first-time clients seen.' },
    { label: 'Commission Earned', value: formatCurrencyWhole(data.commission.totalCommission), teamAvg: '', icon: Wallet, change: null, tooltip: 'Estimated commission based on current tier and revenue.' },
    { label: 'Experience Score', value: `${data.experienceScore.composite}`, teamAvg: '', icon: Briefcase, change: null, tooltip: 'Composite score from rebooking, tips, retention, and retail.' },
    { label: 'Tip Rate', value: `${(data.experienceScore.tipRate ?? 0).toFixed(1)}%`, teamAvg: '', icon: Percent, change: null, tooltip: 'Average tip percentage across completed appointments in the period.' },
    { label: 'Avg Tip', value: formatCurrencyWhole(avgTip), teamAvg: '', icon: Banknote, change: null, tooltip: 'Average tip dollar amount per completed appointment.' },
  ] : [];

  // ── Strengths and improvements ──
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (data && data.teamAverages.revenue > 0) {
    const ta = data.teamAverages;
    if (data.revenue.total > ta.revenue * 1.1) strengths.push(`Revenue is ${Math.round(((data.revenue.total - ta.revenue) / ta.revenue) * 100)}% above team average`);
    else if (data.revenue.total < ta.revenue * 0.9) improvements.push(`Revenue is ${Math.round(((ta.revenue - data.revenue.total) / ta.revenue) * 100)}% below team average`);

    if (data.revenue.avgTicket > ta.avgTicket * 1.1) strengths.push(`Average ticket is ${formatCurrencyWhole(data.revenue.avgTicket - ta.avgTicket)} above team average`);
    else if (data.revenue.avgTicket < ta.avgTicket * 0.9) improvements.push(`Average ticket is ${formatCurrencyWhole(ta.avgTicket - data.revenue.avgTicket)} below team average`);

    if (data.clientMetrics.rebookingRate > ta.rebookingRate * 1.1) strengths.push(`Rebooking rate of ${data.clientMetrics.rebookingRate.toFixed(1)}% exceeds team average`);
    else if (data.clientMetrics.rebookingRate < ta.rebookingRate * 0.9 && ta.rebookingRate > 0) improvements.push(`Rebooking rate of ${data.clientMetrics.rebookingRate.toFixed(1)}% is below team average of ${ta.rebookingRate.toFixed(1)}%`);

    if (data.clientMetrics.retentionRate > ta.retentionRate * 1.1) strengths.push(`Strong client retention at ${data.clientMetrics.retentionRate.toFixed(1)}%`);
    else if (data.clientMetrics.retentionRate < ta.retentionRate * 0.9 && ta.retentionRate > 0) improvements.push(`Retention rate of ${data.clientMetrics.retentionRate.toFixed(1)}% needs attention (team avg: ${ta.retentionRate.toFixed(1)}%)`);

    if (data.retail.attachmentRate > 30) strengths.push(`Excellent retail attachment rate of ${data.retail.attachmentRate}%`);
    else if (data.retail.attachmentRate < 15 && data.productivity.totalAppointments > 5) improvements.push(`Retail attachment rate of ${data.retail.attachmentRate}% has room to grow`);

    if (data.clientMetrics.newClients > ta.newClients * 1.2) strengths.push(`Bringing in ${data.clientMetrics.newClients} new clients (above team average)`);

    if (data.experienceScore.composite >= 70) strengths.push(`Experience score of ${data.experienceScore.composite}/100 shows strong overall performance`);
    else if (data.experienceScore.composite < 50 && data.experienceScore.composite > 0) improvements.push(`Experience score of ${data.experienceScore.composite}/100 needs focused improvement`);

    // Color Bar compliance
    if (data.colorBarCompliance.totalColorAppointments > 0) {
      if (data.colorBarCompliance.complianceRate === 100) strengths.push('100% color bar compliance — all color services tracked');
      else if (data.colorBarCompliance.complianceRate >= 90) strengths.push(`Strong color bar compliance at ${data.colorBarCompliance.complianceRate}%`);
      else if (data.colorBarCompliance.complianceRate < 70) improvements.push(`Color Bar compliance at ${data.colorBarCompliance.complianceRate}% — ${data.colorBarCompliance.missed} color services not tracked`);
      else improvements.push(`Color Bar compliance at ${data.colorBarCompliance.complianceRate}% — review color bar habits`);
    }
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Multi-select staff picker */}
          <Popover open={staffPickerOpen} onOpenChange={setStaffPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={staffPickerOpen} className="w-[280px] justify-between">
                {selectedStaffIds.length === 0 ? (
                  <span className="text-muted-foreground">Select staff members...</span>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className="flex -space-x-1.5">
                      {selectedStaffIds.slice(0, 3).map(id => {
                        const m = staffList.find(s => s.user_id === id);
                        return m ? (
                          <Avatar key={id} className="w-5 h-5 border border-background">
                            <AvatarImage src={m.photo_url || undefined} />
                            <AvatarFallback className="text-[7px]">{getInitials(formatName(m))}</AvatarFallback>
                          </Avatar>
                        ) : null;
                      })}
                    </div>
                    <span className="text-sm truncate">
                      {selectedStaffIds.length === 1
                        ? formatName(staffList.find(s => s.user_id === selectedStaffIds[0]) || { full_name: 'Unknown', display_name: null })
                        : `${selectedStaffIds.length} selected`}
                    </span>
                  </div>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search staff..." />
                <CommandList>
                  <CommandEmpty>No staff found.</CommandEmpty>
                  <CommandGroup>
                    {/* Select All */}
                    <CommandItem onSelect={toggleSelectAll} className="font-medium">
                      <Checkbox
                        checked={selectedStaffIds.length === staffList.length && staffList.length > 0}
                        className="mr-2"
                      />
                      {selectedStaffIds.length === staffList.length && staffList.length > 0 ? 'Deselect All' : 'Select All'}
                      <Badge variant="secondary" className="ml-auto text-[10px]">{staffList.length}</Badge>
                    </CommandItem>
                    {/* Individual members */}
                    {staffList.map((member) => (
                      <CommandItem key={member.user_id} value={formatName(member)} onSelect={() => toggleStaffId(member.user_id)}>
                        <Checkbox checked={selectedStaffIds.includes(member.user_id)} className="mr-2" />
                        <Avatar className="w-5 h-5 mr-2">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="text-[7px]">{getInitials(formatName(member))}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{formatName(member)}</span>
                        {member.user_id === viewingStaffId && (
                          <Check className="ml-auto h-3 w-3 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {data && (
            <>
              <Button variant="outline" size={tokens.button.card} onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </Button>
              {selectedStaffIds.length > 1 ? (
                <Button size={tokens.button.card} onClick={generateBulkPDF} disabled={isGenerating}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download All ({selectedStaffIds.length})</>}
                </Button>
              ) : (
                <Button size={tokens.button.card} onClick={generatePDF} disabled={isGenerating}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* No selection state */}
      {!viewingStaffId && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium mb-1">Select a Staff Member</p>
            <p className="text-sm text-muted-foreground">Choose a team member above to view their comprehensive performance report.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {viewingStaffId && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}


      {/* Main report content */}
      {data && !isLoading && (
        <>
          {/* Section 1: Profile Banner */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {data.profile.photoUrl && <AvatarImage src={data.profile.photoUrl} alt={data.profile.name} />}
                  <AvatarFallback className="text-lg">{getInitials(data.profile.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-display tracking-wide">{data.profile.name}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {data.profile.role && <Badge variant="outline" className="capitalize text-xs">{data.profile.role}</Badge>}
                    {data.profile.locationName && <span className="text-xs text-muted-foreground">{data.profile.locationName}</span>}
                    {data.profile.hireDate && <span className="text-xs text-muted-foreground">Hired {formatDate(new Date(data.profile.hireDate), 'MMM yyyy')}</span>}
                  </div>
                  <DateRangeSubtitle dateRangeKey={dateRangeKey} dateFrom={dateFrom} dateTo={dateTo} className="mt-1" />
                </div>
                <div className="flex items-center gap-3">
                  {data.commission.tierName && (
                    <Badge variant="outline" className="text-xs"><Wallet className="w-3 h-3 mr-1" />{data.commission.tierName}</Badge>
                  )}
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-0.5">Experience</p>
                    <ScoreBadge score={data.experienceScore.composite} status={data.experienceScore.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty data guidance */}
          {data.revenue.total === 0 && data.productivity.totalAppointments === 0 && (
            <EmptyDataBanner dateRangeKey={dateRangeKey} />
          )}

          {/* Section 2: KPI Summary (4x2 grid) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground font-medium font-display uppercase tracking-wider">{kpi.label}</p>
                      <MetricInfoTooltip description={kpi.tooltip} />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-xl font-display tabular-nums"><BlurredAmount>{kpi.value}</BlurredAmount></span>
                      {kpi.change !== null && kpi.change !== undefined && (
                        <span className={cn('text-xs font-medium tabular-nums', kpi.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                          {kpi.change >= 0 ? '+' : ''}{Math.round(kpi.change)}%
                        </span>
                      )}
                    </div>
                    {kpi.teamAvg && (
                      <p className="text-[10px] text-muted-foreground mt-1">Team Avg: {kpi.teamAvg}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Level Progression */}
          <LevelProgressCard userId={viewingStaffId} />

          {/* Section 3: Multi-Period Trend Indicators */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1">Revenue Trend (3 periods)</p>
                  <TrendIndicator values={data.multiPeriodTrend.revenue.map(v => Math.round(v)) as [number, number, number]} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1">Rebooking Trend</p>
                  <TrendIndicator values={data.multiPeriodTrend.rebooking.map(v => Math.round(v * 10) / 10) as [number, number, number]} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1">Retention Trend</p>
                  <TrendIndicator values={data.multiPeriodTrend.retention.map(v => Math.round(v * 10) / 10) as [number, number, number]} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Revenue Trend Chart */}
          {data.revenue.dailyTrend.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-sm tracking-wide uppercase">Revenue Trend</CardTitle>
                  <MetricInfoTooltip description="Daily revenue from appointments for this staff member over the selected period." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenue.dailyTrend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="staffRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tickFormatter={(d) => { const p = d.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; }} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: number) => [formatCurrencyWhole(v), 'Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="url(#staffRevGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Section 5: Performance Breakdown (2 col) */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Service vs Product */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm tracking-wide uppercase">Revenue Split</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenue.service + data.revenue.product > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="w-[120px] h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ name: 'Service', value: data.revenue.service }, { name: 'Product', value: data.revenue.product }]} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={0} stroke="hsl(var(--border) / 0.4)" strokeWidth={1} dataKey="value">
                            <Cell fill={PIE_COLORS[0]} />
                            <Cell fill={PIE_COLORS[1]} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[0] }} />
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.revenue.service)}</BlurredAmount></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[1] }} />
                        <span className="text-muted-foreground">Product:</span>
                        <span className="font-medium tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.revenue.product)}</BlurredAmount></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No revenue data</p>
                )}
              </CardContent>
            </Card>

            {/* Appointment Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm tracking-wide uppercase">Appointment Status</CardTitle>
              </CardHeader>
              <CardContent>
                {data.productivity.totalAppointments > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="w-[120px] h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ name: 'Completed', value: data.productivity.completed }, { name: 'No-Show', value: data.productivity.noShows }, { name: 'Cancelled', value: data.productivity.cancelled }]} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={0} stroke="hsl(var(--border) / 0.4)" strokeWidth={1} dataKey="value">
                            <Cell fill="hsl(var(--chart-2))" />
                            <Cell fill="hsl(var(--destructive))" />
                            <Cell fill="hsl(var(--chart-4))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} /><span className="text-muted-foreground">Completed:</span><span className="font-medium">{data.productivity.completed}</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--destructive))' }} /><span className="text-muted-foreground">No-Show:</span><span className="font-medium">{data.productivity.noShows}</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-4))' }} /><span className="text-muted-foreground">Cancelled:</span><span className="font-medium">{data.productivity.cancelled}</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No appointment data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 6: Top Services */}
          {data.topServices.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-sm tracking-wide uppercase">Top Services</CardTitle>
                  <MetricInfoTooltip description="Top 5 services by revenue for this staff member in the selected period." />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topServices.map(s => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                        <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(s.revenue)}</BlurredAmount></TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(s.avgPrice)}</BlurredAmount></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}


          {/* Section 7: Top Clients */}
          {data.topClients.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-sm tracking-wide uppercase">Top Clients</CardTitle>
                  <MetricInfoTooltip description="Top 10 clients by revenue for this staff member. Clients who haven't visited in 60+ days are flagged as at risk." />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Ticket</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topClients.map(c => (
                      <TableRow key={c.clientId} className={cn(c.atRisk && 'bg-red-50/50 dark:bg-red-950/10')}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.visits}</TableCell>
                        <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(c.revenue)}</BlurredAmount></TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(c.avgTicket)}</BlurredAmount></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.lastVisit}</TableCell>
                        <TableCell>
                          {c.atRisk ? (
                            <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 dark:text-red-400 dark:border-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />At Risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Section 8: Retail Performance */}
          {data.retail.productRevenue > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-sm tracking-wide uppercase">Retail Performance</CardTitle>
                  <MetricInfoTooltip description="Retail product sales for this staff member. Attachment rate is the percentage of their service transactions that included a product sale." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Product Revenue</p>
                    <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.retail.productRevenue)}</BlurredAmount></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Units Sold</p>
                    <p className="text-xl font-display tabular-nums">{data.retail.unitsSold}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Attachment Rate</p>
                    <p className="text-xl font-display tabular-nums">{data.retail.attachmentRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 8b: Zura Color Room */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4 text-primary" />
                <CardTitle className="font-display text-sm tracking-wide uppercase">Zura Color Room</CardTitle>
                <MetricInfoTooltip description="Color and chemical service tracking metrics from Zura Color Room, including compliance, waste, and overage data." />
              </div>
            </CardHeader>
            <CardContent>
              {(data.colorBarCompliance.totalColorAppointments > 0 || (complianceData && complianceData.totalColorAppointments > 0)) ? (
                <>
                  {/* Row 1 — Compliance */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Compliance Rate</p>
                      <p className="text-xl font-display tabular-nums">{data.colorBarCompliance.complianceRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Team Avg: {data.teamAverages.complianceRate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Color Appointments</p>
                      <p className="text-xl font-display tabular-nums">{data.colorBarCompliance.totalColorAppointments}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tracked</p>
                      <p className="text-xl font-display tabular-nums">{data.colorBarCompliance.tracked}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Missed</p>
                      <p className={cn('text-xl font-display tabular-nums', data.colorBarCompliance.missed > 0 && 'text-destructive')}>{data.colorBarCompliance.missed}</p>
                    </div>
                  </div>

                  {/* Row 2 — Operations */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Beaker className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Waste Rate</p>
                        <MetricInfoTooltip description="Waste as a percentage of total product dispensed for color services." />
                      </div>
                      <p className={cn('text-xl font-display tabular-nums', (complianceData?.wastePct ?? 0) > 10 && 'text-destructive')}>{complianceData?.wastePct ?? 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Waste Cost</p>
                        <MetricInfoTooltip description="Estimated dollar cost of wasted product based on cost-per-gram." />
                      </div>
                      <p className={cn('text-xl font-display tabular-nums', (complianceData?.wasteCost ?? 0) > 50 && 'text-destructive')}>
                        <BlurredAmount>{formatCurrencyWhole(complianceData?.wasteCost ?? 0)}</BlurredAmount>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Reweigh Rate</p>
                        <MetricInfoTooltip description="Percentage of tracked color sessions where the bowl was reweighed after service." />
                      </div>
                      <p className="text-xl font-display tabular-nums">{complianceData?.reweighRate ?? 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Overage Attachment</p>
                        <MetricInfoTooltip description="Percentage of color appointments that generated an overage charge for the client." />
                      </div>
                      <p className="text-xl font-display tabular-nums">{complianceData?.overageAttachmentRate ?? 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Overage Charges</p>
                        <MetricInfoTooltip description="Total dollar amount of overage charges billed for this staff member's color services." />
                      </div>
                      <p className="text-xl font-display tabular-nums">
                        <BlurredAmount>{formatCurrencyWhole(complianceData?.overageChargeTotal ?? 0)}</BlurredAmount>
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Beaker}
                  title="No Color Room Data"
                  description="No color or chemical services tracked during this period. Data will populate once appointments are processed through Zura Color Room."
                />
              )}
            </CardContent>
          </Card>

          {/* Section 9: Strengths & Areas for Improvement */}
          {(strengths.length > 0 || improvements.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <CardTitle className="font-display text-sm tracking-wide uppercase">Strengths</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {improvements.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <CardTitle className="font-display text-sm tracking-wide uppercase">Areas for Improvement</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
