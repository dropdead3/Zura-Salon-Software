/**
 * Policy Configurator — Schema definitions (Wave 28.4)
 *
 * Each `configurator_schema_key` on the policy library maps to a structured
 * decision tree of rule blocks. The configurator UI is schema-driven so we
 * never have to hand-build 47 separate forms.
 *
 * IMPORTANT: AI drafting (Wave 28.6) reads these block values verbatim. AI
 * cannot invent rules — it only renders configured structured inputs into prose.
 */

export type RuleFieldType =
  | 'number'
  | 'currency'
  | 'percent'
  | 'text'
  | 'longtext'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'role';

export interface RuleField {
  key: string;
  label: string;
  helper?: string;
  type: RuleFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  defaultValue?: unknown;
}

export interface RuleSection {
  title: string;
  description?: string;
  fields: RuleField[];
}

export interface ConfiguratorSchema {
  key: string;
  label: string;
  description: string;
  sections: RuleSection[];
}

const ROLE_OPTIONS: RuleField['options'] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'lead_stylist', label: 'Lead Stylist' },
  { value: 'front_desk_lead', label: 'Front Desk Lead' },
  { value: 'any_admin', label: 'Any admin' },
];

const SCHEMAS: Record<string, ConfiguratorSchema> = {
  cancellation_shape: {
    key: 'cancellation_shape',
    label: 'Cancellation rules',
    description:
      'Define the timeline, fee structure, and exception authority. These rules drive booking disclosures, checkout enforcement, and manager decisions.',
    sections: [
      {
        title: 'Timing',
        fields: [
          {
            key: 'notice_window_hours',
            label: 'Notice window (hours)',
            helper: 'Cancellations inside this window trigger a fee.',
            type: 'number',
            unit: 'hours',
            required: true,
            defaultValue: 24,
          },
          {
            key: 'reschedule_window_hours',
            label: 'Free reschedule window (hours)',
            helper: 'Reschedules outside this window are free.',
            type: 'number',
            unit: 'hours',
            defaultValue: 24,
          },
        ],
      },
      {
        title: 'Fee',
        fields: [
          {
            key: 'fee_type',
            label: 'Fee type',
            type: 'select',
            required: true,
            options: [
              { value: 'percentage', label: 'Percentage of service' },
              { value: 'flat', label: 'Flat amount' },
              { value: 'deposit_forfeit', label: 'Forfeit deposit only' },
              { value: 'none', label: 'No fee' },
            ],
            defaultValue: 'percentage',
          },
          {
            key: 'fee_amount',
            label: 'Fee amount',
            helper: 'Percentage (0–100) or dollar amount, depending on fee type.',
            type: 'number',
            defaultValue: 50,
          },
          {
            key: 'no_show_fee_amount',
            label: 'No-show fee',
            helper: 'Typically 100%. Charged when client never arrives.',
            type: 'number',
            defaultValue: 100,
          },
        ],
      },
      {
        title: 'Exceptions & authority',
        fields: [
          {
            key: 'illness_exception',
            label: 'Waive for documented illness',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'first_offense_grace',
            label: 'Forgive first offense',
            type: 'boolean',
            defaultValue: false,
          },
          {
            key: 'waiver_authority',
            label: 'Who can waive a fee?',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'manager',
            required: true,
          },
          {
            key: 'documentation_required',
            label: 'Documentation required when waived',
            type: 'longtext',
            placeholder: 'e.g., reason logged, manager initials, exception ticket created',
          },
        ],
      },
    ],
  },

  deposit_shape: {
    key: 'deposit_shape',
    label: 'Deposit rules',
    description: 'Capture amount, refundability, and which services require it.',
    sections: [
      {
        title: 'Amount',
        fields: [
          {
            key: 'deposit_type',
            label: 'Deposit type',
            type: 'select',
            required: true,
            options: [
              { value: 'percentage', label: 'Percentage of service' },
              { value: 'flat', label: 'Flat amount' },
              { value: 'card_on_file_only', label: 'Card on file only (no charge)' },
            ],
            defaultValue: 'percentage',
          },
          {
            key: 'deposit_amount',
            label: 'Deposit amount',
            type: 'number',
            defaultValue: 25,
          },
          {
            key: 'min_service_total',
            label: 'Apply to services over',
            helper: 'Skip deposits for small services.',
            type: 'currency',
            defaultValue: 100,
          },
        ],
      },
      {
        title: 'Refundability',
        fields: [
          {
            key: 'refundable_outside_window',
            label: 'Refund deposit when canceled outside notice window',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'applies_to_total',
            label: 'Deposit applies to final service total',
            type: 'boolean',
            defaultValue: true,
          },
        ],
      },
    ],
  },

  service_recovery_shape: {
    key: 'service_recovery_shape',
    label: 'Service recovery (redo / refund) rules',
    description: 'Define when work qualifies for a redo, who approves, and what alternative exists.',
    sections: [
      {
        title: 'Eligibility',
        fields: [
          {
            key: 'window_days',
            label: 'Redo window (days)',
            type: 'number',
            unit: 'days',
            required: true,
            defaultValue: 7,
          },
          {
            key: 'qualifying_reasons',
            label: 'Qualifying reasons',
            type: 'multiselect',
            options: [
              { value: 'workmanship', label: 'Workmanship issue' },
              { value: 'color_off_target', label: 'Color off target' },
              { value: 'tone_shift', label: 'Tone shifted post-service' },
              { value: 'product_failure', label: 'Product failure' },
            ],
          },
          {
            key: 'exclusions',
            label: 'Exclusions',
            helper: 'Cases that never qualify (preference change, home damage, etc.)',
            type: 'longtext',
            placeholder: 'e.g., change of mind after 48h, color altered at home, integrity-damaged hair',
          },
        ],
      },
      {
        title: 'Authority & alternative',
        fields: [
          {
            key: 'approver_role',
            label: 'Who approves a redo?',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'manager',
            required: true,
          },
          {
            key: 'refund_alternative',
            label: 'Refund as alternative when redo declined?',
            type: 'boolean',
            defaultValue: false,
          },
          {
            key: 'refund_cap_pct',
            label: 'Refund cap (% of service)',
            type: 'percent',
            defaultValue: 50,
          },
        ],
      },
    ],
  },

  retail_return_shape: {
    key: 'retail_return_shape',
    label: 'Retail return rules',
    description: 'Window, condition, and authority for retail returns.',
    sections: [
      {
        title: 'Eligibility',
        fields: [
          {
            key: 'window_days',
            label: 'Return window (days)',
            type: 'number',
            unit: 'days',
            required: true,
            defaultValue: 14,
          },
          {
            key: 'condition',
            label: 'Required condition',
            type: 'select',
            options: [
              { value: 'unopened', label: 'Unopened only' },
              { value: 'less_than_25_used', label: 'Less than 25% used' },
              { value: 'any_condition', label: 'Any condition' },
            ],
            defaultValue: 'less_than_25_used',
          },
          {
            key: 'receipt_required',
            label: 'Receipt required',
            type: 'boolean',
            defaultValue: true,
          },
        ],
      },
      {
        title: 'Refund method',
        fields: [
          {
            key: 'refund_method',
            label: 'Refund issued as',
            type: 'select',
            options: [
              { value: 'original_payment', label: 'Original payment method' },
              { value: 'store_credit', label: 'Store credit only' },
              { value: 'either', label: 'Client choice' },
            ],
            defaultValue: 'original_payment',
          },
          {
            key: 'restocking_fee_pct',
            label: 'Restocking fee (%)',
            type: 'percent',
            defaultValue: 0,
          },
        ],
      },
    ],
  },

  extension_shape: {
    key: 'extension_shape',
    label: 'Extension service rules',
    description:
      'Extensions need their own governance — installation, warranty, aftercare, removal. The most expensive policies to get wrong.',
    sections: [
      {
        title: 'Warranty scope',
        fields: [
          {
            key: 'covers_workmanship',
            label: 'Workmanship covered',
            helper: 'Bonds slipping, attachment failure within stated window.',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'covers_defect',
            label: 'Manufacturer defect covered',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'workmanship_window_days',
            label: 'Workmanship window (days)',
            type: 'number',
            unit: 'days',
            defaultValue: 14,
          },
        ],
      },
      {
        title: 'Voids',
        fields: [
          {
            key: 'voids_warranty',
            label: 'What voids warranty',
            type: 'multiselect',
            options: [
              { value: 'no_aftercare_kit', label: 'Aftercare kit not purchased' },
              { value: 'sulfate_shampoo', label: 'Sulfate shampoo used' },
              { value: 'home_color', label: 'Home color applied' },
              { value: 'missed_maintenance', label: 'Missed maintenance window' },
              { value: 'unauthorized_removal', label: 'Removed by another stylist' },
            ],
          },
        ],
      },
      {
        title: 'Documentation',
        fields: [
          {
            key: 'photos_required_install',
            label: 'Photos required at install',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'aftercare_signoff_required',
            label: 'Client signs aftercare acknowledgment',
            type: 'boolean',
            defaultValue: true,
          },
        ],
      },
    ],
  },

  package_shape: {
    key: 'package_shape',
    label: 'Package & membership rules',
    description: 'Expiration, transferability, refunds.',
    sections: [
      {
        title: 'Expiration',
        fields: [
          {
            key: 'expires',
            label: 'Has expiration',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'expiration_months',
            label: 'Expires after (months)',
            type: 'number',
            unit: 'months',
            defaultValue: 12,
          },
        ],
      },
      {
        title: 'Transfer & refund',
        fields: [
          {
            key: 'transferable',
            label: 'Transferable to another client',
            type: 'boolean',
            defaultValue: false,
          },
          {
            key: 'refundable',
            label: 'Refundable',
            type: 'select',
            options: [
              { value: 'no', label: 'Non-refundable' },
              { value: 'unused_only', label: 'Unused services only' },
              { value: 'prorated', label: 'Prorated refund' },
            ],
            defaultValue: 'unused_only',
          },
        ],
      },
    ],
  },

  consent_shape: {
    key: 'consent_shape',
    label: 'Consent & disclosure rules',
    description: 'How consent is captured and what triggers re-collection.',
    sections: [
      {
        title: 'Collection',
        fields: [
          {
            key: 'capture_method',
            label: 'How consent is captured',
            type: 'select',
            options: [
              { value: 'intake_form', label: 'Intake form' },
              { value: 'booking_checkbox', label: 'Booking checkbox' },
              { value: 'in_person_signature', label: 'In-person signature' },
            ],
            defaultValue: 'intake_form',
            required: true,
          },
          {
            key: 'expires_after_months',
            label: 'Re-collect after (months)',
            type: 'number',
            unit: 'months',
            defaultValue: 12,
          },
          {
            key: 'minors_require_guardian',
            label: 'Minors require guardian signature',
            type: 'boolean',
            defaultValue: true,
          },
        ],
      },
    ],
  },

  authority_shape: {
    key: 'authority_shape',
    label: 'Decision authority rules',
    description:
      'The third policy family — who can override what, and what evidence is required. This is what makes operations consistent.',
    sections: [
      {
        title: 'Authority scope',
        fields: [
          {
            key: 'authority_role',
            label: 'Who holds this authority',
            type: 'role',
            options: ROLE_OPTIONS,
            required: true,
            defaultValue: 'manager',
          },
          {
            key: 'max_value',
            label: 'Maximum dollar value per decision',
            type: 'currency',
            helper: 'Above this, escalation is required.',
            defaultValue: 200,
          },
          {
            key: 'escalation_role',
            label: 'Escalates to',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'owner',
          },
        ],
      },
      {
        title: 'Documentation',
        fields: [
          {
            key: 'reason_required',
            label: 'Reason required for every override',
            type: 'boolean',
            defaultValue: true,
          },
          {
            key: 'evidence_required',
            label: 'Evidence required',
            type: 'longtext',
            placeholder: 'e.g., photo, manager initials, ticket number, client signature',
          },
        ],
      },
    ],
  },

  team_conduct_shape: {
    key: 'team_conduct_shape',
    label: 'Team conduct rules',
    description: 'Standards, enforcement steps, and escalation.',
    sections: [
      {
        title: 'Standard',
        fields: [
          {
            key: 'standard_summary',
            label: 'Standard summary',
            helper: 'One-sentence description of the expected behavior.',
            type: 'longtext',
            required: true,
            placeholder: 'e.g., Staff arrive 10 minutes before first appointment, in dress code, ready to work.',
          },
        ],
      },
      {
        title: 'Enforcement',
        fields: [
          {
            key: 'enforcement_steps',
            label: 'Enforcement steps',
            type: 'multiselect',
            options: [
              { value: 'verbal_warning', label: 'Verbal warning' },
              { value: 'written_warning', label: 'Written warning' },
              { value: 'final_warning', label: 'Final warning' },
              { value: 'suspension', label: 'Suspension' },
              { value: 'termination', label: 'Termination' },
            ],
          },
          {
            key: 'documentation_required',
            label: 'Documentation requirement',
            type: 'longtext',
            placeholder: 'e.g., note in employee file, signed acknowledgment, manager log',
          },
          {
            key: 'enforcement_authority',
            label: 'Who enforces',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'manager',
            required: true,
          },
        ],
      },
    ],
  },

  time_off_shape: {
    key: 'time_off_shape',
    label: 'Time off rules',
    description: 'Accrual, request process, blackout periods.',
    sections: [
      {
        title: 'Accrual',
        fields: [
          {
            key: 'accrual_method',
            label: 'Accrual method',
            type: 'select',
            options: [
              { value: 'lump_sum_annual', label: 'Lump sum at year start' },
              { value: 'per_pay_period', label: 'Per pay period' },
              { value: 'per_hour_worked', label: 'Per hour worked' },
              { value: 'unlimited', label: 'Unlimited (with approval)' },
            ],
            defaultValue: 'per_pay_period',
            required: true,
          },
          {
            key: 'annual_days',
            label: 'Annual days available',
            type: 'number',
            unit: 'days',
            defaultValue: 10,
          },
          {
            key: 'eligibility_after_days',
            label: 'Eligible after (days employed)',
            type: 'number',
            unit: 'days',
            defaultValue: 90,
          },
        ],
      },
      {
        title: 'Request process',
        fields: [
          {
            key: 'notice_required_days',
            label: 'Notice required (days)',
            type: 'number',
            unit: 'days',
            defaultValue: 14,
          },
          {
            key: 'approver_role',
            label: 'Who approves',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'manager',
            required: true,
          },
          {
            key: 'blackout_periods',
            label: 'Blackout periods',
            type: 'longtext',
            placeholder: 'e.g., December, Mother\'s Day week, prom season',
          },
        ],
      },
    ],
  },

  compensation_shape: {
    key: 'compensation_shape',
    label: 'Compensation rules',
    description:
      'Pay structure, schedule, and tip handling. Linked to the commission engine — keep aligned.',
    sections: [
      {
        title: 'Structure',
        fields: [
          {
            key: 'pay_model',
            label: 'Pay model',
            type: 'select',
            options: [
              { value: 'commission', label: 'Commission' },
              { value: 'hourly', label: 'Hourly' },
              { value: 'hybrid', label: 'Hybrid (hourly + commission)' },
              { value: 'salary', label: 'Salary' },
              { value: 'booth_rent', label: 'Booth rental' },
            ],
            defaultValue: 'commission',
            required: true,
          },
          {
            key: 'pay_schedule',
            label: 'Pay schedule',
            type: 'select',
            options: [
              { value: 'weekly', label: 'Weekly' },
              { value: 'biweekly', label: 'Bi-weekly' },
              { value: 'semimonthly', label: 'Semi-monthly' },
              { value: 'monthly', label: 'Monthly' },
            ],
            defaultValue: 'biweekly',
            required: true,
          },
        ],
      },
      {
        title: 'Tips',
        fields: [
          {
            key: 'tip_handling',
            label: 'Tip handling',
            type: 'select',
            options: [
              { value: 'individual', label: 'Stylist keeps own tips' },
              { value: 'pooled_role', label: 'Pooled by role' },
              { value: 'pooled_all', label: 'Fully pooled' },
            ],
            defaultValue: 'individual',
          },
        ],
      },
    ],
  },

  generic_shape: {
    key: 'generic_shape',
    label: 'General policy details',
    description: 'Capture the core decision points for this policy.',
    sections: [
      {
        title: 'Policy details',
        fields: [
          {
            key: 'policy_summary',
            label: 'Policy summary',
            helper: 'A clear one-paragraph description of what this policy covers.',
            type: 'longtext',
            required: true,
          },
          {
            key: 'who_it_applies_to',
            label: 'Who it applies to',
            type: 'longtext',
            placeholder: 'e.g., All staff. All clients. New clients only.',
          },
          {
            key: 'authority_role',
            label: 'Decision authority',
            type: 'role',
            options: ROLE_OPTIONS,
            defaultValue: 'manager',
          },
        ],
      },
    ],
  },
};

export function getConfiguratorSchema(key: string | null | undefined): ConfiguratorSchema {
  if (!key) return SCHEMAS.generic_shape;
  return SCHEMAS[key] ?? SCHEMAS.generic_shape;
}

export const ALL_SCHEMAS = SCHEMAS;
