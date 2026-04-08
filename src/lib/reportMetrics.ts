// Available metrics for custom report builder

export interface MetricDefinition {
  id: string;
  label: string;
  category: string;
  source: string;
  field?: string;
  calculated?: boolean;
  aggregations: ('sum' | 'avg' | 'count' | 'min' | 'max')[];
  format: 'currency' | 'number' | 'percent';
  description: string;
}

export interface DimensionDefinition {
  id: string;
  label: string;
  category: string;
  groupByOptions?: ('day' | 'week' | 'month')[];
  description: string;
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  // Revenue Metrics
  {
    id: 'total_revenue',
    label: 'Total Revenue',
    category: 'Revenue',
    source: 'phorest_transaction_items',
    field: 'total_amount',
    aggregations: ['sum', 'avg', 'min', 'max'],
    format: 'currency',
    description: 'Combined service and product revenue',
  },
  {
    id: 'service_revenue',
    label: 'Service Revenue',
    category: 'Revenue',
    source: 'phorest_transaction_items',
    field: 'total_amount',
    aggregations: ['sum', 'avg', 'min', 'max'],
    format: 'currency',
    description: 'Revenue from services only',
  },
  {
    id: 'product_revenue',
    label: 'Product Revenue',
    category: 'Revenue',
    source: 'phorest_transaction_items',
    field: 'total_amount',
    aggregations: ['sum', 'avg', 'min', 'max'],
    format: 'currency',
    description: 'Revenue from retail products',
  },
  {
    id: 'avg_ticket',
    label: 'Average Ticket',
    category: 'Revenue',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg'],
    format: 'currency',
    description: 'Average transaction value',
  },

  // Operations Metrics
  {
    id: 'appointment_count',
    label: 'Appointments',
    category: 'Operations',
    source: 'phorest_appointments',
    aggregations: ['sum', 'avg', 'count'],
    format: 'number',
    description: 'Total number of appointments',
  },
  {
    id: 'no_show_count',
    label: 'No-Shows',
    category: 'Operations',
    source: 'phorest_appointments',
    aggregations: ['sum', 'count'],
    format: 'number',
    description: 'Appointments marked as no-show',
  },
  {
    id: 'cancellation_count',
    label: 'Cancellations',
    category: 'Operations',
    source: 'phorest_appointments',
    aggregations: ['sum', 'count'],
    format: 'number',
    description: 'Cancelled appointments',
  },
  {
    id: 'utilization_rate',
    label: 'Utilization %',
    category: 'Operations',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg'],
    format: 'percent',
    description: 'Percentage of available time booked',
  },

  // Client Metrics
  {
    id: 'new_clients',
    label: 'New Clients',
    category: 'Clients',
    source: 'phorest_appointments',
    aggregations: ['sum', 'count'],
    format: 'number',
    description: 'First-time client visits',
  },
  {
    id: 'returning_clients',
    label: 'Returning Clients',
    category: 'Clients',
    source: 'phorest_appointments',
    aggregations: ['sum', 'count'],
    format: 'number',
    description: 'Repeat client visits',
  },
  {
    id: 'retention_rate',
    label: 'Retention Rate',
    category: 'Clients',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg'],
    format: 'percent',
    description: 'Percentage of clients who return',
  },

  // Staff Metrics
  {
    id: 'staff_revenue',
    label: 'Revenue per Staff',
    category: 'Staff',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg', 'sum'],
    format: 'currency',
    description: 'Average revenue generated per staff member',
  },
  {
    id: 'rebooking_rate',
    label: 'Rebooking Rate',
    category: 'Staff',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg'],
    format: 'percent',
    description: 'Percentage of clients who rebook before leaving',
  },
  {
    id: 'retail_attachment',
    label: 'Retail Attachment',
    category: 'Staff',
    source: 'calculated',
    calculated: true,
    aggregations: ['avg'],
    format: 'percent',
    description: 'Percentage of visits with product sales',
  },
];

export const AVAILABLE_DIMENSIONS: DimensionDefinition[] = [
  {
    id: 'date',
    label: 'Date',
    category: 'Time',
    groupByOptions: ['day', 'week', 'month'],
    description: 'Group by date period',
  },
  {
    id: 'location',
    label: 'Location',
    category: 'Organization',
    description: 'Group by salon location',
  },
  {
    id: 'stylist',
    label: 'Staff Member',
    category: 'Team',
    description: 'Group by individual staff',
  },
  {
    id: 'service_category',
    label: 'Service Category',
    category: 'Services',
    description: 'Group by service type (Color, Cut, etc.)',
  },
  {
    id: 'day_of_week',
    label: 'Day of Week',
    category: 'Time',
    description: 'Group by weekday',
  },
];

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'between' | 'in';

export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface ReportConfig {
  metrics: {
    id: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    label?: string;
  }[];
  dimensions: {
    id: string;
    groupBy?: 'day' | 'week' | 'month';
  }[];
  filters: ReportFilter[];
  visualization: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'area_chart';
  dateRange: 'inherit' | 'custom';
  customDateRange?: { from: string; to: string };
}

export const getMetricById = (id: string): MetricDefinition | undefined => {
  return AVAILABLE_METRICS.find(m => m.id === id);
};

export const getDimensionById = (id: string): DimensionDefinition | undefined => {
  return AVAILABLE_DIMENSIONS.find(d => d.id === id);
};

export const getMetricsByCategory = (category: string): MetricDefinition[] => {
  return AVAILABLE_METRICS.filter(m => m.category === category);
};

export const getMetricCategories = (): string[] => {
  return [...new Set(AVAILABLE_METRICS.map(m => m.category))];
};
