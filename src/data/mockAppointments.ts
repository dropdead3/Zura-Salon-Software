import { format, addMinutes } from 'date-fns';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';

export interface MockAppointmentConfig {
  date: Date;
  stylistIds: string[];
  locationId: string;
}

// Realistic client names
const SAMPLE_CLIENTS = [
  { name: 'Sarah Mitchell', phone: '(480) 555-0123' },
  { name: 'Jessica Chen', phone: '(602) 555-0456' },
  { name: 'Amanda Rodriguez', phone: '(480) 555-0789' },
  { name: 'Michael Thompson', phone: '(623) 555-0234' },
  { name: 'Emily Parker', phone: '(480) 555-0567' },
  { name: 'David Wilson', phone: '(602) 555-0890' },
  { name: 'Sophia Lee', phone: '(480) 555-0321' },
  { name: 'Olivia Martinez', phone: '(623) 555-0654' },
  { name: 'Emma Johnson', phone: '(480) 555-0987' },
  { name: 'Ava Williams', phone: '(602) 555-0147' },
  { name: 'Isabella Brown', phone: '(480) 555-0258' },
  { name: 'Mia Davis', phone: '(623) 555-0369' },
  { name: 'Charlotte Wilson', phone: '(480) 555-1234' },
  { name: 'Amelia Garcia', phone: '(602) 555-5678' },
];

// Service templates covering all categories
const SERVICE_TEMPLATES = [
  { name: 'New Client Consultation', category: 'New Client Consultation', duration: 30, price: 0 },
  { name: 'Precision Haircut', category: 'Haircut', duration: 45, price: 65 },
  { name: 'Full Balayage', category: 'Blonding', duration: 180, price: 240 },
  { name: 'Partial Highlight', category: 'Blonding', duration: 150, price: 185 },
  { name: 'Single Process Color', category: 'Color', duration: 90, price: 95 },
  { name: 'Color Correction', category: 'Color', duration: 240, price: 350 },
  { name: 'Hand-Tied Extensions', category: 'Extensions', duration: 180, price: 850 },
  { name: 'Extension Move-Up', category: 'Extensions', duration: 120, price: 250 },
  { name: 'Blowout & Style', category: 'Styling', duration: 45, price: 55 },
  { name: 'Updo', category: 'Styling', duration: 60, price: 85 },
  { name: 'Deep Conditioning', category: 'Extras', duration: 30, price: 35 },
  { name: 'Olaplex Treatment', category: 'Extras', duration: 30, price: 45 },
  { name: 'Lunch Break', category: 'Break', duration: 30, price: 0 },
];

// Status distribution to test all visual states
const STATUS_OPTIONS: PhorestAppointment['status'][] = [
  'booked',
  'booked', 
  'booked',
  'confirmed',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
];

// Generate time slots at 15-minute increments
const generateTimeSlots = (hoursStart: number, hoursEnd: number): string[] => {
  const slots: string[] = [];
  for (let hour = hoursStart; hour < hoursEnd; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

// Shuffle array helper
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Generate mock appointments for testing calendar UI
 * Covers all visual scenarios: statuses, categories, durations, overlaps
 */
export function generateMockAppointments(config: MockAppointmentConfig): PhorestAppointment[] {
  const { date, stylistIds, locationId } = config;
  
  if (stylistIds.length === 0) return [];
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const timeSlots = generateTimeSlots(8, 17); // 8 AM to 5 PM
  const shuffledSlots = shuffleArray(timeSlots);
  const shuffledClients = shuffleArray(SAMPLE_CLIENTS);
  const shuffledServices = shuffleArray(SERVICE_TEMPLATES);
  
  const appointments: PhorestAppointment[] = [];
  
  // Generate 12-15 appointments
  const appointmentCount = Math.min(15, Math.max(12, stylistIds.length * 3));
  
  for (let i = 0; i < appointmentCount && i < shuffledSlots.length; i++) {
    const startTime = shuffledSlots[i];
    const client = shuffledClients[i % shuffledClients.length];
    const service = shuffledServices[i % shuffledServices.length];
    const stylistId = stylistIds[i % stylistIds.length];
    const status = STATUS_OPTIONS[i % STATUS_OPTIONS.length];
    
    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, service.duration);
    const endTime = format(endDate, 'HH:mm');
    
    // Determine if this is a new client (for consultation services)
    const isNewClient = service.category === 'New Client Consultation' || Math.random() > 0.7;
    
    const appointment: PhorestAppointment = {
      id: `demo-${i}-${Date.now()}`,
      phorest_id: `demo-phorest-${i}`,
      location_id: locationId,
      appointment_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      status,
      client_name: client.name,
      client_phone: client.phone,
      stylist_user_id: stylistId,
      phorest_staff_id: null,
      service_name: service.name,
      service_category: service.category,
      total_price: service.price,
      notes: i === 0 ? 'Demo appointment - VIP client' : null,
      phorest_client_id: `demo-client-${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_new_client: isNewClient,
      recurrence_group_id: null,
      recurrence_index: null,
      recurrence_rule: null,
      is_redo: false,
      redo_reason: null,
      original_appointment_id: null,
      redo_pricing_override: null,
      redo_approved_by: null,
      original_price: null,
    };
    
    appointments.push(appointment);
  }
  
  // Add a few intentionally overlapping appointments to test column layout
  if (stylistIds.length > 1 && appointments.length > 2) {
    // Create an overlap at 10:00 AM for two different stylists
    const overlapTime = '10:00';
    const overlapAppt1: PhorestAppointment = {
      id: `demo-overlap-1-${Date.now()}`,
      phorest_id: 'demo-overlap-1',
      location_id: locationId,
      appointment_date: dateStr,
      start_time: overlapTime,
      end_time: '11:30',
      status: 'confirmed',
      client_name: 'Jennifer Adams',
      client_phone: '(480) 555-9999',
      stylist_user_id: stylistIds[0],
      phorest_staff_id: null,
      service_name: 'Full Color Service',
      service_category: 'Color',
      total_price: 120,
      notes: null,
      phorest_client_id: 'demo-overlap-client-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_new_client: false,
      recurrence_group_id: null,
      recurrence_index: null,
      recurrence_rule: null,
      is_redo: false,
      redo_reason: null,
      original_appointment_id: null,
      redo_pricing_override: null,
      redo_approved_by: null,
      original_price: null,
    };
    
    const overlapAppt2: PhorestAppointment = {
      id: `demo-overlap-2-${Date.now()}`,
      phorest_id: 'demo-overlap-2',
      location_id: locationId,
      appointment_date: dateStr,
      start_time: overlapTime,
      end_time: '11:00',
      status: 'booked',
      client_name: 'Lauren Smith',
      client_phone: '(602) 555-8888',
      stylist_user_id: stylistIds.length > 1 ? stylistIds[1] : stylistIds[0],
      phorest_staff_id: null,
      service_name: 'Blowout & Style',
      service_category: 'Styling',
      total_price: 55,
      notes: null,
      phorest_client_id: 'demo-overlap-client-2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_new_client: false,
      recurrence_group_id: null,
      recurrence_index: null,
      recurrence_rule: null,
      is_redo: false,
      redo_reason: null,
      original_appointment_id: null,
      redo_pricing_override: null,
      redo_approved_by: null,
      original_price: null,
    };
    
    appointments.push(overlapAppt1, overlapAppt2);
  }
  
  // Sort by start time
  return appointments.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Check if an appointment is a demo appointment
 */
export function isDemoAppointment(appointmentId: string): boolean {
  return appointmentId.startsWith('demo-');
}
