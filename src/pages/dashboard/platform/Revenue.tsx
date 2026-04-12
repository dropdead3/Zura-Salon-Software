import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CreditCard,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { 
  usePlatformRevenue, 
  useSubscriptionInvoices, 
  useOrganizationSubscriptions,
  useSubscriptionPlans,
} from '@/hooks/usePlatformRevenue';
import { MonthlyRevenueChart, PlanBreakdownChart, PlanDistributionPie } from '@/components/platform/RevenueChart';
import { SubscriptionTable, InvoiceTable, AtRiskTable } from '@/components/platform/SubscriptionTable';
import { PageExplainer } from '@/components/ui/PageExplainer';

const formatCurrency = (value: number, compact = false) => {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function Revenue() {
  const { data: metrics, isLoading: metricsLoading } = usePlatformRevenue();
  const { data: invoices, isLoading: invoicesLoading } = useSubscriptionInvoices(20);
  const { data: subscriptions, isLoading: subscriptionsLoading } = useOrganizationSubscriptions();
  const { data: plans } = useSubscriptionPlans();

  const isLoading = metricsLoading || invoicesLoading || subscriptionsLoading;

  if (isLoading) {
    return (
      <PlatformPageContainer className="space-y-6">
        <RevenueSkeleton />
      </PlatformPageContainer>
    );
  }

  const atRiskCount = subscriptions?.filter(
    s => s.subscription_status === 'past_due' || s.subscription_status === 'cancelled'
  ).length || 0;

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Revenue Dashboard"
        description="Track subscription revenue, payment status, and account health"
      />
        <PageExplainer pageId="platform-revenue" />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr || 0)}
          icon={DollarSign}
          description="From active subscriptions"
          variant="success"
        />
        <StatCard
          title="Annual Run Rate"
          value={formatCurrency(metrics?.arr || 0, true)}
          icon={TrendingUp}
          description="Projected yearly revenue"
        />
        <StatCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          icon={Users}
          description={`${metrics?.trialingSubscriptions || 0} trialing`}
          variant="primary"
        />
        <StatCard
          title="At Risk Accounts"
          value={atRiskCount}
          icon={AlertTriangle}
          description={`${metrics?.pastDueSubscriptions || 0} past due`}
          variant={atRiskCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <PlatformCard variant="glass">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg. Revenue / Account</p>
                <p className="text-2xl font-medium text-white">
                  {formatCurrency(metrics?.averageRevenuePerAccount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-violet-500/20">
                <CreditCard className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
        <PlatformCard variant="glass">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Churned This Month</p>
                <p className="text-2xl font-medium text-white">
                  {metrics?.churnedThisMonth || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/20">
                <Calendar className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
        <PlatformCard variant="glass">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Available Plans</p>
                <p className="text-2xl font-medium text-white">
                  {plans?.filter(p => p.is_active).length || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <PlatformCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              Monthly Revenue Trend
            </PlatformCardTitle>
          </PlatformCardHeader>
          <PlatformCardContent>
            {metrics?.monthlyRevenue && metrics.monthlyRevenue.length > 0 ? (
              <MonthlyRevenueChart data={metrics.monthlyRevenue} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No revenue data yet
              </div>
            )}
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <PlatformCardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-400" />
              Revenue by Plan
            </PlatformCardTitle>
          </PlatformCardHeader>
          <PlatformCardContent>
            {metrics?.revenueByPlan && metrics.revenueByPlan.length > 0 ? (
              <PlanBreakdownChart data={metrics.revenueByPlan} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No plan data yet
              </div>
            )}
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Tabs for Tables */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
          <TabsTrigger 
            value="subscriptions"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Subscriptions
          </TabsTrigger>
          <TabsTrigger 
            value="invoices"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Recent Invoices
          </TabsTrigger>
          <TabsTrigger 
            value="at-risk"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white relative"
          >
            At Risk
            {atRiskCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                {atRiskCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="plans"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>All Subscriptions</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <SubscriptionTable subscriptions={subscriptions || []} />
            </PlatformCardContent>
          </PlatformCard>
        </TabsContent>

        <TabsContent value="invoices">
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Recent Invoices</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <InvoiceTable invoices={invoices || []} />
            </PlatformCardContent>
          </PlatformCard>
        </TabsContent>

        <TabsContent value="at-risk">
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                At Risk Accounts
              </PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <AtRiskTable subscriptions={subscriptions || []} />
            </PlatformCardContent>
          </PlatformCard>
        </TabsContent>

        <TabsContent value="plans">
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-violet-400" />
                Subscription Plans
              </PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans?.filter(p => p.is_active).map((plan) => (
                  <div 
                    key={plan.id}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{plan.name}</h3>
                      {plan.tier === 'enterprise' && (
                        <PlatformBadge variant="warning">Custom</PlatformBadge>
                      )}
                    </div>
                    <div className="mb-3">
                      {plan.price_monthly > 0 ? (
                        <>
                          <span className="text-2xl font-medium text-white">
                            ${plan.price_monthly}
                          </span>
                          <span className="text-slate-400">/mo</span>
                        </>
                      ) : (
                        <span className="text-lg font-medium text-slate-400">Contact sales</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{plan.description}</p>
                    <div className="space-y-1 text-xs text-slate-500">
                      <p>Up to {plan.max_locations === -1 ? 'Unlimited' : plan.max_locations} locations</p>
                      <p>Up to {plan.max_users === -1 ? 'Unlimited' : plan.max_users} users</p>
                    </div>
                  </div>
                ))}
              </div>
            </PlatformCardContent>
          </PlatformCard>
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

function StatCard({ title, value, icon: Icon, description, variant = 'default' }: StatCardProps) {
  const iconStyles = {
    default: 'bg-slate-700/50 text-slate-400',
    primary: 'bg-violet-500/20 text-violet-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
  };

  const valueStyles = {
    default: 'text-white',
    primary: 'text-violet-300',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
  };

  return (
    <PlatformCard variant="glass" className="group">
      <PlatformCardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-400">{title}</span>
          <div className={`p-2.5 rounded-xl ${iconStyles[variant]} transition-colors`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className={`text-3xl font-medium ${valueStyles[variant]} mb-1`}>{value}</div>
        <p className="text-sm text-slate-500">{description}</p>
      </PlatformCardContent>
    </PlatformCard>
  );
}

function RevenueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 bg-slate-800" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-800" />
          <Skeleton className="h-4 w-72 bg-slate-800" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 bg-slate-800 rounded-[16px]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[350px] bg-slate-800 rounded-[16px]" />
        <Skeleton className="h-[350px] bg-slate-800 rounded-[16px]" />
      </div>
    </div>
  );
}
