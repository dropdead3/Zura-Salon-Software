/**
 * dockDemoData — Static mock data for Dock demo mode.
 * Used when staff.userId === 'dev-bypass-000'.
 */

import { format, addMinutes, subMinutes } from 'date-fns';
import type { DockAppointment } from './useDockAppointments';
import type { DockProduct } from './useDockProductCatalog';
import type { DockMixSession } from './useDockMixSessions';

const today = format(new Date(), 'yyyy-MM-dd');
const now = new Date();

function timeStr(date: Date) {
  return format(date, 'HH:mm:ss');
}

// ─── Mock Appointments ───────────────────────────────────────
export const DEMO_APPOINTMENTS: DockAppointment[] = [
  {
    id: 'demo-appt-1',
    source: 'local',
    client_name: 'Sarah Mitchell',
    service_name: 'Balayage + Toner',
    appointment_date: today,
    start_time: timeStr(subMinutes(now, 30)),
    end_time: timeStr(addMinutes(now, 60)),
    status: 'checked_in',
    location_id: null,
    client_id: 'demo-client-1',
    notes: 'Wants warm caramel tones, avoid going too ashy',
    has_mix_session: true,
  },
  {
    id: 'demo-appt-2',
    source: 'phorest',
    client_name: 'Jessica Chen',
    service_name: 'Root Touch-Up + Gloss',
    appointment_date: today,
    start_time: timeStr(addMinutes(now, 30)),
    end_time: timeStr(addMinutes(now, 90)),
    status: 'scheduled',
    location_id: null,
    phorest_client_id: 'demo-phorest-1',
    notes: null,
    has_mix_session: false,
  },
  {
    id: 'demo-appt-3',
    source: 'local',
    client_name: 'Emily Rodriguez',
    service_name: 'Full Highlight + Cut',
    appointment_date: today,
    start_time: timeStr(addMinutes(now, 120)),
    end_time: timeStr(addMinutes(now, 240)),
    status: 'scheduled',
    location_id: null,
    client_id: 'demo-client-3',
    notes: 'New client — consultation needed',
    has_mix_session: false,
  },
  {
    id: 'demo-appt-4',
    source: 'phorest',
    client_name: 'Amanda Park',
    service_name: 'Color Correction',
    appointment_date: today,
    start_time: timeStr(subMinutes(now, 180)),
    end_time: timeStr(subMinutes(now, 60)),
    status: 'completed',
    location_id: null,
    phorest_client_id: 'demo-phorest-2',
    notes: 'Fixed banding from previous salon',
    has_mix_session: true,
  },
  {
    id: 'demo-appt-5',
    source: 'local',
    client_name: 'Lauren Taylor',
    service_name: 'Toner Refresh',
    appointment_date: today,
    start_time: timeStr(addMinutes(now, 270)),
    end_time: timeStr(addMinutes(now, 330)),
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
    service_name: 'Vivids (Fashion Color)',
    appointment_date: today,
    start_time: timeStr(subMinutes(now, 300)),
    end_time: timeStr(subMinutes(now, 180)),
    status: 'completed',
    location_id: null,
    phorest_client_id: 'demo-phorest-3',
    notes: 'Purple and magenta panels',
    has_mix_session: true,
  },
];

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

// ─── Mock Services (for demo booking flow) ───────────────────
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

export const DEMO_SERVICES: DemoService[] = [
  { id: 'demo-svc-1', phorest_service_id: 'demo-svc-1', phorest_branch_id: 'demo', name: 'Balayage', category: 'Color', duration_minutes: 120, price: 185, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-2', phorest_service_id: 'demo-svc-2', phorest_branch_id: 'demo', name: 'Root Touch-Up', category: 'Color', duration_minutes: 60, price: 95, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-3', phorest_service_id: 'demo-svc-3', phorest_branch_id: 'demo', name: 'Full Highlight', category: 'Color', duration_minutes: 150, price: 210, requires_qualification: false, is_active: true, allow_same_day_booking: false, lead_time_days: 1, same_day_restriction_reason: 'Requires consultation' },
  { id: 'demo-svc-4', phorest_service_id: 'demo-svc-4', phorest_branch_id: 'demo', name: 'Toner Refresh', category: 'Color', duration_minutes: 30, price: 45, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-5', phorest_service_id: 'demo-svc-5', phorest_branch_id: 'demo', name: 'Color Correction', category: 'Color', duration_minutes: 240, price: 350, requires_qualification: true, is_active: true, allow_same_day_booking: false, lead_time_days: 2, same_day_restriction_reason: 'Senior stylist only' },
  { id: 'demo-svc-6', phorest_service_id: 'demo-svc-6', phorest_branch_id: 'demo', name: 'Women\'s Cut & Style', category: 'Cut', duration_minutes: 45, price: 65, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-7', phorest_service_id: 'demo-svc-7', phorest_branch_id: 'demo', name: 'Men\'s Cut', category: 'Cut', duration_minutes: 30, price: 40, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-8', phorest_service_id: 'demo-svc-8', phorest_branch_id: 'demo', name: 'Blowout', category: 'Styling', duration_minutes: 30, price: 45, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-9', phorest_service_id: 'demo-svc-9', phorest_branch_id: 'demo', name: 'Deep Conditioning Treatment', category: 'Treatment', duration_minutes: 20, price: 35, requires_qualification: false, is_active: true, allow_same_day_booking: true, lead_time_days: 0, same_day_restriction_reason: null },
  { id: 'demo-svc-10', phorest_service_id: 'demo-svc-10', phorest_branch_id: 'demo', name: 'Keratin Smoothing', category: 'Treatment', duration_minutes: 120, price: 275, requires_qualification: true, is_active: true, allow_same_day_booking: false, lead_time_days: 1, same_day_restriction_reason: 'Requires patch test' },
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
];

export function searchDemoClients(query: string): DemoClient[] {
  const q = query.toLowerCase();
  return DEMO_CLIENTS.filter(
    (c) => c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
  );
}
