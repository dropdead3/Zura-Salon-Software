import { useMemo } from 'react';
import { TrendingUp, ShoppingBag, RotateCcw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';

export type AnalyticsHintType = 'retail' | 'revenue' | 'rebooking' | 'utilization' | 'waste' | 'retention' | 'payroll' | 'inventory_alert' | null;

// Pattern matching: keywords → analytics hint type
const ANALYTICS_PATTERNS: { keywords: string[]; type: AnalyticsHintType }[] = [
  { keywords: ['retail', 'product sales', 'product revenue'], type: 'retail' },
  { keywords: ['revenue', 'sales', 'income', 'earnings', 'how much'], type: 'revenue' },
  { keywords: ['rebooking', 'rebook', 'retention', 'return rate', 'client retention'], type: 'rebooking' },
  { keywords: ['utilization', 'underbooked', 'underbooking', 'capacity', 'gaps', 'open slots'], type: 'utilization' },
  { keywords: ['waste', 'color waste', 'chemical waste', 'backroom waste', 'ghost loss'], type: 'waste' },
  { keywords: ['churn', 'lost clients', 'inactive clients', 'client loss', 'haven\'t been in'], type: 'retention' },
  { keywords: ['payroll', 'commission', 'labor cost', 'pay rate'], type: 'payroll' },
  { keywords: ['low stock', 'reorder', 'out of stock', 'inventory alert', 'low inventory'], type: 'inventory_alert' },
];

export function detectAnalyticsHint(query: string): AnalyticsHintType {
  const lower = query.toLowerCase().trim();
  if (lower.length < 3) return null;
  for (const pattern of ANALYTICS_PATTERNS) {
    if (pattern.keywords.some(k => lower.includes(k))) {
      return pattern.type;
    }
  }
  return null;
}

interface AnalyticsCardConfig {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const CARD_CONFIG: Record<string, AnalyticsCardConfig> = {
  retail: {
    icon: <ShoppingBag className="w-4 h-4 text-primary/70" />,
    label: 'Retail Performance',
    path: '/dashboard/admin/analytics',
  },
  revenue: {
    icon: <TrendingUp className="w-4 h-4 text-primary/70" />,
    label: 'Revenue Overview',
    path: '/dashboard/admin/analytics',
  },
  rebooking: {
    icon: <RotateCcw className="w-4 h-4 text-primary/70" />,
    label: 'Rebooking Rate',
    path: '/dashboard/admin/analytics',
  },
  utilization: {
    icon: <TrendingUp className="w-4 h-4 text-primary/70" />,
    label: 'Staff Utilization',
    path: '/dashboard/admin/analytics/operational',
  },
  waste: {
    icon: <ShoppingBag className="w-4 h-4 text-primary/70" />,
    label: 'Color & Chemical Waste',
    path: '/dashboard/admin/backroom',
  },
  retention: {
    icon: <RotateCcw className="w-4 h-4 text-primary/70" />,
    label: 'Client Retention',
    path: '/dashboard/admin/analytics',
  },
  payroll: {
    icon: <TrendingUp className="w-4 h-4 text-primary/70" />,
    label: 'Payroll & Commission',
    path: '/dashboard/admin/my-pay',
  },
  inventory_alert: {
    icon: <ShoppingBag className="w-4 h-4 text-primary/70" />,
    label: 'Inventory Alerts',
    path: '/dashboard/admin/inventory',
  },
};

interface CommandInlineAnalyticsCardProps {
  hint: AnalyticsHintType;
  onNavigate: (path: string) => void;
}

export function CommandInlineAnalyticsCard({ hint, onNavigate }: CommandInlineAnalyticsCardProps) {
  if (!hint) return null;

  const config = CARD_CONFIG[hint];
  if (!config) return null;

  return (
    <button
      type="button"
      onClick={() => onNavigate(config.path)}
      className={cn(
        'w-[calc(100%-2rem)] mx-4 my-2 flex items-center gap-3 px-4 py-3',
        'bg-card-inner/60 border border-border/30 rounded-lg',
        'hover:bg-muted/50 transition-colors duration-150',
        'text-left group'
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-sans text-xs text-muted-foreground/70">{config.label}</span>
        <p className="font-sans text-sm text-foreground">View detailed analytics</p>
      </div>

      <div className="flex items-center gap-1 text-xs font-sans text-primary/60 group-hover:text-primary/80 transition-colors shrink-0">
        <span>Open</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}
