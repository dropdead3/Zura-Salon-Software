

# Operational Task Engine Architecture — Zura Backroom

## Current State

**Existing `tasks` table**: Personal employee tasks scoped by `user_id`. Supports title, description, priority, due_date, completion, recurrence, snoozing. RLS is user-scoped (`auth.uid() = user_id`). No organization scope. No linkage to exceptions, entities, or operational rules. This is a personal productivity tool — not an operational task system.

**Existing `backroom_exceptions`**: Org-scoped, tracks operational issues with type/severity/status/resolution. No assignment, no due timing, no escalation, no task linkage.

**Gap**: No mechanism to turn exceptions or operational conditions into assigned, trackable, escalatable work items. These are two completely separate systems that need a bridge — the Operational Task Engine.

## Architecture Overview

```text
Operational Condition (rule fires)
  → ExceptionService creates exception (optional)
  → TaskRuleEngine evaluates condition
  → OperationalTaskService creates operational_task
  → Assignment routing applies
  → Task appears in manager inbox
  → Escalation timer starts
  → Resolution audited
```

Three distinct concepts maintained:
- **Event**: Something happened (mix_session_event, stock_movement)
- **Exception**: A rule was violated (backroom_exceptions record)
- **Operational Task**: Action required from a human (operational_tasks record)

## Entity Schema: `operational_tasks`

```sql
CREATE TABLE public.operational_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id TEXT,

  -- What
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,           -- 'missing_reweigh_review', 'po_approval', 'stockout_reorder', etc.
  priority TEXT NOT NULL DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'open',      -- see state machine below
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_role TEXT,                -- fallback: visible to anyone with this role
  assigned_at TIMESTAMPTZ,
  
  -- Timing
  due_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalation_level INTEGER DEFAULT 0,
  
  -- Source linkage
  source_type TEXT NOT NULL,         -- 'exception', 'replenishment', 'purchasing', 'billing', 'inventory'
  source_id UUID,                    -- FK to backroom_exceptions.id, purchase_orders.id, etc.
  source_rule TEXT,                  -- rule name that created this task
  
  -- Entity linkage
  reference_type TEXT,               -- 'mix_session', 'purchase_order', 'product', 'appointment'
  reference_id UUID,
  
  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_action TEXT,            -- 'completed', 'dismissed', 'expired'
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**: org+status, org+task_type, assigned_to+status, source_type+source_id, due_at.

**RLS**: Org members can SELECT. Org admins and assigned user can UPDATE. System/service can INSERT.

## Task Lifecycle State Machine

```text
open → assigned → in_progress → resolved
                              → dismissed
       open → expired (via escalation timer)
       assigned → blocked → in_progress
       any active state → escalated (increases escalation_level, may reassign)
```

Valid states: `open`, `assigned`, `in_progress`, `blocked`, `resolved`, `dismissed`, `expired`

Transitions:
- `open` → `assigned` (manual or auto-routing)
- `assigned` → `in_progress` (assignee starts work)
- `in_progress` → `resolved` | `dismissed`
- `in_progress` → `blocked` → `in_progress`
- Any active → escalation increases `escalation_level`, may change `assigned_to`
- Unresolved past `due_at` → `expired` (via daily edge function)

## Task History Table: `operational_task_history`

```sql
CREATE TABLE public.operational_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES operational_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,              -- 'created', 'assigned', 'status_changed', 'escalated', 'resolved'
  previous_status TEXT,
  new_status TEXT,
  previous_assigned_to UUID,
  new_assigned_to UUID,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Task Creation Rules

| Condition | Exception Type | Task Type | Priority | Default Assignee | Due |
|---|---|---|---|---|---|
| Missing reweigh on completed session | `missing_reweigh` | `missing_reweigh_review` | high | Location manager | +24h |
| Manual override used | `manual_override_used` | `manual_override_review` | normal | Location manager | +24h |
| Usage charge requires manager review | (billing flag) | `charge_override_review` | high | Manager on duty | +4h |
| PO awaiting approval | (PO status) | `po_approval` | normal | Owner/purchasing mgr | +48h |
| Stockout risk critical | `stockout_risk` | `stockout_reorder` | urgent | Inventory manager | +24h |
| Receiving discrepancy | `receiving_discrepancy` | `receiving_review` | high | Warehouse manager | +24h |
| Ghost loss detected | `ghost_loss` | `ghost_loss_investigation` | high | Location manager | +48h |
| Negative inventory | `negative_inventory` | `negative_inventory_resolve` | urgent | Inventory manager | +12h |

Rules are evaluated by a `TaskRuleEngine` service that maps exception types and operational conditions to task creation parameters.

## Assignment & Routing Rules

1. **Rule-based default**: Each task type has a default role. Task is created with `assigned_role` and optionally auto-assigned to a specific user if the org has configured a default assignee for that role+location.
2. **Location-based**: Tasks inherit `location_id` from source. Assignment routing uses location to find the right manager.
3. **Manual override**: Any manager can reassign tasks from the inbox.
4. **Queue visibility**: Tasks with only `assigned_role` (no specific `assigned_to`) are visible to all users with that role in the org/location.

## Escalation Strategy

Evaluated by a daily edge function (or extend existing `generate-backroom-snapshots`):

1. Task past `due_at` and still `open`/`assigned` → escalation_level +1
2. Level 1: Reassign to next-level manager, increase priority
3. Level 2: Notify owner, mark urgent
4. Level 3: Auto-expire with audit trail

## Service Layer

**New file**: `src/lib/backroom/services/operational-task-service.ts`

Functions:
- `createOperationalTask(params)` — Creates task + history entry
- `assignTask(taskId, userId)` — Assigns + history
- `updateTaskStatus(taskId, newStatus, notes)` — Transition + history
- `resolveTask(taskId, action, notes)` — Close + history
- `escalateTask(taskId)` — Bump level + reassign + history

**New file**: `src/lib/backroom/services/task-rule-engine.ts`

Functions:
- `evaluateExceptionForTask(exception)` — Maps exception → task creation params
- `evaluateConditionForTask(conditionType, context)` — For non-exception sources (PO status, billing flags)

## Hook Layer

**New file**: `src/hooks/backroom/useOperationalTasks.ts`

- Query operational tasks by org, filtered by status/type/assignee/location
- Mutations for assign, status change, resolve (via command layer)

## Read Models

No separate projection needed initially — `operational_tasks` itself is the read model. Filter by:
- Manager inbox: `status IN ('open','assigned') AND (assigned_to = me OR assigned_role IN (my_roles))`
- Owner queue: all tasks for org, priority desc
- Location view: filtered by location_id
- Entity view: filtered by reference_type + reference_id

## Relationship to Existing Systems

- **`backroom_exceptions`** remains unchanged. When an exception is created, `TaskRuleEngine.evaluateExceptionForTask()` decides whether to also create an operational task.
- **`tasks` (personal)** remains separate. Personal productivity tasks are user-scoped. Operational tasks are org-scoped with assignment and escalation.
- **Notifications**: Out of scope for this layer. A future notification service can subscribe to operational task creation/escalation events.

## Exception → Task Auto-Generation Rules

Auto-generate task when exception severity is `warning` or `critical` AND exception type is in the configured task-generating set. Informational exceptions (`severity = 'info'`) do not auto-generate tasks unless explicitly configured.

## Command Layer Integration

New commands in `src/lib/backroom/commands/task-commands.ts`:
- `AssignOperationalTask`
- `UpdateOperationalTaskStatus`
- `ResolveOperationalTask`
- `EscalateOperationalTask`

Each flows through validation → service → audit, consistent with existing command architecture.

## Implementation Order

1. **Migration**: Create `operational_tasks` + `operational_task_history` tables with RLS + indexes
2. **Service**: `operational-task-service.ts` (CRUD + history tracking)
3. **Rule engine**: `task-rule-engine.ts` (exception-to-task mapping)
4. **Commands + validators**: `task-commands.ts` + `task-validators.ts`
5. **Hook**: `useOperationalTasks.ts`
6. **Wire ExceptionService**: After creating an exception, call TaskRuleEngine to optionally create a task
7. **Escalation**: Add escalation logic to daily edge function

## Risks

| Risk | Mitigation |
|---|---|
| Task spam from high-frequency exceptions | Dedup: one open task per source_type+source_id; don't create if active task exists |
| Assignment routing complexity | Start with role-based queues, add user-level routing later |
| Escalation edge function timeout | Process by org, paginate |
| Confusion between personal tasks and operational tasks | Completely separate tables, hooks, and UI surfaces |

