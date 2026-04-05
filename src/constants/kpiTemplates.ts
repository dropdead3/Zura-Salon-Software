export interface KpiTemplate {
  key: string;
  name: string;
  description: string;
  unit: '%' | '$' | 'count';
  cadence: 'daily' | 'weekly' | 'monthly';
  suggestedTarget: number | null;
  suggestedWarning: number | null;
  suggestedCritical: number | null;
  category: 'revenue' | 'efficiency' | 'client' | 'labor';
}

export const KPI_TEMPLATES: KpiTemplate[] = [
  {
    key: 'revenue_per_chair',
    name: 'Revenue per Chair',
    description: 'Average weekly revenue generated per active chair/station.',
    unit: '$',
    cadence: 'weekly',
    suggestedTarget: null,
    suggestedWarning: null,
    suggestedCritical: null,
    category: 'revenue',
  },
  {
    key: 'utilization_rate',
    name: 'Utilization Rate',
    description: 'Percentage of available appointment slots that are booked.',
    unit: '%',
    cadence: 'daily',
    suggestedTarget: 85,
    suggestedWarning: 70,
    suggestedCritical: 55,
    category: 'efficiency',
  },
  {
    key: 'client_retention',
    name: 'Client Retention Rate',
    description: 'Percentage of clients who return within their expected rebooking window.',
    unit: '%',
    cadence: 'monthly',
    suggestedTarget: 80,
    suggestedWarning: 65,
    suggestedCritical: 50,
    category: 'client',
  },
  {
    key: 'labor_cost_pct',
    name: 'Labor Cost %',
    description: 'Total labor cost as a percentage of revenue.',
    unit: '%',
    cadence: 'weekly',
    suggestedTarget: 45,
    suggestedWarning: 52,
    suggestedCritical: 60,
    category: 'labor',
  },
  {
    key: 'avg_ticket',
    name: 'Average Ticket',
    description: 'Average revenue per completed appointment.',
    unit: '$',
    cadence: 'daily',
    suggestedTarget: null,
    suggestedWarning: null,
    suggestedCritical: null,
    category: 'revenue',
  },
  {
    key: 'margin_rate',
    name: 'Margin Rate',
    description: 'Net operating margin after labor and product costs.',
    unit: '%',
    cadence: 'weekly',
    suggestedTarget: 20,
    suggestedWarning: 12,
    suggestedCritical: 5,
    category: 'revenue',
  },
  {
    key: 'rebook_rate',
    name: 'Rebook at Checkout Rate',
    description: 'Percentage of clients who rebook before leaving the salon.',
    unit: '%',
    cadence: 'daily',
    suggestedTarget: 70,
    suggestedWarning: 50,
    suggestedCritical: 35,
    category: 'client',
  },
  {
    key: 'rev_per_hour',
    name: 'Revenue Per Hour',
    description: 'Average revenue generated per booked hour of service.',
    unit: '$',
    cadence: 'weekly',
    suggestedTarget: null,
    suggestedWarning: null,
    suggestedCritical: null,
    category: 'revenue',
  },
  {
    key: 'new_client_pct',
    name: 'New Client %',
    description: 'Percentage of appointments from first-time clients.',
    unit: '%',
    cadence: 'weekly',
    suggestedTarget: 20,
    suggestedWarning: 10,
    suggestedCritical: 5,
    category: 'client',
  },
];

export const KPI_CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Revenue & Margin',
  efficiency: 'Efficiency',
  client: 'Client Health',
  labor: 'Labor & Cost',
};
