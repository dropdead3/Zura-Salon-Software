import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { DollarSign, TrendingUp, Users, Gauge, UsersRound } from 'lucide-react';
import type { OrganizationGoal, GoalCategory } from '@/hooks/useOrganizationGoals';
import { GOAL_CATEGORY_LABELS } from '@/hooks/useOrganizationGoals';

interface GoalsOverviewHeaderProps {
  goals: OrganizationGoal[];
  onCategoryClick: (category: GoalCategory) => void;
}

const CATEGORY_ICONS: Record<GoalCategory, React.ElementType> = {
  revenue: DollarSign,
  profitability: TrendingUp,
  client: Users,
  efficiency: Gauge,
  team: UsersRound,
};

const CATEGORY_ORDER: GoalCategory[] = ['revenue', 'profitability', 'client', 'efficiency', 'team'];

export function GoalsOverviewHeader({ goals, onCategoryClick }: GoalsOverviewHeaderProps) {
  const categoryStats = CATEGORY_ORDER.map(cat => {
    const catGoals = goals.filter(g => g.category === cat);
    const count = catGoals.length;
    const Icon = CATEGORY_ICONS[cat];
    return { category: cat, label: GOAL_CATEGORY_LABELS[cat], count, Icon };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {categoryStats.map(({ category, label, count, Icon }) => (
        <button
          key={category}
          onClick={() => onCategoryClick(category)}
          className={cn(
            tokens.kpi.tile,
            'cursor-pointer transition-colors hover:bg-muted/50 text-left'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-muted flex items-center justify-center rounded-md">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className={tokens.kpi.label}>{label}</span>
          </div>
          <span className={count === 0 ? tokens.body.muted : tokens.kpi.value}>
            {count === 0 ? 'Not set' : `${count} goal${count > 1 ? 's' : '')}`}
          </span>
        </button>
      ))}
    </div>
  );
}
