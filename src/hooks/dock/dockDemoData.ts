/**
 * dockDemoData — Static mock data for Dock demo mode.
 * Used when staff.userId === 'dev-bypass-000'.
 */

import { format, addMinutes, subMinutes, setHours, setMinutes, setSeconds } from 'date-fns';
import type { DockAppointment } from './useDockAppointments';
import type { DockProduct } from './useDockProductCatalog';
import type { DockMixSession } from './useDockMixSessions';

const today = format(new Date(), 'yyyy-MM-dd');
const now = new Date();

// Operating hours — all demo times clamped to this window
const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

function clampToOperatingHours(date: Date): Date {
  const result = new Date(date);
  const openTime = setSeconds(setMinutes(setHours(new Date(date), OPEN_HOUR), 0), 0);
  const closeTime = setSeconds(setMinutes(setHours(new Date(date), CLOSE_HOUR), 0), 0);
  if (result < openTime) return openTime;
  if (result > closeTime) return closeTime;
  return result;
}

/** Generate a clamped start/end pair preserving minimum duration */
function clampedPair(start: Date, end: Date, minDurationMin = 30): { start: Date; end: Date } {
  let s = clampToOperatingHours(start);
  let e = clampToOperatingHours(end);
  // Ensure minimum duration
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < minDurationMin * 60_000) {
    // Try extending end first
    e = addMinutes(s, minDurationMin);
    e = clampToOperatingHours(e);
    // If still too short, pull start back
    if (e.getTime() - s.getTime() < minDurationMin * 60_000) {
      s = subMinutes(e, minDurationMin);
      s = clampToOperatingHours(s);
    }
  }
  return { start: s, end: e };
}

function timeStr(date: Date) {
  return format(date, 'HH:mm:ss');
}

function clampedTimeStr(start: Date, end: Date): { startStr: string; endStr: string } {
  const pair = clampedPair(start, end);
  return { startStr: timeStr(pair.start), endStr: timeStr(pair.end) };
}

// ─── Mock Appointments ───────────────────────────────────────
export const DEMO_APPOINTMENTS: DockAppointment[] = (() => {
  const t1 = clampedTimeStr(subMinutes(now, 30), addMinutes(now, 60));
  const t2 = clampedTimeStr(subMinutes(now, 45), addMinutes(now, 30));
  const t3 = clampedTimeStr(addMinutes(now, 30), addMinutes(now, 90));
  const t4 = clampedTimeStr(addMinutes(now, 120), addMinutes(now, 240));
  const t5 = clampedTimeStr(subMinutes(now, 180), subMinutes(now, 60));
  const t6 = clampedTimeStr(addMinutes(now, 270), addMinutes(now, 330));
  const t7 = clampedTimeStr(subMinutes(now, 300), subMinutes(now, 180));
  const t8 = clampedTimeStr(subMinutes(now, 20), addMinutes(now, 40));
  const t9 = clampedTimeStr(addMinutes(now, 60), addMinutes(now, 105));
  const t10 = clampedTimeStr(addMinutes(now, 180), addMinutes(now, 270));
  const t11 = clampedTimeStr(subMinutes(now, 240), subMinutes(now, 180));

  return [
    {
      id: 'demo-appt-1',
      source: 'local',
      client_name: 'Sarah Mitchell',
      stylist_name: 'Jenna B.',
      service_name: 'Balayage + Toner',
      appointment_date: today,
      start_time: t1.startStr,
      end_time: t1.endStr,
      status: 'checked_in',
      location_id: null,
      client_id: 'demo-client-1',
      notes: 'Wants warm caramel tones, avoid going too ashy',
      mix_bowl_count: 1,
      assistant_names: ['Alexis R.'],
    },
    {
      id: 'demo-appt-7',
      source: 'local',
      client_name: 'Rachel Kim',
      stylist_name: 'Jenna B.',
      service_name: 'Root Touch-Up + Gloss',
      appointment_date: today,
      start_time: t2.startStr,
      end_time: t2.endStr,
      status: 'in_progress',
      location_id: null,
      client_id: 'demo-client-7',
      notes: 'Keep it natural — level 7 base',
      mix_bowl_count: 2,
    },
    {
      id: 'demo-appt-2',
      source: 'phorest',
      client_name: 'Jessica Chen',
      stylist_name: 'Jenna B.',
      service_name: 'Root Touch-Up + Gloss',
      appointment_date: today,
      start_time: t3.startStr,
      end_time: t3.endStr,
      status: 'scheduled',
      location_id: null,
      phorest_client_id: 'demo-phorest-1',
      notes: null,
      mix_bowl_count: 0,
    },
    {
      id: 'demo-appt-3',
      source: 'local',
      client_name: 'Emily Rodriguez',
      stylist_name: 'Jenna B.',
      service_name: 'Full Highlight + Root Smudge + Glaze Add On + Signature Haircut',
      appointment_date: today,
      start_time: t4.startStr,
      end_time: t4.endStr,
      status: 'scheduled',
      location_id: null,
      client_id: 'demo-client-3',
      assistant_names: ['Kylie M.', 'Alexis R.'],
      notes: 'New client — consultation needed',
      mix_bowl_count: 0,
    },
    {
      id: 'demo-appt-4',
      source: 'phorest',
      client_name: 'Amanda Park',
      stylist_name: 'Jenna B.',
      service_name: 'Color Correction',
      appointment_date: today,
      start_time: t5.startStr,
      end_time: t5.endStr,
      status: 'completed',
      location_id: null,
      phorest_client_id: 'demo-phorest-2',
      notes: 'Fixed banding from previous salon',
      mix_bowl_count: 3,
      payment_status: 'paid',
    },
    {
      id: 'demo-appt-5',
      source: 'local',
      client_name: 'Lauren Taylor',
      stylist_name: 'Jenna B.',
      service_name: 'Toner Refresh',
      appointment_date: today,
      start_time: t6.startStr,
      end_time: t6.endStr,
      status: 'scheduled',
      location_id: null,
      client_id: 'demo-client-5',
      notes: null,
      has_mix_session: false,
    },
    {
      id: 'demo-appt-6',
      source: 'phorest',
      client_name: 'Maria Gonzalez',
      stylist_name: 'Jenna B.',
      service_name: 'Vivids (Fashion Color)',
      appointment_date: today,
      start_time: t7.startStr,
      end_time: t7.endStr,
      status: 'completed',
      location_id: null,
      phorest_client_id: 'demo-phorest-3',
      notes: 'Purple and magenta panels',
      has_mix_session: true,
      payment_status: 'unpaid',
    },
    // ── Non-chemical appointments (visible only with toggle off) ──
    {
      id: 'demo-appt-8',
      source: 'local',
      client_name: 'Olivia Barnes',
      stylist_name: 'Jenna B.',
      service_name: 'Signature Haircut',
      appointment_date: today,
      start_time: t8.startStr,
      end_time: t8.endStr,
      status: 'checked_in',
      location_id: null,
      client_id: 'demo-client-8',
      notes: null,
      has_mix_session: false,
    },
    {
      id: 'demo-appt-9',
      source: 'local',
      client_name: 'Megan Foster',
      stylist_name: 'Jenna B.',
      service_name: 'Blowout',
      appointment_date: today,
      start_time: t9.startStr,
      end_time: t9.endStr,
      status: 'scheduled',
      location_id: null,
      client_id: 'demo-client-9',
      notes: null,
      has_mix_session: false,
    },
    {
      id: 'demo-appt-10',
      source: 'local',
      client_name: 'Danielle Wright',
      stylist_name: 'Jenna B.',
      service_name: 'Special Event Styling',
      appointment_date: today,
      start_time: t10.startStr,
      end_time: t10.endStr,
      status: 'scheduled',
      location_id: null,
      client_id: 'demo-client-10',
      notes: 'Wedding updo — bring inspiration photos',
      has_mix_session: false,
    },
    {
      id: 'demo-appt-11',
      source: 'local',
      client_name: 'Natalie Brooks',
      stylist_name: 'Jenna B.',
      service_name: 'Signature Haircut, Deep Conditioning Treatment',
      appointment_date: today,
      start_time: t11.startStr,
      end_time: t11.endStr,
      status: 'completed',
      location_id: null,
      client_id: 'demo-client-11',
      notes: null,
      has_mix_session: false,
      payment_status: 'comp',
    },
  ];
})();

// ─── Mock Products ───────────────────────────────────────────
export const DEMO_PRODUCTS: DockProduct[] = [
  // Wella
  { id: 'demo-prod-w1', brand: 'Wella', name: 'Koleston Perfect 6/0', category: 'Permanent Color', product_line: 'Koleston Perfect', swatch_color: '#6B4226', wholesale_price: 8.50, default_unit: 'g' },
  { id: 'demo-prod-w2', brand: 'Wella', name: 'Koleston Perfect 7/1', category: 'Permanent Color', product_line: 'Koleston Perfect', swatch_color: '#8B7355', wholesale_price: 8.50, default_unit: 'g' },
  { id: 'demo-prod-w3', brand: 'Wella', name: 'Blondor Multi-Blonde Powder', category: 'Lightener', product_line: 'Blondor', swatch_color: '#F5E6CC', wholesale_price: 22.00, default_unit: 'g' },
  { id: 'demo-prod-w4', brand: 'Wella', name: 'Welloxon Perfect 20 Vol', category: 'Developer', product_line: 'Welloxon', swatch_color: null, wholesale_price: 6.00, default_unit: 'ml' },
  { id: 'demo-prod-w5', brand: 'Wella', name: 'Shinefinity 09/13', category: 'Demi-Permanent', product_line: 'Shinefinity', swatch_color: '#E8D5B7', wholesale_price: 9.00, default_unit: 'g' },

  // Redken
  { id: 'demo-prod-r1', brand: 'Redken', name: 'Shades EQ 06NB', category: 'Demi-Permanent', product_line: 'Shades EQ', swatch_color: '#7A5C42', wholesale_price: 10.00, default_unit: 'ml' },
  { id: 'demo-prod-r2', brand: 'Redken', name: 'Shades EQ 09V', category: 'Demi-Permanent', product_line: 'Shades EQ', swatch_color: '#C4A882', wholesale_price: 10.00, default_unit: 'ml' },
  { id: 'demo-prod-r3', brand: 'Redken', name: 'Flash Lift Bonder Inside', category: 'Lightener', product_line: 'Flash Lift', swatch_color: '#FFF8E7', wholesale_price: 24.00, default_unit: 'g' },
  { id: 'demo-prod-r4', brand: 'Redken', name: 'Pro-Oxide 30 Vol', category: 'Developer', product_line: 'Pro-Oxide', swatch_color: null, wholesale_price: 7.00, default_unit: 'ml' },

  // Schwarzkopf
  { id: 'demo-prod-s1', brand: 'Schwarzkopf', name: 'Igora Royal 5-0', category: 'Permanent Color', product_line: 'Igora Royal', swatch_color: '#5C3A1E', wholesale_price: 7.50, default_unit: 'g' },
  { id: 'demo-prod-s2', brand: 'Schwarzkopf', name: 'Igora Royal 8-11', category: 'Permanent Color', product_line: 'Igora Royal', swatch_color: '#A08B70', wholesale_price: 7.50, default_unit: 'g' },
  { id: 'demo-prod-s3', brand: 'Schwarzkopf', name: 'BlondMe Premium Lift 9+', category: 'Lightener', product_line: 'BlondMe', swatch_color: '#FFF0D4', wholesale_price: 20.00, default_unit: 'g' },
  { id: 'demo-prod-s4', brand: 'Schwarzkopf', name: 'Igora Vibrance 9.5-1', category: 'Demi-Permanent', product_line: 'Igora Vibrance', swatch_color: '#D4C4A8', wholesale_price: 8.00, default_unit: 'g' },
  { id: 'demo-prod-s5', brand: 'Schwarzkopf', name: 'Igora Developer 20 Vol', category: 'Developer', product_line: 'Igora Royal', swatch_color: null, wholesale_price: 5.50, default_unit: 'ml' },
];

// ─── Mock Mix Sessions ───────────────────────────────────────
export const DEMO_MIX_SESSIONS: Record<string, DockMixSession[]> = {
  'demo-appt-1': [
    {
      id: 'demo-session-1',
      status: 'in_progress',
      notes: 'Bowl 1: Balayage lightener. Bowl 2: Toner.',
      started_at: subMinutes(now, 25).toISOString(),
      completed_at: null,
      is_manual_override: false,
      unresolved_flag: false,
      unresolved_reason: null,
    },
  ],
  'demo-appt-4': [
    {
      id: 'demo-session-2',
      status: 'completed',
      notes: 'Color correction — 3 bowls used.',
      started_at: subMinutes(now, 180).toISOString(),
      completed_at: subMinutes(now, 70).toISOString(),
      is_manual_override: false,
      unresolved_flag: false,
      unresolved_reason: null,
    },
  ],
  'demo-appt-6': [
    {
      id: 'demo-session-3',
      status: 'completed',
      notes: 'Fashion color — vivids application.',
      started_at: subMinutes(now, 300).toISOString(),
      completed_at: subMinutes(now, 190).toISOString(),
      is_manual_override: false,
      unresolved_flag: true,
      unresolved_reason: 'Leftover product not weighed',
    },
  ],
};

// ─── Brand aggregation helpers ───────────────────────────────
export const DEMO_BRANDS = (() => {
  const counts = new Map<string, number>();
  for (const p of DEMO_PRODUCTS) {
    counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
})();

export function getDemoProductsByBrand(brand: string): DockProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.brand === brand);
}

export function searchDemoProducts(query: string): DockProduct[] {
  const q = query.toLowerCase();
  return DEMO_PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  );
}

// ─── Mock Services (Drop Dead Salons catalog) ───────────────
export interface DemoService {
  id: string;
  phorest_service_id: string;
  phorest_branch_id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  requires_qualification: boolean;
  is_active: boolean;
  allow_same_day_booking: boolean;
  lead_time_days: number;
  same_day_restriction_reason: string | null;
}

let _svcIdx = 0;
function svc(name: string, category: string, duration_minutes: number, price: number, opts?: { qual?: boolean; noSameDay?: boolean; lead?: number; reason?: string }): DemoService {
  _svcIdx++;
  const id = `demo-svc-${_svcIdx}`;
  return {
    id, phorest_service_id: id, phorest_branch_id: 'demo',
    name, category, duration_minutes, price,
    requires_qualification: opts?.qual ?? false,
    is_active: true,
    allow_same_day_booking: !(opts?.noSameDay),
    lead_time_days: opts?.lead ?? 0,
    same_day_restriction_reason: opts?.reason ?? null,
  };
}

export const DEMO_SERVICES: DemoService[] = [
  // ── Blonding ──
  svc('Full Balayage', 'Blonding', 270, 240),
  svc('Partial Balayage', 'Blonding', 150, 185),
  svc('Transformational Balayage', 'Blonding', 300, 265, { qual: true, noSameDay: true, lead: 1, reason: 'Requires consultation' }),
  svc('Full Highlight', 'Blonding', 240, 240),
  svc('Partial Highlight', 'Blonding', 150, 185),
  svc('Chunky Highlight', 'Blonding', 150, 185),
  svc('Mini Highlight', 'Blonding', 90, 135),
  svc('Face Frame Highlight', 'Blonding', 90, 115),
  svc('Transformational Highlight', 'Blonding', 300, 315, { qual: true, noSameDay: true, lead: 1, reason: 'Requires consultation' }),
  svc('Lightener Retouch', 'Blonding', 120, 155),
  svc('Transformational Lightener Retouch', 'Blonding', 120, 160),
  svc('Split Lightener Retouch', 'Blonding', 90, 100),
  svc('Split Lightener Transformation Retouch', 'Blonding', 120, 115),
  svc('Global Blonding', 'Blonding', 270, 325, { qual: true }),
  svc('3+ Color Blocks / Calico Placement', 'Blonding', 240, 250),
  svc('Double Color Block', 'Blonding', 210, 185),
  svc('Singular Color Block', 'Blonding', 150, 145),
  svc('Initial Split Dye Bleach Out', 'Blonding', 150, 185),

  // ── Color ──
  svc('Single Process Color', 'Color', 90, 145),
  svc('Root Smudge + Blowout', 'Color', 90, 120),
  svc('Glaze + Blowout', 'Color', 60, 130),
  svc('Natural Root Retouch', 'Color', 90, 100),
  svc('Touch Up and Go', 'Color', 90, 86),
  svc('Color Melt', 'Color', 90, 135),
  svc('Tint Back', 'Color', 90, 160),
  svc('Lowlight + Root Smudge', 'Color', 120, 165),
  svc('Corrective Color - By The Hour', 'Color', 240, 85, { qual: true, noSameDay: true, lead: 2, reason: 'Senior stylist only' }),
  svc('Glaze Add On', 'Color', 30, 50),
  svc('Root Retouch Add On', 'Color', 60, 50),
  svc('Root Smudge (Add On)', 'Color', 60, 50),
  svc('Lowlight Add On', 'Color', 30, 50),

  // ── Vivids ──
  svc('Full Vivid', 'Vivids', 120, 130),
  svc('Partial Vivid', 'Vivids', 60, 105),
  svc('Mini Vivid', 'Vivids', 60, 95),
  svc('Custom Vivid', 'Vivids', 120, 170),
  svc('Specialty Vivid', 'Vivids', 90, 150),
  svc('Vivid Toner', 'Vivids', 30, 25),

  // ── Haircuts ──
  svc('Signature Haircut', 'Haircuts', 60, 75),
  svc('Combo Cut', 'Haircuts', 60, 60),
  svc('Specialty Cut', 'Haircuts', 90, 85),
  svc('Transformation Cut', 'Haircuts', 90, 85),
  svc('Clipper Cut', 'Haircuts', 45, 40),
  svc('Hair Cut - No Style', 'Haircuts', 45, 50),
  svc('Buzz Cut', 'Haircuts', 30, 35),
  svc('Haircut (Add On)', 'Haircuts', 30, 50),
  svc('Undercut - No Designs', 'Haircuts', 30, 25),
  svc('Maintenance Cut', 'Haircuts', 15, 15),

  // ── Styling ──
  svc('Blowout', 'Styling', 45, 50),
  svc('Special Event Styling', 'Styling', 90, 85),
  svc('Merm', 'Styling', 90, 85),
  svc('Hot Tool Style Stand Alone', 'Styling', 30, 30),
  svc('Hot Tool Style Add On', 'Styling', 15, 15),

  // ── Extensions ──
  svc('1 Row Initial Install', 'Extensions', 90, 150),
  svc('1 Row Reinstall', 'Extensions', 90, 100),
  svc('2 Row Initial Install', 'Extensions', 120, 250),
  svc('2 Row Reinstall', 'Extensions', 120, 200),
  svc('3 Row Initial Install', 'Extensions', 180, 350),
  svc('3 Row Reinstall', 'Extensions', 180, 300),
  svc('Tape In Install - Per Tab', 'Extensions', 30, 15),
  svc('Tape Removal', 'Extensions', 45, 65),
  svc('Weft Removal', 'Extensions', 30, 50),
  svc('Extension Wash and Blowout', 'Extensions', 60, 65),
  svc('Extension Glaze Add On', 'Extensions', 45, 50),
  svc('Extension Root Smudge + Lowlight Add On', 'Extensions', 45, 50),
  svc('Extension Vivid Add On', 'Extensions', 45, 75),

  // ── Extras ──
  svc('Deep Conditioning Treatment', 'Extras', 15, 25),
  svc('CPR Treatment', 'Extras', 90, 50),
  svc('Clear Gloss Add On', 'Extras', 30, 50),
  svc('K18 Treatment Add-On', 'Extras', 20, 15),
  svc('Scalp Treatment', 'Extras', 15, 25),
  svc('Hard Water Detox Treatment', 'Extras', 30, 30),
  svc('Color Remover', 'Extras', 45, 45),
  svc('Extra Long Head Massage', 'Extras', 5, 10),
  svc('Tinsel Add On', 'Extras', 30, 10),

  // ── New Client Consultation ──
  svc('New-Client Consultation', 'New Client Consultation', 15, 15),
  svc('Extension Consultation', 'New Client Consultation', 30, 15),
];

export const DEMO_SERVICES_BY_CATEGORY = (() => {
  const grouped: Record<string, DemoService[]> = {};
  for (const s of DEMO_SERVICES) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }
  return grouped;
})();

// ─── Mock Clients (for demo booking flow) ────────────────────
export interface DemoClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export const DEMO_CLIENTS: DemoClient[] = [
  { id: 'demo-client-1', phorest_client_id: 'demo-pc-1', name: 'Sarah Mitchell', email: 'sarah.m@example.com', phone: '(480) 555-0101' },
  { id: 'demo-client-2', phorest_client_id: 'demo-pc-2', name: 'Jessica Chen', email: 'jchen@example.com', phone: '(480) 555-0102' },
  { id: 'demo-client-3', phorest_client_id: 'demo-pc-3', name: 'Emily Rodriguez', email: 'emily.r@example.com', phone: '(602) 555-0103' },
  { id: 'demo-client-4', phorest_client_id: 'demo-pc-4', name: 'Amanda Park', email: 'apark@example.com', phone: '(480) 555-0104' },
  { id: 'demo-client-5', phorest_client_id: 'demo-pc-5', name: 'Lauren Taylor', email: 'ltaylor@example.com', phone: '(602) 555-0105' },
  { id: 'demo-client-6', phorest_client_id: 'demo-pc-6', name: 'Maria Gonzalez', email: 'maria.g@example.com', phone: '(480) 555-0106' },
  { id: 'demo-client-7', phorest_client_id: 'demo-pc-7', name: 'Rachel Kim', email: 'rkim@example.com', phone: '(602) 555-0107' },
  { id: 'demo-client-8', phorest_client_id: 'demo-pc-8', name: 'Olivia Barnes', email: 'obarnes@example.com', phone: '(480) 555-0108' },
  { id: 'demo-client-9', phorest_client_id: 'demo-pc-9', name: 'Megan Foster', email: 'mfoster@example.com', phone: '(602) 555-0109' },
  { id: 'demo-client-10', phorest_client_id: 'demo-pc-10', name: 'Danielle Wright', email: 'dwright@example.com', phone: '(480) 555-0110' },
  { id: 'demo-client-11', phorest_client_id: 'demo-pc-11', name: 'Natalie Brooks', email: 'nbrooks@example.com', phone: '(602) 555-0111' },
];

export function searchDemoClients(query: string): DemoClient[] {
  const q = query.toLowerCase();
  return DEMO_CLIENTS.filter(
    (c) => c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
  );
}
