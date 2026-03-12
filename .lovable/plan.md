

# Command + Validation Layer Architecture

## Current State

The domain services already exist in `src/lib/backroom/services/`. The mix-session-service already has basic event-type validation (`validateEventForStatus`). However, no formal command objects, validation pipeline, or audit trail exist. Services accept raw parameters and execute directly — there's no structured command layer between the UI hooks and the service functions.

## Architecture Overview

```text
UI Hook (intent)
  → Command object (typed payload + initiator)
  → Validation pipeline (deterministic checks)
  → Domain service (mutation)
  → Event/audit record (outcome)
```

This is implemented as a thin TypeScript layer — not a framework. Each domain gets a commands file defining typed command objects, a validators file with pure validation functions, and command handler functions that wire validation → service → audit.

## File Structure

```text
src/lib/backroom/
  commands/
    types.ts                    ← Shared CommandResult, ValidationError, AuditEntry types
    mixing-commands.ts          ← Mix session command definitions + handlers
    mixing-validators.ts       ← Pure validation functions for mixing commands
    inventory-commands.ts       ← Inventory command definitions + handlers
    inventory-validators.ts    ← Pure validation functions for inventory commands
    purchasing-commands.ts     ← PO command definitions + handlers
    purchasing-validators.ts   ← Pure validation for purchasing
    billing-commands.ts        ← Allowance/checkout command definitions + handlers
    billing-validators.ts     ← Pure validation for billing
    exception-commands.ts      ← Exception resolution commands + handlers
    exception-validators.ts   ← Pure validation for exceptions
```

## Shared Types (`commands/types.ts`)

```typescript
export interface CommandMeta {
  initiated_by: string;        // user ID
  initiated_at: string;        // ISO timestamp
  idempotency_key: string;     // client-generated UUID
  source: 'ui' | 'system' | 'offline_sync' | 'background_job';
  device_id?: string;
  station_id?: string;
}

export interface ValidationError {
  code: string;                // e.g. 'INVALID_STATE_TRANSITION'
  field?: string;
  message: string;
}

export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  idempotency_key: string;
  audited: boolean;
}
```

## Command Catalog by Domain

### Mixing Commands
| Command | Validates | Calls |
|---|---|---|
| `StartMixSession` | session exists, is draft, user has permission | `emitSessionEvent('session_started')` |
| `CreateBowl` | session active, user has permission | `emitSessionEvent('bowl_created')` |
| `CaptureWeight` | session active, bowl open, weight > 0, device valid or manual override | `emitSessionEvent('weight_captured')` |
| `RecordLineItem` | session active, bowl open, product exists, quantity > 0 | `emitSessionEvent('line_item_recorded')` |
| `RemoveLineItem` | session active, bowl open, line exists | `emitSessionEvent('line_item_removed')` |
| `SealBowl` | session active, bowl open, has lines | `emitSessionEvent('bowl_sealed')` |
| `CaptureReweigh` | session awaiting_reweigh, bowl sealed, weight >= 0 | `emitSessionEvent('reweigh_captured')` |
| `CompleteSession` | session awaiting_reweigh, all bowls sealed | `emitSessionEvent('session_completed')` |
| `MarkSessionUnresolved` | session awaiting_reweigh | `emitSessionEvent('session_marked_unresolved')` |

### Inventory Commands
| Command | Validates | Calls |
|---|---|---|
| `PostUsageDepletion` | session completed, org exists | `InventoryLedgerService.postUsageFromSession()` |
| `CreateCountAdjustment` | product exists, quantity valid, user has permission | `InventoryLedgerService.postLedgerEntry()` |
| `CreateTransfer` | product exists, locations valid, quantity > 0 | `InventoryLedgerService.postTransfer()` |
| `PostWaste` | product exists, quantity > 0, reason provided | `InventoryLedgerService.postLedgerEntry()` |

### Purchasing Commands
| Command | Validates | Calls |
|---|---|---|
| `ReceiveShipment` | PO exists, PO status allows receiving, quantities non-negative | `PurchasingService.receiveShipment()` |

### Billing Commands
| Command | Validates | Calls |
|---|---|---|
| `ComputeCheckoutCharge` | session completed, allowance policy exists | `AllowanceBillingService.computeAndStoreCheckoutProjection()` |
| `ApplyChargeOverride` | projection exists, user is manager, reason provided | update checkout_usage_projections |

### Exception Commands
| Command | Validates | Calls |
|---|---|---|
| `ResolveException` | exception exists, status allows action, user has permission | `ExceptionService.resolveException()` |

## Validation Categories

Each validator receives the command payload + current state and returns `ValidationError[]`:

1. **Identity** — user authenticated, has required role
2. **State transition** — entity is in valid state for this action (uses existing state machines)
3. **Referential** — referenced entities exist (session, bowl, product, PO)
4. **Business rules** — quantities positive, weight valid, reason provided for overrides
5. **Idempotency** — idempotency_key not already processed
6. **Sequencing** — for mix events, sequence_number is monotonic

Validators are **pure functions** — they receive pre-fetched state, no DB calls inside validators.

## Command Handler Pattern

```typescript
// Example: mixing-commands.ts
export async function executeCaptureWeight(
  command: CaptureWeightCommand
): Promise<CommandResult> {
  // 1. Fetch current state
  const session = await fetchSessionProjection(command.mix_session_id);
  const bowl = await fetchBowlState(command.bowl_id);
  
  // 2. Validate (pure function)
  const errors = validateCaptureWeight(command, session, bowl);
  if (errors.length > 0) {
    await logCommandAudit(command, 'rejected', errors);
    return { success: false, errors, idempotency_key: command.meta.idempotency_key, audited: true };
  }
  
  // 3. Execute via domain service
  const event = await emitSessionEvent({
    mix_session_id: command.mix_session_id,
    organization_id: command.organization_id,
    event_type: 'weight_captured',
    event_payload: { bowl_id: command.bowl_id, weight: command.weight, unit: command.unit },
    source_mode: command.capture_method,
    device_id: command.meta.device_id,
  }, session.current_status);
  
  // 4. Audit
  await logCommandAudit(command, 'executed', [], event?.id);
  return { success: true, idempotency_key: command.meta.idempotency_key, audited: true };
}
```

## Idempotency Strategy

- Every command carries a client-generated `idempotency_key` in `CommandMeta`
- For mix events: the existing `idempotency_key` UNIQUE constraint on `mix_session_events` handles deduplication at DB level
- For inventory commands: check `stock_movements` for existing `reference_id` + `reference_type` combination before posting
- For purchasing: check `receiving_records` for existing PO + timestamp combination
- Safe replay: duplicate commands return `{ success: true }` without re-executing

## Audit Logging Strategy

Create a `command_audit_log` table:

```sql
CREATE TABLE public.command_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  command_name TEXT NOT NULL,
  command_payload JSONB NOT NULL,
  idempotency_key TEXT,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  outcome TEXT NOT NULL,          -- 'executed' | 'rejected' | 'duplicate'
  validation_errors JSONB,
  result_entity_type TEXT,
  result_entity_id TEXT,
  source TEXT DEFAULT 'ui'
);
```

RLS: authenticated users can INSERT (own org); only managers can SELECT.

## Valid Command Flows

**Normal mix session:**
`StartMixSession` → `CreateBowl` → `RecordLineItem` × N → `SealBowl` → `CaptureReweigh` → `CompleteSession` → `PostUsageDepletion` → `ComputeCheckoutCharge`

**Manual override session:**
`StartMixSession` → `CreateBowl` → `CaptureWeight(manual_override=true)` → `RecordLineItem` → `SealBowl` → `MarkSessionUnresolved`
→ Exception auto-created for `manual_override_used`

**PO receiving:**
`ReceiveShipment` → (internally) `InventoryLedgerService.postReceiving()` per line

**Usage charge override:**
`ComputeCheckoutCharge` → manager reviews → `ApplyChargeOverride(reason, new_amount)`

## Forbidden Patterns

- UI hooks calling domain services directly without going through command handlers
- Validators making DB calls (they receive pre-fetched state)
- Command handlers containing business logic (they delegate to services)
- Background jobs bypassing command validation
- Direct `supabase.from().insert()` for operational tables outside service functions

## Implementation Plan

1. **Migration**: Create `command_audit_log` table with RLS
2. **Shared types**: Create `commands/types.ts` with `CommandMeta`, `CommandResult`, `ValidationError`, audit logging helper
3. **Mixing commands**: Create `mixing-commands.ts` + `mixing-validators.ts` — wraps existing `emitSessionEvent()` with formal validation
4. **Inventory commands**: Create `inventory-commands.ts` + `inventory-validators.ts` — wraps `InventoryLedgerService` calls
5. **Purchasing commands**: Create `purchasing-commands.ts` + `purchasing-validators.ts` — wraps `PurchasingService`
6. **Billing + Exception commands**: Create remaining command/validator pairs
7. **Refactor hooks**: Update hooks to call command handlers instead of services directly

No changes to existing services — the command layer sits above them.

