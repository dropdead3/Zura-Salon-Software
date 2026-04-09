/**
 * Zura Search Action Registry
 * Pure functions — no React, no side effects.
 * Defines available actions, validates inputs, checks permissions.
 */

// ─── Types ───────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

export interface InputField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select';
  /** If true, auto-fill from parsedQuery.actionIntent.target */
  extractFromTarget?: boolean;
  required?: boolean;
}

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  requiredInputs: InputField[];
  optionalInputs: InputField[];
  permissions: string[];
  riskLevel: RiskLevel;
  confirmationMessage?: string;
  confidenceThreshold: number;
  /** Route template — {key} placeholders replaced with inputs */
  routeTemplate: string;
}

export interface ActionExecutionRequest {
  actionId: string;
  inputs: Record<string, string>;
  confirmed: boolean;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  navigateTo?: string;
  nextActions?: { label: string; actionId?: string; path?: string }[];
  error?: string;
}

// ─── Registry ────────────────────────────────────────────────

const ACTION_REGISTRY: ActionDefinition[] = [
  {
    id: 'navigate_page',
    label: 'Go to Page',
    description: 'Navigate to a specific page',
    requiredInputs: [{ key: 'path', label: 'Page', type: 'text', extractFromTarget: false }],
    optionalInputs: [],
    permissions: [],
    riskLevel: 'low',
    confidenceThreshold: 0.7,
    routeTemplate: '{path}',
  },
  {
    id: 'create_client',
    label: 'Add New Client',
    description: 'Create a new client record',
    requiredInputs: [
      { key: 'name', label: 'Client Name', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'email', label: 'Email', type: 'email' },
    ],
    permissions: ['clients.manage'],
    riskLevel: 'low',
    confidenceThreshold: 0.75,
    routeTemplate: '/dashboard/clients?action=new&name={name}',
  },
  {
    id: 'book_appointment',
    label: 'Book Appointment',
    description: 'Schedule a new appointment',
    requiredInputs: [
      { key: 'client_name', label: 'Client Name', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [],
    permissions: ['create_appointments'],
    riskLevel: 'medium',
    confidenceThreshold: 0.75,
    routeTemplate: '/dashboard/schedule?action=book&client={client_name}',
  },
  {
    id: 'send_message',
    label: 'Send Message',
    description: 'Send a message to a team member',
    requiredInputs: [
      { key: 'recipient', label: 'Recipient', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [
      { key: 'message', label: 'Message', type: 'text' },
    ],
    permissions: ['team_chat.send'],
    riskLevel: 'low',
    confidenceThreshold: 0.75,
    routeTemplate: '/dashboard/team-chat?to={recipient}',
  },
  {
    id: 'check_in',
    label: 'Check In Client',
    description: 'Check in a client for their appointment',
    requiredInputs: [
      { key: 'client_name', label: 'Client Name', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [],
    permissions: ['appointments.manage'],
    riskLevel: 'low',
    confidenceThreshold: 0.75,
    routeTemplate: '/dashboard/schedule?action=checkin&client={client_name}',
  },
  {
    id: 'process_refund',
    label: 'Process Refund',
    description: 'Process a refund for a transaction',
    requiredInputs: [
      { key: 'transaction_id', label: 'Transaction', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [],
    permissions: ['transactions.refund'],
    riskLevel: 'high',
    confidenceThreshold: 0.85,
    confirmationMessage: 'Process a refund? You\'ll be taken to the transaction detail to complete this action.',
    routeTemplate: '/dashboard/admin/sales?action=refund&transaction={transaction_id}',
  },
  {
    id: 'cancel_appointment',
    label: 'Cancel Appointment',
    description: 'Cancel an existing appointment',
    requiredInputs: [
      { key: 'appointment_id', label: 'Appointment', type: 'text', extractFromTarget: true },
    ],
    optionalInputs: [],
    permissions: ['appointments.manage'],
    riskLevel: 'high',
    confidenceThreshold: 0.85,
    confirmationMessage: 'Cancel this appointment? You\'ll be taken to the appointment detail to confirm.',
    routeTemplate: '/dashboard/schedule?action=cancel&appointment={appointment_id}',
  },
];

// ─── Lookup ──────────────────────────────────────────────────

const registryMap = new Map(ACTION_REGISTRY.map(a => [a.id, a]));

export function getAction(actionId: string): ActionDefinition | null {
  return registryMap.get(actionId) ?? null;
}

export function getAllActions(): ActionDefinition[] {
  return ACTION_REGISTRY;
}

// ─── Validation ──────────────────────────────────────────────

export interface InputValidationResult {
  valid: boolean;
  missing: InputField[];
  collected: Record<string, string>;
}

export function validateInputs(
  action: ActionDefinition,
  inputs: Record<string, string>
): InputValidationResult {
  const missing: InputField[] = [];
  const collected: Record<string, string> = { ...inputs };

  for (const field of action.requiredInputs) {
    const val = inputs[field.key]?.trim();
    if (!val) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    collected,
  };
}

/**
 * Extract initial inputs from the parsed action target.
 * Maps the target string to the first field with extractFromTarget: true.
 */
export function extractInputsFromTarget(
  action: ActionDefinition,
  target?: string
): Record<string, string> {
  const inputs: Record<string, string> = {};
  if (!target) return inputs;

  const targetField = action.requiredInputs.find(f => f.extractFromTarget);
  if (targetField) {
    inputs[targetField.key] = target;
  }

  return inputs;
}

export function requiresConfirmation(action: ActionDefinition): boolean {
  return action.riskLevel === 'high';
}

export function checkPermissions(
  action: ActionDefinition,
  userPermissions: string[]
): boolean {
  if (action.permissions.length === 0) return true;
  return action.permissions.every(p => userPermissions.includes(p));
}

/**
 * Build the navigation route by replacing {key} placeholders with input values.
 */
export function buildRoute(
  action: ActionDefinition,
  inputs: Record<string, string>
): string {
  let route = action.routeTemplate;
  for (const [key, value] of Object.entries(inputs)) {
    route = route.replace(`{${key}}`, encodeURIComponent(value));
  }
  return route;
}

/**
 * Generate suggested next actions after successful execution.
 */
export function getNextActions(actionId: string): ActionExecutionResult['nextActions'] {
  switch (actionId) {
    case 'create_client':
      return [
        { label: 'Book Appointment', actionId: 'book_appointment' },
        { label: 'View Clients', path: '/dashboard/clients' },
      ];
    case 'book_appointment':
      return [
        { label: 'View Schedule', path: '/dashboard/schedule' },
      ];
    case 'send_message':
      return [
        { label: 'Open Chat', path: '/dashboard/team-chat' },
      ];
    case 'check_in':
      return [
        { label: 'View Schedule', path: '/dashboard/schedule' },
      ];
    default:
      return [];
  }
}
