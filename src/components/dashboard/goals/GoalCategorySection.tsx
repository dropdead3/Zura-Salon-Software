import { tokens } from '@/lib/design-tokens';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalCard } from './GoalCard';
import type { OrganizationGoal, GoalCategory } from '@/hooks/useOrganizationGoals';
import { GOAL_CATEGORY_LABELS, GOAL_CATEGORY_DESCRIPTIONS } from '@/hooks/useOrganizationGoals';

interface GoalCategorySectionProps {
  category: GoalCategory;
  goals: OrganizationGoal[];
  onAddGoal: (category: GoalCategory) => void;
  onEditGoal: (goal: OrganizationGoal) => void;
  onDeleteGoal: (goal: OrganizationGoal) => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
}

export function GoalCategorySection({
  category,
  goals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  sectionRef,
}: GoalCategorySectionProps) {
  return (
    <div ref={sectionRef} className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={tokens.heading.section}>{GOAL_CATEGORY_LABELS[category]}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{GOAL_CATEGORY_DESCRIPTIONS[category]}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={tokens.button.cardAction}
          onClick={() => onAddGoal(category)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-4">
          <p className="font-sans text-sm text-muted-foreground">
            No {GOAL_CATEGORY_LABELS[category].toLowerCase()} goals defined yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            className={tokens.button.cardAction}
            onClick={() => onAddGoal(category)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentValue={null}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
