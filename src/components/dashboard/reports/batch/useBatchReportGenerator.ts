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
import { isVishServiceCharge } from '@/utils/serviceCategorization';

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
    case 'product-sales': {
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
        const byDate = new Map<string, { totalRev: number; serviceRev: number; productRev: number; services: number; products: number }>();
        for (const r of data) {
          const d = r.transaction_date;
          if (!byDate.has(d)) byDate.set(d, { totalRev: 0, serviceRev: 0, productRev: 0, services: 0, products: 0 });
          const entry = byDate.get(d)!;
          const amt = Number(r.total_amount) || 0;
          entry.totalRev += amt;
          const itemType = (r.item_type || '').toLowerCase();
          if (itemType === 'service') { entry.serviceRev += amt; entry.services += 1; }
          else { entry.productRev += amt; entry.products += 1; }
        }
        return {
          columns: ['Date', 'Total Revenue', 'Service Rev', 'Product Rev', 'Services', 'Products', 'Avg Ticket'],
          rows: Array.from(byDate.entries()).sort().map(([d, v]) => {
            const txns = v.services + v.products;
            return [d, `$${v.totalRev.toFixed(2)}`, `$${v.serviceRev.toFixed(2)}`, `$${v.productRev.toFixed(2)}`, String(v.services), String(v.products), txns > 0 ? `$${(v.totalRev / txns).toFixed(2)}` : '—'];
          }),
        };
      }
      if (reportId === 'stylist-sales') {
        const byStaff = new Map<string, number>();
        for (const r of data) { const name = r.staff_name || 'Unknown'; byStaff.set(name, (byStaff.get(name) || 0) + (Number(r.total_amount) || 0)); }
        return { columns: ['Stylist', 'Revenue'], rows: Array.from(byStaff.entries()).sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, `$${v.toFixed(2)}`]) };
      }
      return { columns: ['Date', 'Item', 'Type', 'Qty', 'Total'], rows: data.slice(0, 500).map(r => [r.transaction_date, r.item_name || '', r.item_type || '', String(r.quantity || 1), `$${(Number(r.total_amount) || 0).toFixed(2)}`]) };
    }
    case 'compensation-ratio': {
      const compData = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('staff_name, item_type, total_amount, tip_amount')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const byStaff = new Map<string, { serviceRev: number; productRev: number; tips: number; count: number }>();
      for (const r of compData) {
        const n = r.staff_name || 'Unknown';
        const e = byStaff.get(n) || { serviceRev: 0, productRev: 0, tips: 0, count: 0 };
        const amt = Number(r.total_amount) || 0;
        if (r.item_type === 'service') e.serviceRev += amt; else e.productRev += amt;
        e.tips += Number(r.tip_amount) || 0;
        e.count++;
        byStaff.set(n, e);
      }
      return {
        columns: ['Staff', 'Service Rev', 'Product Rev', 'Tips', 'Total Rev'],
        rows: Array.from(byStaff.entries())
          .sort((a, b) => (b[1].serviceRev + b[1].productRev) - (a[1].serviceRev + a[1].productRev))
          .map(([n, e]) => [n, `$${e.serviceRev.toFixed(2)}`, `$${e.productRev.toFixed(2)}`, `$${e.tips.toFixed(2)}`, `$${(e.serviceRev + e.productRev).toFixed(2)}`]),
      };
    }
    case 'staff-kpi':
    case 'tip-analysis':
    case 'staff-transaction-detail': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('staff_name, item_name, item_type, total_amount, transaction_date, tip_amount, quantity, unit_price')
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
      if (reportId === 'staff-kpi') {
        const byStaff = new Map<string, { rev: number; tips: number; count: number }>();
        for (const r of data) {
          const n = r.staff_name || 'Unknown';
          const e = byStaff.get(n) || { rev: 0, tips: 0, count: 0 };
          e.rev += Number(r.total_amount) || 0;
          e.tips += Number(r.tip_amount) || 0;
          e.count++;
          byStaff.set(n, e);
        }
        return {
          columns: ['Staff', 'Revenue', 'Tips', 'Transactions', 'Avg Ticket'],
          rows: Array.from(byStaff.entries())
            .sort((a, b) => b[1].rev - a[1].rev)
            .map(([n, e]) => [n, `$${e.rev.toFixed(2)}`, `$${e.tips.toFixed(2)}`, String(e.count), `$${(e.count > 0 ? e.rev / e.count : 0).toFixed(2)}`]),
        };
      }
      // staff-transaction-detail: individual line items
      return {
        columns: ['Date', 'Staff', 'Item', 'Type', 'Qty', 'Amount'],
        rows: data
          .sort((a: any, b: any) => a.transaction_date.localeCompare(b.transaction_date))
          .slice(0, 500)
          .map((r: any) => [r.transaction_date, r.staff_name || 'Unknown', r.item_name || '', r.item_type || '', String(r.quantity || 1), `$${(Number(r.total_amount) || 0).toFixed(2)}`]),
      };
    }
    case 'executive-summary':
    case 'end-of-month':
    case 'payroll-summary': {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('transaction_date, item_type, item_name, total_amount, tip_amount')
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
        if (r.item_type === 'service' || isVishServiceCharge(r.item_name, r.item_type)) serviceRev += amt;
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
    case 'client-attrition': {
      const attrData = await fetchAllBatched<any>((from, to) => {
        let q = (supabase.from('v_all_clients') as any)
          .select('name, first_name, last_name, email, total_spend, visit_count, last_visit')
          .eq('is_archived', false)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const today = new Date();
      const atRisk = attrData
        .filter((c: any) => {
          if (!c.last_visit) return false;
          const days = Math.round((today.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24));
          return days >= 60;
        })
        .map((c: any) => {
          const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
          const days = c.last_visit ? Math.round((today.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          let tier = 'At-Risk';
          if (days >= 120) tier = 'Lost';
          else if (days >= 90) tier = 'Lapsed';
          return [name, c.last_visit || 'Never', String(days), tier, `$${(Number(c.total_spend) || 0).toFixed(2)}`, String(c.visit_count || 0)];
        })
        .sort((a: any, b: any) => Number(b[4].replace('$', '')) - Number(a[4].replace('$', '')));
      return { columns: ['Client', 'Last Visit', 'Days Since', 'Risk Tier', 'Spend', 'Visits'], rows: atRisk.slice(0, 500) };
    }
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
      const bySource = new Map<string, number>();
      for (const c of data) { const src = c.lead_source || 'Unknown'; bySource.set(src, (bySource.get(src) || 0) + 1); }
      return { columns: ['Source', 'Clients'], rows: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, String(c)]) };
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
          q = q.not('deleted_at', 'is', null).gte('appointment_date', dateFrom).lte('appointment_date', dateTo);
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
        let q = supabase.from('v_all_appointments')
          .select('location_id, total_price, tip_amount, status, external_client_id')
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
        if (apt.external_client_id) b.clients.add(apt.external_client_id);
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
    case 'tax-summary': {
      const taxData = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('item_type, total_amount, tax_amount, branch_name, transaction_date')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      let totalTax = 0, totalPreTax = 0;
      const byType = new Map<string, { tax: number; rev: number }>();
      for (const r of taxData) {
        const tax = Number(r.tax_amount) || 0;
        const amt = Number(r.total_amount) || 0;
        totalTax += tax;
        totalPreTax += amt;
        const t = (r.item_type || 'other').toLowerCase();
        const e = byType.get(t) || { tax: 0, rev: 0 };
        e.tax += tax; e.rev += amt;
        byType.set(t, e);
      }
      const summaryRows: string[][] = [
        ['Total Tax Collected', `$${totalTax.toFixed(2)}`, ''],
        ['Pre-Tax Revenue', `$${totalPreTax.toFixed(2)}`, ''],
        ['Gross Revenue', `$${(totalPreTax + totalTax).toFixed(2)}`, ''],
        ['', '', ''],
        ...Array.from(byType.entries())
          .filter(([, v]) => v.tax > 0)
          .sort((a, b) => b[1].tax - a[1].tax)
          .map(([t, v]) => [t, `$${v.tax.toFixed(2)}`, `$${v.rev.toFixed(2)}`]),
      ];
      return { columns: ['Category', 'Tax', 'Revenue'], rows: summaryRows };
    }
    case 'service-profitability': {
      const spData = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('item_name, item_type, total_amount, quantity')
          .eq('item_type', 'service')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const byService = new Map<string, { rev: number; qty: number }>();
      for (const r of spData) {
        const n = r.item_name || 'Unknown';
        const e = byService.get(n) || { rev: 0, qty: 0 };
        e.rev += Number(r.total_amount) || 0;
        e.qty += Number(r.quantity) || 1;
        byService.set(n, e);
      }
      return {
        columns: ['Service', 'Revenue', 'Quantity', 'Avg Price'],
        rows: Array.from(byService.entries())
          .sort((a, b) => b[1].rev - a[1].rev)
          .map(([n, e]) => [n, `$${e.rev.toFixed(2)}`, String(e.qty), `$${(e.qty > 0 ? e.rev / e.qty : 0).toFixed(2)}`]),
      };
    }
    case 'chemical-cost': {
      const ccData = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('item_name, item_type, total_amount, quantity, unit_price')
          .eq('item_type', 'service')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const byService = new Map<string, { rev: number; qty: number; unitPriceSum: number }>();
      for (const r of ccData) {
        const n = r.item_name || 'Unknown';
        const e = byService.get(n) || { rev: 0, qty: 0, unitPriceSum: 0 };
        e.rev += Number(r.total_amount) || 0;
        e.qty += Number(r.quantity) || 1;
        e.unitPriceSum += Number(r.unit_price) || 0;
        byService.set(n, e);
      }
      const serviceRows = Array.from(byService.entries())
        .sort((a, b) => b[1].rev - a[1].rev)
        .map(([n, e]) => [n, `$${e.rev.toFixed(2)}`, String(e.qty), `$${(e.qty > 0 ? e.unitPriceSum / e.qty : 0).toFixed(2)}`]);
      return {
        columns: ['Service', 'Revenue', 'Quantity', 'Avg Unit Price'],
        rows: [
          ['Note: Actual chemical cost data requires backroom integration', '', '', ''],
          ...serviceRows,
        ],
      };
    }
    case 'location-sales': {
      const lsData = await fetchAllBatched<any>((from, to) => {
        let q = supabase.from('v_all_transaction_items')
          .select('location_id, branch_name, total_amount, item_type')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });
      const byLoc = new Map<string, { name: string; serviceRev: number; productRev: number; count: number }>();
      for (const r of lsData) {
        const lid = r.location_id || 'unknown';
        const e = byLoc.get(lid) || { name: r.branch_name || 'Unknown', serviceRev: 0, productRev: 0, count: 0 };
        const amt = Number(r.total_amount) || 0;
        if (r.item_type === 'service') e.serviceRev += amt; else e.productRev += amt;
        e.count++;
        byLoc.set(lid, e);
      }
      return {
        columns: ['Location', 'Service Rev', 'Product Rev', 'Total Rev', 'Transactions'],
        rows: Array.from(byLoc.values())
          .sort((a, b) => (b.serviceRev + b.productRev) - (a.serviceRev + a.productRev))
          .map(e => [e.name, `$${e.serviceRev.toFixed(2)}`, `$${e.productRev.toFixed(2)}`, `$${(e.serviceRev + e.productRev).toFixed(2)}`, String(e.count)]),
      };
    }
    case 'retail-products':
    case 'retail-staff':
    case 'category-mix':
    case 'discounts': {
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
      // category-mix
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
