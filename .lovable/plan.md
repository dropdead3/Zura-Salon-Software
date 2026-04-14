

# Guided Test Appointment — Zura-Native (No Phorest)

## What changed from previous plan
The previous plan incorrectly inserted into `phorest_appointments` with a `phorest_id`. This revision uses the **Zura-native `appointments` table** exclusively, with `import_source: 'zura_test'` to tag it as a test record. Zero Phorest coupling.

## Changes

### 1. `ZuraPayActivationChecklist.tsx` — Add guided test appointment flow

**New props**: `organizationId`, `locationId`, `userId`, `userName`

**New state**: `creatingTestAppt` (loading), `testApptCreated` (success)

**`handleCreateTestAppt` function** — inserts into the native `appointments` table:
- `organization_id`: from props
- `location_id`: from props
- `staff_user_id`: current user
- `staff_name`: current user's name
- `client_name`: "Test Client"
- `service_name`: "Zura Pay Test Checkout"
- `appointment_date`: today
- `start_time`: now + 15 min (rounded to nearest 15)
- `end_time`: start + 30 min
- `duration_minutes`: 30
- `total_price`: 0.50
- `status`: "confirmed"
- `import_source`: "zura_test"
- `notes`: "Auto-created for Zura Pay activation test"

**UI for the "First Transaction" step** (when it's the current step):
- Before creation: amber panel with copy — *"We'll create a $0.50 test appointment on today's schedule so you can practice the full checkout flow."* + **"Create Test Appointment"** button
- After creation: success state with **"View Today's Schedule →"** link navigating to `/schedule`

### 2. `TerminalSettingsContent.tsx` — Pass context props

Pass `organizationId`, `locationId`, `userId`, and `userName` down to the checklist component. Import `useAuth` for user context.

### 3. Cleanup consideration

The `import_source: 'zura_test'` tag makes it easy to filter or delete test appointments later — no Phorest tables touched, no write-back risk.

## Files
- **Edit**: `src/components/dashboard/settings/terminal/ZuraPayActivationChecklist.tsx`
- **Edit**: `src/components/dashboard/settings/TerminalSettingsContent.tsx`

