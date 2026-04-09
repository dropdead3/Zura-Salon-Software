

# Zura Search Action Execution Framework

## What Exists

- **Query Parser** (`src/lib/queryParser.ts`): Produces `actionIntent: { type, target?, confidence }` with canonical types like `create_client`, `book_appointment`, `send_message`, `process_refund`, `check_in`, `cancel`, etc.
- **Ranking Engine** (`src/lib/searchRanker.ts`): Scores and groups results including `action` type results.
- **Permissions**: `usePermission()` hook with `can()`, `canAny()`, `canAll()` checks.
- **Toast system**: `useToast()` for feedback.
- **Command Surface** (`ZuraCommandSurface.tsx`): Currently only navigates on result selection — no action execution.
- **Autonomy doctrine**: "Recommend → Simulate → Request Approval → Execute" for semi-autonomous actions. Destructive actions (deletions, refunds, financial changes) are never autonomous.

## Architecture

```text
src/lib/actionRegistry.ts           ← Pure: action definitions + validation
src/hooks/useActionExecution.ts     ← React hook: orchestrates detection → validation → confirmation → execution → feedback
```

No new UI components — action states (input completion, confirmation, feedback) render inline within the existing `ZuraCommandSurface` panel via state-driven conditional rendering in a small update to `ZuraCommandSurface.tsx`.

## File 1: `src/lib/actionRegistry.ts`

### Types

```typescript
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ActionDefinition {
  id: string;                          // canonical type from parser (e.g. "create_client")
  label: string;                       // human-readable ("Add New Client")
  requiredInputs: InputField[];        // what's needed to execute
  optionalInputs?: InputField[];       // nice-to-have fields
  permissions: string[];               // required permissions (empty = anyone)
  riskLevel: RiskLevel;                // drives confirmation behavior
  confirmationMessage?: string;        // custom confirm text for high-risk
  confidenceThreshold: number;         // minimum actionIntent.confidence to trigger
}

export interface InputField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select';
  extractFromTarget?: boolean;         // auto-fill from parsed target token
}

export interface ActionExecutionRequest {
  actionId: string;
  inputs: Record<string, string>;
  confirmed: boolean;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  nextActions?: { label: string; actionId?: string; path?: string }[];
  error?: string;
}
```

### Registry

Initial actions (Phase 1 scope — navigation and lightweight mutations only):

| Action ID | Label | Required Inputs | Risk | Permissions |
|-----------|-------|----------------|------|-------------|
| `navigate_page` | Go to Page | `[path]` | low | `[]` |
| `create_client` | Add New Client | `[name]` + optional `[phone, email]` | low | `['clients.manage']` |
| `book_appointment` | Book Appointment | `[client_name]` | medium | `['create_appointments']` |
| `send_message` | Send Message | `[recipient, message]` | low | `['team_chat.send']` |
| `check_in` | Check In Client | `[client_name]` | low | `['appointments.manage']` |
| `process_refund` | Process Refund | `[transaction_id]` | **high** | `['transactions.refund']` |
| `cancel_appointment` | Cancel Appointment | `[appointment_id]` | **high** | `['appointments.manage']` |

### Validation Functions

```typescript
function getAction(actionId: string): ActionDefinition | null
function validateInputs(action: ActionDefinition, inputs: Record<string, string>): { valid: boolean; missing: InputField[] }
function requiresConfirmation(action: ActionDefinition): boolean  // true if riskLevel === 'high'
function checkPermissions(action: ActionDefinition, userPermissions: string[]): boolean
```

### Safety Rules (Hardcoded)

- `process_refund`, `cancel_appointment`, `delete_*` → always `riskLevel: 'high'`, always require confirmation
- No action executes if `confidence < confidenceThreshold` (default 0.75)
- No action executes without permission check passing
- No silent failures — every execution path returns an `ActionExecutionResult`

## File 2: `src/hooks/useActionExecution.ts`

React hook that manages the full action lifecycle:

```typescript
export function useActionExecution() → {
  // State
  activeAction: ActionDefinition | null;
  actionState: 'idle' | 'input_needed' | 'confirming' | 'executing' | 'success' | 'error';
  missingInputs: InputField[];
  collectedInputs: Record<string, string>;
  result: ActionExecutionResult | null;

  // Methods
  detectAndPrepare(parsedQuery: ParsedQuery, permissions: string[]): void;
  provideInput(key: string, value: string): void;
  confirm(): void;
  cancel(): void;
  reset(): void;
}
```

### Execution Flow

```text
parsedQuery.actionIntent
        │
        ▼
  confidence > threshold?  ──no──→ return (no action state)
        │ yes
        ▼
  permission check  ──fail──→ actionState = 'error', message = "Permission denied"
        │ pass
        ▼
  extract inputs from target token
        │
        ▼
  missing required inputs?  ──yes──→ actionState = 'input_needed'
        │ no                              │
        ▼                           user provides inputs
  riskLevel === 'high'?                   │
        │ yes                             ▼
        ▼                           re-check → continue
  actionState = 'confirming'
        │
  user confirms ──no──→ cancel()
        │ yes
        ▼
  actionState = 'executing'
        │
        ▼
  call execution handler
        │
    ┌───┴───┐
  success  error
    │        │
    ▼        ▼
  show result + next actions    show error + fallback
```

### Execution Handlers

The hook does NOT contain business logic. It delegates to existing hooks/functions:

- `create_client` → navigates to `/dashboard/clients?action=new&name={name}` (reuse existing client creation flow)
- `book_appointment` → navigates to `/dashboard/schedule?action=book&client={name}`
- `send_message` → navigates to `/dashboard/team-chat?to={recipient}`
- `navigate_page` → `navigate(path)`
- `check_in` → navigates to appointment detail with check-in pre-selected
- `process_refund` / `cancel_appointment` → navigates to relevant detail page with action pre-selected (does NOT execute directly from search — routes to the existing UI with confirmation)

This approach means: **no business logic duplication**. High-risk actions route to their existing UIs where the full confirmation and execution flow already exists. Low-risk actions either navigate or perform lightweight mutations through existing hooks.

## ZuraCommandSurface Integration

Small update to `ZuraCommandSurface.tsx` to render action states inline:

- **`input_needed`**: Show a compact inline form below the search input with the missing fields + submit button
- **`confirming`**: Show a confirmation card: "{action label}? This cannot be undone." + Confirm/Cancel buttons
- **`executing`**: Show a spinner with action label
- **`success`**: Show success message + next action links (e.g., "View Client", "Book Another")
- **`error`**: Show error message + "Try Again" or fallback navigation link

All states render inside the existing result panel area — no new dialogs or overlays.

## Example Flows

**"Add client Sarah"**
1. Parser: `actionIntent = { type: 'create_client', target: 'Sarah', confidence: 0.9 }`
2. Registry lookup → `create_client`, required: `[name]`, name extracted from target = "Sarah"
3. Optional inputs missing (phone, email) → `actionState = 'input_needed'`
4. User can skip optionals → executes: navigates to `/dashboard/clients?action=new&name=Sarah`
5. Success: "Opening client creation for Sarah" + next action: "Book Appointment"

**"Refund last transaction"**
1. Parser: `actionIntent = { type: 'process_refund', target: 'last transaction', confidence: 0.9 }`
2. Registry: `riskLevel: 'high'`, permission check passes
3. `actionState = 'confirming'`: "Process a refund? You'll be taken to the transaction detail to complete this."
4. User confirms → navigates to transactions page with refund context
5. Actual refund happens in existing transaction UI (not from search)

**"Schedule meeting"** (no matching action)
1. Parser: `actionIntent = { type: 'schedule', confidence: 0.6 }` — below threshold
2. No action triggered, falls through to normal search results

## Safety Self-Audit

- **No destructive actions execute from search** — high-risk actions route to existing UIs
- **Permission check before any state transition** — denied users see error, not the action flow
- **Confidence gating** — low-confidence intents never trigger action mode
- **No silent failures** — every path produces visible feedback
- **No business logic duplication** — handlers delegate to existing routes/hooks
- **Autonomy doctrine compliance** — search actions are "Recommend → Approve → Navigate", never auto-execute

## Files Summary

| File | Purpose |
|------|---------|
| `src/lib/actionRegistry.ts` | Action definitions, validation, permission checks |
| `src/hooks/useActionExecution.ts` | Lifecycle hook: detect → input → confirm → execute → feedback |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Minor update: render action states inline in result panel |

No database changes. No edge functions. No modifications to parser or ranker.

