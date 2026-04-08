import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import {
  addReportHeader,
  addReportFooter,
  fetchLogoAsDataUrl,
  getReportAutoTableBranding,
  buildReportFileName,
  type ReportHeaderOptions,
} from '@/lib/reportPdfLayout';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface BatchReportConfig {
  reportId: string;
  reportName: string;
}

interface GenerateOpts {
  configs: BatchReportConfig[];
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  outputFormat: 'merged' | 'zip';
}

/**
 * Fetches data and produces a single-report PDF as an ArrayBuffer.
 * Uses lightweight inline queries — no component hooks.
 */
async function generateSingleReportPdf(
  config: BatchReportConfig,
  dateFrom: string,
  dateTo: string,
  locationId: string | undefined,
  orgName: string,
  logoDataUrl: Awaited<ReturnType<typeof fetchLogoAsDataUrl>>,
  locationInfo: any,
  orgId?: string,
): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const headerOpts: ReportHeaderOptions = {
    orgName,
    logoDataUrl,
    reportTitle: config.reportName,
    dateFrom,
    dateTo,
    locationInfo,
  };
  const branding = getReportAutoTableBranding(doc, headerOpts);
  const y = addReportHeader(doc, headerOpts);

  // Fetch data based on report type and render table
  const data = await fetchReportData(config.reportId, dateFrom, dateTo, locationId, orgId);

  if (data.rows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No data available for the selected date range.', 14, y + 10);
  } else {
    autoTable(doc, {
      ...branding,
      startY: y,
      head: [data.columns],
      body: data.rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 41, 41], textColor: [255, 255, 255], fontSize: 8 },
    });
  }

  addReportFooter(doc, orgName);
  return doc.output('arraybuffer');
}

interface ReportTableData {
  columns: string[];
  rows: string[][];
}

async function fetchReportData(
  reportId: string,
  dateFrom: string,
  dateTo: string,
  locationId?: string,
  orgId?: string,
): Promise<ReportTableData> {
  switch (reportId) {
    case 'daily-sales':
    case 'stylist-sales':
    case 'product-sales':
    case 'location-sales': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('transaction_date, staff_name, item_name, item_type, quantity, total_amount, location_id')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      if (reportId === 'daily-sales') {
        const byDate = new Map<string, number>();
        for (const r of data) { byDate.set(r.transaction_date, (byDate.get(r.transaction_date) || 0) + (Number(r.total_amount) || 0)); }
        return { columns: ['Date', 'Revenue'], rows: Array.from(byDate.entries()).sort().map(([d, v]) => [d, `$${v.toFixed(2)}`]) };
      }
      if (reportId === 'stylist-sales') {
        const byStaff = new Map<string, number>();
        for (const r of data) { const name = r.staff_name || 'Unknown'; byStaff.set(name, (byStaff.get(name) || 0) + (Number(r.total_amount) || 0)); }
        return { columns: ['Stylist', 'Revenue'], rows: Array.from(byStaff.entries()).sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, `$${v.toFixed(2)}`]) };
      }
      return { columns: ['Date', 'Item', 'Type', 'Qty', 'Total'], rows: data.slice(0, 500).map(r => [r.transaction_date, r.item_name || '', r.item_type || '', String(r.quantity || 1), `$${(Number(r.total_amount) || 0).toFixed(2)}`]) };
    }
    case 'staff-kpi':
    case 'tip-analysis':
    case 'compensation-ratio':
    case 'staff-transaction-detail': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('staff_name, item_name, item_type, total_amount, transaction_date, tip_amount')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      if (reportId === 'tip-analysis') {
        const byStaff = new Map<string, { tips: number; count: number }>();
        for (const r of data) { const n = r.staff_name || 'Unknown'; const e = byStaff.get(n) || { tips: 0, count: 0 }; e.tips += Number(r.tip_amount) || 0; e.count++; byStaff.set(n, e); }
        return { columns: ['Stylist', 'Total Tips', 'Avg Tip'], rows: Array.from(byStaff.entries()).map(([n, e]) => [n, `$${e.tips.toFixed(2)}`, `$${(e.tips / e.count).toFixed(2)}`]) };
      }
      const byStaff = new Map<string, number>();
      for (const r of data) { const n = r.staff_name || 'Unknown'; byStaff.set(n, (byStaff.get(n) || 0) + (Number(r.total_amount) || 0)); }
      return { columns: ['Stylist', 'Revenue'], rows: Array.from(byStaff.entries()).sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, `$${v.toFixed(2)}`]) };
    }
    case 'executive-summary':
    case 'end-of-month':
    case 'payroll-summary': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('transaction_date, item_type, total_amount, tip_amount')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      let totalRevenue = 0, serviceRev = 0, productRev = 0, totalTips = 0;
      for (const r of data) {
        const amt = Number(r.total_amount) || 0;
        totalRevenue += amt;
        if (r.item_type === 'service') serviceRev += amt;
        else productRev += amt;
        totalTips += Number(r.tip_amount) || 0;
      }
      return {
        columns: ['Metric', 'Value'],
        rows: [
          ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
          ['Service Revenue', `$${serviceRev.toFixed(2)}`],
          ['Product Revenue', `$${productRev.toFixed(2)}`],
          ['Total Tips', `$${totalTips.toFixed(2)}`],
          ['Transaction Count', String(data.length)],
        ],
      };
    }
    case 'client-birthdays': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = (supabase.from('v_all_clients') as any)
          .select('name, first_name, last_name, email, phone, total_spend, visit_count, birthday')
          .eq('is_archived', false)
          .not('birthday', 'is', null)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const today = new Date();
      const currentYear = today.getFullYear();
      const entries = data
        .map((c: any) => {
          if (!c.birthday) return null;
          const bday = new Date(c.birthday);
          let thisYear = new Date(currentYear, bday.getMonth(), bday.getDate());
          if (thisYear < today) thisYear = new Date(currentYear + 1, bday.getMonth(), bday.getDate());
          const days = Math.round((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
          const bdayStr = `${String(bday.getMonth() + 1).padStart(2, '0')}/${String(bday.getDate()).padStart(2, '0')}`;
          return [name, bdayStr, String(days), c.email || '', c.phone || '', `$${(Number(c.total_spend) || 0).toFixed(2)}`];
        })
        .filter(Boolean)
        .sort((a: any, b: any) => Number(a[2]) - Number(b[2]));
      return { columns: ['Client', 'Birthday', 'Days Until', 'Email', 'Phone', 'Spend'], rows: entries.slice(0, 500) };
    }
    case 'duplicate-clients': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = (supabase.from('v_all_clients') as any)
          .select('name, first_name, last_name, email, phone')
          .eq('is_archived', false)
          .eq('is_duplicate', true)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      return {
        columns: ['Client', 'Email', 'Phone'],
        rows: data.slice(0, 500).map((c: any) => [
          c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          c.email || '',
          c.phone || '',
        ]),
      };
    }
    case 'client-attrition':
    case 'top-clients':
    case 'client-source': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = (supabase.from('v_all_clients') as any)
          .select('name, first_name, last_name, email, phone, total_spend, visit_count, created_at, lead_source, birthday')
          .eq('is_archived', false)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      if (reportId === 'top-clients') {
        const sorted = data.sort((a: any, b: any) => (Number(b.total_spend) || 0) - (Number(a.total_spend) || 0)).slice(0, 100);
        return { columns: ['Client', 'Spend', 'Visits'], rows: sorted.map((c: any) => [c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown', `$${(Number(c.total_spend) || 0).toFixed(2)}`, String(c.visit_count || 0)]) };
      }
      if (reportId === 'client-source') {
        const bySource = new Map<string, number>();
        for (const c of data) { const src = c.lead_source || 'Unknown'; bySource.set(src, (bySource.get(src) || 0) + 1); }
        return { columns: ['Source', 'Clients'], rows: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, String(c)]) };
      }
      return { columns: ['Client', 'Email', 'Spend', 'Visits'], rows: data.slice(0, 300).map((c: any) => [c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown', c.email || '', `$${(Number(c.total_spend) || 0).toFixed(2)}`, String(c.visit_count || 0)]) };
    }
    case 'demand-heatmap': {
      const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_appointments')
          .select('appointment_date, start_time, status')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .not('start_time', 'is', null)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const grid: Record<string, number> = {};
      data.forEach((apt: any) => {
        const day = new Date(apt.appointment_date).getDay();
        const hour = parseInt(apt.start_time.split(':')[0]);
        const key = `${day}:${hour}`;
        grid[key] = (grid[key] || 0) + 1;
      });
      const rows: string[][] = [];
      for (let h = 7; h <= 21; h++) {
        const row = [`${h}:00`];
        for (let d = 0; d < 7; d++) {
          row.push(String(grid[`${d}:${h}`] || 0));
        }
        rows.push(row);
      }
      return { columns: ['Hour', ...DAY_NAMES], rows };
    }
    case 'no-show-enhanced':
    case 'deleted-appointments':
    case 'future-appointments': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_appointments')
          .select('appointment_date, start_time, status, staff_name, client_name, total_price, deleted_at')
          .range(from, to);
        if (reportId === 'deleted-appointments') {
          q = q.not('deleted_at', 'is', null);
        } else if (reportId === 'future-appointments') {
          q = q.gte('appointment_date', dateFrom);
        } else {
          q = q.gte('appointment_date', dateFrom).lte('appointment_date', dateTo);
        }
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      if (reportId === 'deleted-appointments') {
        return { columns: ['Date', 'Client', 'Staff', 'Status', 'Price'], rows: data.slice(0, 500).map((a: any) => [a.appointment_date, a.client_name || '', a.staff_name || '', a.status || '', `$${(Number(a.total_price) || 0).toFixed(2)}`]) };
      }
      if (reportId === 'no-show-enhanced') {
        const noShows = data.filter((a: any) => a.status === 'no_show' || a.status === 'cancelled');
        return { columns: ['Date', 'Client', 'Staff', 'Status', 'Lost Revenue'], rows: noShows.slice(0, 500).map((a: any) => [a.appointment_date, a.client_name || '', a.staff_name || '', a.status || '', `$${(Number(a.total_price) || 0).toFixed(2)}`]) };
      }
      return { columns: ['Date', 'Time', 'Client', 'Staff', 'Price'], rows: data.slice(0, 500).map((a: any) => [a.appointment_date, a.start_time || '', a.client_name || '', a.staff_name || '', `$${(Number(a.total_price) || 0).toFixed(2)}`]) };
    }
    case 'location-benchmark': {
      const appts = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('phorest_appointments')
          .select('location_id, total_price, tip_amount, status, phorest_client_id')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('location_id', 'is', null)
          .range(from, to);
        return q;
      });
      const locQuery = await supabase.from('locations').select('id, name');
      const locMap = new Map((locQuery.data || []).map((l: any) => [l.id, l.name]));
      const byLoc: Record<string, { rev: number; count: number; noShow: number; allCount: number; clients: Set<string> }> = {};
      appts.forEach((apt: any) => {
        const lid = apt.location_id;
        if (!byLoc[lid]) byLoc[lid] = { rev: 0, count: 0, noShow: 0, allCount: 0, clients: new Set() };
        const b = byLoc[lid];
        b.allCount++;
        if (apt.status === 'no_show') { b.noShow++; return; }
        if (apt.status === 'cancelled') return;
        b.rev += (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
        b.count++;
        if (apt.phorest_client_id) b.clients.add(apt.phorest_client_id);
      });
      const rows = Object.entries(byLoc)
        .map(([lid, b]) => [
          locMap.get(lid) || 'Unknown',
          `$${b.rev.toFixed(2)}`,
          String(b.count),
          b.count > 0 ? `$${(b.rev / b.count).toFixed(2)}` : '$0.00',
          String(b.clients.size),
          b.allCount > 0 ? `${((b.noShow / b.allCount) * 100).toFixed(1)}%` : '0.0%',
        ])
        .sort((a, b) => parseFloat(b[1].replace('$', '')) - parseFloat(a[1].replace('$', '')));
      return { columns: ['Location', 'Revenue', 'Appointments', 'Avg Ticket', 'Clients', 'No-Show %'], rows };
    }
    case 'retail-products':
    case 'retail-staff':
    case 'category-mix':
    case 'tax-summary':
    case 'discounts':
    case 'service-profitability':
    case 'chemical-cost': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('item_name, item_type, total_amount, quantity, staff_name, transaction_date, discount')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      if (reportId === 'retail-products' || reportId === 'retail-staff') {
        const products = data.filter((r: any) => r.item_type === 'product');
        if (reportId === 'retail-staff') {
          const byStaff = new Map<string, { rev: number; qty: number }>();
          for (const r of products) { const n = r.staff_name || 'Unknown'; const e = byStaff.get(n) || { rev: 0, qty: 0 }; e.rev += Number(r.total_amount) || 0; e.qty += Number(r.quantity) || 0; byStaff.set(n, e); }
          return { columns: ['Staff', 'Retail Revenue', 'Units Sold'], rows: Array.from(byStaff.entries()).sort((a, b) => b[1].rev - a[1].rev).map(([n, e]) => [n, `$${e.rev.toFixed(2)}`, String(e.qty)]) };
        }
        const byProduct = new Map<string, { rev: number; qty: number }>();
        for (const r of products) { const n = r.item_name || 'Unknown'; const e = byProduct.get(n) || { rev: 0, qty: 0 }; e.rev += Number(r.total_amount) || 0; e.qty += Number(r.quantity) || 0; byProduct.set(n, e); }
        return { columns: ['Product', 'Revenue', 'Units'], rows: Array.from(byProduct.entries()).sort((a, b) => b[1].rev - a[1].rev).map(([n, e]) => [n, `$${e.rev.toFixed(2)}`, String(e.qty)]) };
      }
      if (reportId === 'discounts') {
        const withDiscount = data.filter((r: any) => Number(r.discount) > 0);
        return { columns: ['Date', 'Item', 'Staff', 'Discount'], rows: withDiscount.slice(0, 500).map((r: any) => [r.transaction_date, r.item_name || '', r.staff_name || '', `$${(Number(r.discount) || 0).toFixed(2)}`]) };
      }
      // Generic summary
      const byType = new Map<string, number>();
      for (const r of data) { const t = r.item_type || 'other'; byType.set(t, (byType.get(t) || 0) + (Number(r.total_amount) || 0)); }
      return { columns: ['Category', 'Revenue'], rows: Array.from(byType.entries()).map(([t, v]) => [t, `$${v.toFixed(2)}`]) };
    }
    case 'gift-cards':
    case 'vouchers': {
      const table = reportId === 'gift-cards' ? 'gift_cards' : 'vouchers';
      let q = supabase.from(table).select('*').limit(500);
      if (orgId) q = q.eq('organization_id', orgId);
      const { data, error } = await q;
      if (error || !data) return { columns: ['Status'], rows: [['No data available']] };
      if (reportId === 'gift-cards') {
        return { columns: ['Code', 'Balance', 'Status', 'Created'], rows: data.map((g: any) => [g.code || '', `$${(Number(g.current_balance) || 0).toFixed(2)}`, g.is_active ? 'Active' : 'Inactive', g.created_at?.split('T')[0] || '']) };
      }
      return { columns: ['Code', 'Value', 'Status', 'Issued'], rows: data.map((v: any) => [v.code || '', `$${(Number(v.value) || 0).toFixed(2)}`, v.is_redeemed ? 'Redeemed' : v.is_active ? 'Active' : 'Inactive', v.valid_from?.split('T')[0] || '']) };
    }
    default:
      return { columns: ['Info'], rows: [['Report data not available for batch generation']] };
  }
}

export function useBatchReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo();

  const generate = useCallback(async (opts: GenerateOpts) => {
    const { configs, dateFrom, dateTo, locationId, outputFormat } = opts;
    setIsGenerating(true);
    setProgress(0);
    setProgressLabel('Preparing...');

    try {
      const orgName = businessSettings?.business_name || effectiveOrganization?.name || 'Organization';

      // Fetch logo once
      let logoUrl: string | null = null;
      if (effectiveOrganization?.id) {
        const { data: orgData } = await supabase.from('organizations').select('logo_url').eq('id', effectiveOrganization.id).single();
        logoUrl = orgData?.logo_url || null;
      }
      const logoDataUrl = await fetchLogoAsDataUrl(logoUrl);

      if (outputFormat === 'zip') {
        // ZIP: generate individual PDFs
        const pdfs: { name: string; buffer: ArrayBuffer }[] = [];
        for (let i = 0; i < configs.length; i++) {
          const config = configs[i];
          setProgress(Math.round(((i) / configs.length) * 100));
          setProgressLabel(`Generating ${i + 1} of ${configs.length}: ${config.reportName}`);

          const buffer = await generateSingleReportPdf(
            config, dateFrom, dateTo, locationId, orgName, logoDataUrl, locationInfo, effectiveOrganization?.id,
          );
          pdfs.push({
            name: buildReportFileName({ orgName, reportSlug: config.reportId, dateFrom, dateTo }),
            buffer,
          });
        }

        setProgress(95);
        setProgressLabel('Assembling ZIP...');
        const zip = new JSZip();
        for (const pdf of pdfs) {
          zip.file(pdf.name, pdf.buffer);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildReportFileName({ orgName, reportSlug: 'report-pack', dateFrom, dateTo }).replace('.pdf', '.zip');
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Merged: generate directly into a single doc (no double-fetch)
        const mergedDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let isFirstReport = true;

        for (let i = 0; i < configs.length; i++) {
          const config = configs[i];
          setProgress(Math.round(((i) / configs.length) * 100));
          setProgressLabel(`Generating ${i + 1} of ${configs.length}: ${config.reportName}`);

          if (!isFirstReport) mergedDoc.addPage();
          isFirstReport = false;

          const headerOpts: ReportHeaderOptions = {
            orgName,
            logoDataUrl,
            reportTitle: config.reportName,
            dateFrom,
            dateTo,
            locationInfo,
          };
          const branding = getReportAutoTableBranding(mergedDoc, headerOpts);
          const y = addReportHeader(mergedDoc, headerOpts);

          const data = await fetchReportData(config.reportId, dateFrom, dateTo, locationId, effectiveOrganization?.id);
          if (data.rows.length === 0) {
            mergedDoc.setFontSize(11);
            mergedDoc.setTextColor(120, 120, 120);
            mergedDoc.text('No data available for the selected date range.', 14, y + 10);
          } else {
            autoTable(mergedDoc, {
              ...branding,
              startY: y,
              head: [data.columns],
              body: data.rows,
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [41, 41, 41], textColor: [255, 255, 255], fontSize: 8 },
            });
          }
        }
        addReportFooter(mergedDoc, orgName);

        setProgress(95);
        setProgressLabel('Assembling PDF...');
        mergedDoc.save(buildReportFileName({ orgName, reportSlug: 'report-pack', dateFrom, dateTo }));
      }

      setProgress(100);
      toast.success(`${configs.length} report${configs.length > 1 ? 's' : ''} generated successfully`);
    } catch (err: any) {
      console.error('Batch report generation failed:', err);
      toast.error('Failed to generate reports', { description: err.message });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressLabel('');
    }
  }, [businessSettings, effectiveOrganization, locationInfo]);

  return { generate, isGenerating, progress, progressLabel };
}
