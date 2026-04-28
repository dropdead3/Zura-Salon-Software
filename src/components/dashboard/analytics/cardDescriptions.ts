/**
 * CARD_DESCRIPTIONS — explanatory subtext for every pinnable Command Center card.
 *
 * Sibling registry to CARD_QUESTIONS:
 *   - CARD_QUESTIONS answers "what does this card answer?" (doctrinal voice)
 *   - CARD_DESCRIPTIONS answers "how does it answer it?" (explanatory voice)
 *
 * Both are surfaced in the Customize menu hover preview so the operator
 * knows what they're pinning before they pin it.
 *
 * Coverage is enforced by src/__tests__/card-questions-uniqueness.test.ts
 * against PINNABLE_CARDS in DashboardCustomizeMenu.tsx.
 */
export const CARD_DESCRIPTIONS: Record<string, string> = {
  executive_summary: 'Period revenue versus the prior comparable period — are you trending up or down?',
  daily_brief: "Today's operational pulse: appointments, queue, and revenue earned so far.",
  sales_overview: 'Combined service and product revenue for the selected period.',
  top_performers: 'Highest-earning team member by total revenue.',
  operations_stats: 'Current queue activity including waiting and in-service clients.',
  revenue_breakdown: 'Where revenue is coming from — service vs retail mix.',
  client_funnel: 'Total unique clients (new and returning) in the period.',
  client_health: 'Clients flagged as at-risk, win-back, or new-no-return.',
  operational_health: 'Overall operational status across monitored locations.',
  locations_rollup: 'Real-time open/closed status across your locations. Surfaces only when you operate multiple locations with differing schedules.',
  service_mix: 'Highest-revenue service category in the period.',
  retail_effectiveness: 'Percentage of service transactions that include a retail purchase.',
  rebooking: 'Percentage of clients who rebooked before leaving.',
  goal_tracker: 'Organization-wide goal completion percentage.',
  capacity_utilization: 'Average chair utilization across all providers.',
  week_ahead_forecast: 'Projected total revenue for the next 7 days.',
  new_bookings: 'New appointments booked in the selected period.',
  hiring_capacity: 'Open chair positions based on capacity analysis.',
  staffing_trends: 'Count of currently active staff members.',
  stylist_workload: 'Average utilization percentage across all stylists.',
  client_experience_staff: 'Client experience scores by staff member.',
  commission_summary: 'Estimated commission payouts across all staff for the period.',
  staff_commission_breakdown: 'Per-stylist commission breakdown based on revenue and commission model.',
  true_profit: 'Revenue minus chemical cost, labor cost, and waste — your real bottom line.',
  staff_performance: 'Unified stylist scorecard: revenue, rebooking, retail, and color bar metrics.',
  service_profitability: 'Service-level profitability ranking by revenue minus product cost.',
  control_tower: 'Real-time color bar alerts: waste, variance, and compliance issues.',
  predictive_inventory: 'AI-forecasted color inventory needs based on booking trends.',
  level_progress_kpi: 'Stylists by promotion readiness: ready to level up, on pace, at risk, or needs review (level down).',
};
