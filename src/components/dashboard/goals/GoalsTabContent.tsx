import { useState, useRef, useCallback } from 'react';
import { Target, Plus } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useOrganizationGoals, useDeleteOrganizationGoal, type OrganizationGoal, type GoalCategory } from '@/hooks/useOrganizationGoals';
import { GoalsOverviewHeader } from './GoalsOverviewHeader';
import { GoalCategorySection } from './GoalCategorySection';
import { GoalSetupDialog } from './GoalSetupDialog';
import { TeamGoalsSummary } from './TeamGoalsSummary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORY_ORDER: GoalCategory[] = ['revenue', 'profitability', 'client', 'efficiency', 'team'];

export function GoalsTabContent() {
  const { data: goals = [], isLoading } = useOrganizationGoals();
  const deleteGoal = useDeleteOrganizationGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<OrganizationGoal | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<GoalCategory>('revenue');
  const [deleteTarget, setDeleteTarget] = useState<OrganizationGoal | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCategoryClick = useCallback((category: GoalCategory) => {
    sectionRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleAddGoal = useCallback((category: GoalCategory) => {
    setEditGoal(null);
    setDefaultCategory(category);
    setDialogOpen(true);
  }, []);

  const handleEditGoal = useCallback((goal: OrganizationGoal) => {
    setEditGoal(goal);
    setDefaultCategory(goal.category as GoalCategory);
    setDialogOpen(true);
  }, []);

  const handleDeleteGoal = useCallback((goal: OrganizationGoal) => {
    setDeleteTarget(goal);
  }, []);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteGoal.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const existingMetricKeys = goals.map(g => g.metric_key);

  if (isLoading) {
    return (
      <DashboardLoader className="h-64" />
    );
  }

  const hasAnyGoals = goals.length > 0;

  return (
    <div className="space-y-8">
      {/* Overview summary tiles */}
      <GoalsOverviewHeader goals={goals} onCategoryClick={handleCategoryClick} />

      {!hasAnyGoals ? (
        <EmptyState
          icon={Target}
          title="Set Your Organization Goals"
          description="Define targets across revenue, profitability, client health, efficiency, and team metrics to track what matters most."
          action={
            <Button onClick={() => handleAddGoal('revenue')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Your First Goal
            </Button>
          }
        />
      ) : (
        CATEGORY_ORDER.map(cat => {
          const catGoals = goals.filter(g => g.category === cat);
          if (cat === 'team') {
            return (
              <div key={cat} className="space-y-4">
                <GoalCategorySection
                  category={cat}
                  goals={catGoals}
                  onAddGoal={handleAddGoal}
                  onEditGoal={handleEditGoal}
                  onDeleteGoal={handleDeleteGoal}
                  sectionRef={(el) => { sectionRefs.current[cat] = el; }}
                />
                <TeamGoalsSummary />
              </div>
            );
          }
          return (
            <GoalCategorySection
              key={cat}
              category={cat}
              goals={catGoals}
              onAddGoal={handleAddGoal}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
              sectionRef={(el) => { sectionRefs.current[cat] = el; }}
            />
          );
        })
      )}

      {/* Setup Dialog */}
      <GoalSetupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editGoal={editGoal}
        defaultCategory={defaultCategory}
        existingMetricKeys={existingMetricKeys}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteTarget?.display_name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
