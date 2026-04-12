

# Booking Surface — Operational Availability + Permission Logic

## Problem

The current booking surface shows **all active stylists** and **hardcoded time slots** with no awareness of:
- Stylist-service qualifications (`phorest_staff_services`, `staff_service_qualifications`)
- Stylist location assignments (`employee_location_schedules`, `location_id`, `location_ids`)
- Real availability (`staff_shifts`, `time_off_requests`, `phorest_appointments`)
- Service constraints (`lead_time_days`, `allow_same_day_booking`, `requires_new_client_consultation`, `requires_qualification`)
- Stylist-specific pricing/duration overrides (`custom_price`, `custom_duration_minutes`)
- Service duration (`duration_minutes`, `processing_time_minutes`, `finishing_time_minutes`)

The `BookingDateTimePicker` uses a static `TIME_SLOTS` array — no real availability whatsoever.

## Database Assets Available

| Table | Key Columns | Purpose |
|---|---|---|
| `services` | `bookable_online`, `lead_time_days`, `allow_same_day_booking`, `requires_new_client_consultation`, `requires_qualification`, `duration_minutes`, `processing_time_minutes` | Service eligibility + constraints |
| `employee_profiles` | `is_booking`, `is_active`, `location_id`, `location_ids`, `stylist_level` | Stylist online visibility |
| `staff_service_qualifications` | `user_id`, `service_id`, `is_active`, `custom_price`, `custom_duration_minutes`, `location_id` | Manual service permissions + overrides |
| `phorest_staff_services` | `phorest_staff_id`, `phorest_service_id`, `is_qualified`, `custom_price`, `custom_duration_minutes` | Synced service permissions + overrides |
| `phorest_staff_mapping` | `user_id`, `phorest_staff_id` | Bridge between user_id and phorest_staff_id |
| `employee_location_schedules` | `user_id`, `location_id`, `work_days` | Which days a stylist works at a location |
| `staff_shifts` | `user_id`, `shift_date`, `start_time`, `end_time`, `status`, `location_id` | Actual shift data |
| `time_off_requests` | `user_id`, `start_date`, `end_date`, `status`, `is_full_day` | Approved time off |
| `phorest_appointments` | `stylist_user_id`, `appointment_date`, `start_time`, `end_time`, `status` | Existing bookings (for slot exclusion) |
| `service_level_prices` | `service_id`, `stylist_level_id`, `price` | Level-based pricing |

## Build Scope

### 1. `useBookingAvailability` Hook (CREATE)
Central availability engine for the booking surface. Server-side filtering for the public booking flow.

**Accepts**: `orgId`, `selectedLocationId`, `selectedServiceName`, `selectedStylistId`, `selectedDate`

**Returns**:
- `eligibleStylists`: Stylists who are `is_booking=true`, active at selected location, qualified for selected service
- `availableSlots`: Real time slots for selected date + stylist, computed from `staff_shifts` minus `phorest_appointments` minus `time_off_requests`
- `serviceDuration`: Resolved duration (stylist override → service base)
- `servicePrice`: Resolved price (stylist override → level price → service base)

### 2. `useBookingEligibleServices` Hook (CREATE)
Filters services based on selected context (location, stylist).

**Logic**:
- Start with `services` where `bookable_online=true`, `is_active=true`
- If stylist selected: filter to services they're qualified for (via `staff_service_qualifications` + `phorest_staff_services`)
- If location selected: filter to services available at that location
- Apply `lead_time_days` / `allow_same_day_booking` constraints to suppress services that can't be booked today
- Flag `requires_new_client_consultation` services

### 3. Update `HostedBookingPage.tsx`
- Replace static stylist query with `useBookingAvailability` data
- Pass `eligibleStylists` to `BookingStylistPicker` (filtered by service + location)
- Pass `eligibleServices` to `BookingServiceBrowser` (filtered by stylist + location)
- When stylist is "any", show union of all eligible stylists' availability
- Validate deep link params: if stylist isn't bookable or service isn't eligible, reset to valid state

### 4. Update `BookingDateTimePicker.tsx`
- Accept `orgId`, `stylistId`, `serviceName`, `locationId` props
- Replace hardcoded `TIME_SLOTS` with real availability from `useBookingAvailability`
- Query `staff_shifts` for working hours on selected date
- Subtract `phorest_appointments` (booked slots) and `time_off_requests`
- Generate available 30-min slots based on service duration
- Show loading skeleton while availability loads
- Handle "no availability" gracefully

### 5. Update `BookingStylistPicker.tsx`
- Accept optional `serviceName` to filter by qualification
- Show "Next available" date hint per stylist (from shift data)
- Hide stylists with zero upcoming availability

### 6. Update `BookingServiceBrowser.tsx`
- Accept resolved price/duration per service (from stylist context when available)
- Show "Consultation Required" badge for `requires_new_client_consultation` services
- Hide services with no eligible online-bookable stylists

### 7. Deep Link Validation
In `HostedBookingPage`, after data loads:
- Validate `?stylist=X` → check `is_booking=true` + exists
- Validate `?service=X` → check `bookable_online=true` + exists
- If invalid, clear the param and show the normal selection step

## Files

| File | Action |
|---|---|
| `src/hooks/useBookingAvailability.ts` | CREATE — availability engine (shifts, appointments, time-off, qualifications) |
| `src/hooks/useBookingEligibleServices.ts` | CREATE — filtered services based on context |
| `src/components/booking-surface/HostedBookingPage.tsx` | UPDATE — wire availability + eligible services |
| `src/components/booking-surface/BookingDateTimePicker.tsx` | UPDATE — real slot computation |
| `src/components/booking-surface/BookingStylistPicker.tsx` | UPDATE — filtered by service qualifications |
| `src/components/booking-surface/BookingServiceBrowser.tsx` | UPDATE — consultation badges, qualification filtering |
| `src/components/booking-surface/BookingServiceCard.tsx` | UPDATE — add duration prop, consultation badge |

## Build Order

1. Create `useBookingAvailability` (core availability queries)
2. Create `useBookingEligibleServices` (service filtering)
3. Update `BookingDateTimePicker` (real slots)
4. Update `BookingStylistPicker` (qualification filtering)
5. Update `BookingServiceBrowser` + `BookingServiceCard` (badges, dynamic pricing)
6. Update `HostedBookingPage` (wire everything together, deep link validation)
7. TypeScript build check

## Technical Notes

- All queries use RLS-safe public reads (services, employee_profiles, staff_shifts are readable)
- `phorest_staff_mapping` bridges `user_id` ↔ `phorest_staff_id` for qualification lookups
- Slot computation: divide shift window into 30-min increments, subtract booked appointments overlapping each slot, check service duration fits remaining gap
- "Any stylist" mode unions all eligible stylists' shifts and shows merged availability
- `staleTime: 60_000` for availability queries (near-real-time but not polling)
- No new database tables needed — all data already exists

