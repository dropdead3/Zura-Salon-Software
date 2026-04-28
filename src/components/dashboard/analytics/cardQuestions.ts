/**
 * CARD_QUESTIONS — single canonical question per Command Center pinned card.
 *
 * Doctrine: every analytics surface must answer ONE question. Two surfaces
 * answering the same question is redundancy by definition (the bug that
 * motivated this registry: Executive Summary, Sales Overview, and Revenue
 * Breakdown all stamping the same $5.6k headline).
 *
 * Five-part canon pattern (mem://architecture/canon-pattern):
 *   1. invariant         — this file
 *   2. Vitest enforcement — src/__tests__/card-questions-uniqueness.test.ts
 *   3. (no Stylelint     — not a styling concern)
 *   4. CI                — runs in vitest CI job
 *   5. override          — none; redundancy must be fixed at source
 *
 * To add a new pinned card:
 *   1. Add its `cardId` here with a one-sentence question.
 *   2. The question must be structurally distinct from every other entry.
 *   3. The companion test will fail otherwise.
 */
export const CARD_QUESTIONS = {
  executive_summary:           'Are we trending up or down vs the prior period?',
  sales_overview:              'What is the live revenue clock for this period?',
  daily_brief:                 "What is today's operational pulse — appointments, queue, and earned revenue?",
  revenue_breakdown:           'What is the service vs retail revenue mix?',
  top_performers:              'Who is the highest-earning team member this period?',
  operations_stats:            'How many clients are waiting or in service right now?',
  retail_effectiveness:        'What share of services attached a retail product?',
  rebooking:                   'What share of clients rebooked before leaving?',
  capacity_utilization:        'How full is chair capacity across providers?',
  operational_health:          'How many locations are being monitored and healthy?',
  locations_rollup:            'Which locations are open, closing soon, or opening soon?',
  service_mix:                 'Which service category drives the most revenue?',
  client_funnel:               'How many unique clients (new + returning) this period?',
  client_health:               'How many clients are at-risk, win-back, or new-no-return?',
  goal_tracker:                'How close are we to the org revenue goal and at what pace?',
  week_ahead_forecast:         'What is the projected revenue for the next 7 days?',
  new_bookings:                'How many new bookings landed this period?',
  hiring_capacity:             'How many open chair positions are available based on capacity?',
  staffing_trends:             'How is active staff count trending?',
  stylist_workload:            'What is the average stylist utilization?',
  client_experience_staff:     'Which staff lead and lag on client experience scores?',
  commission_summary:          'What are estimated total commission payouts this period?',
  staff_commission_breakdown:  'What does each stylist earn in commission this period?',
  true_profit:                 'What is profit after chemical, labor, and waste cost?',
  staff_performance:           'How does each stylist score across the unified KPI set?',
  service_profitability:       'Which services earn the most after product cost?',
  control_tower:               'Where are color bar waste, variance, and compliance issues?',
  predictive_inventory:        'Which color products will stock out based on bookings?',
  level_progress_kpi:          'How many stylists are ready to level up, on pace, or at risk?',
} as const;

export type CardQuestionId = keyof typeof CARD_QUESTIONS;
