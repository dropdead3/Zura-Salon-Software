import { useState } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Shuffle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ChairGrid } from '@/components/dashboard/chair-assignments/ChairGrid';
import { RandomAssignModal } from '@/components/dashboard/chair-assignments/RandomAssignModal';
import {
  useChairAssignments,
  useAvailableChairs,
  useAvailableStylists,
  useRandomAssignment,
  useCarryoverAssignments,
  useSaveChairAssignments,
  useDeleteChairAssignment,
  getWeekRange,
} from '@/hooks/useChairAssignments';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export default function ChairAssignments() {
  const { effectiveOrganization } = useOrganizationContext();
  const [weekDate, setWeekDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);

  // Use first location or 'all' — in a real impl you'd use a location picker
  const locationId = effectiveOrganization?.id ? 'all' : null;

  const { data: assignments = [], isLoading: loadingAssignments } = useChairAssignments(locationId, weekDate);
  const { data: chairs = [], isLoading: loadingChairs } = useAvailableChairs(locationId);
  const { data: stylists = [] } = useAvailableStylists(locationId);

  const { randomize, isReady } = useRandomAssignment(locationId, weekDate);
  const { carryover } = useCarryoverAssignments(locationId, weekDate);

  const saveMutation = useSaveChairAssignments(locationId, weekDate);
  const deleteMutation = useDeleteChairAssignment();

  const { weekStart, weekEnd } = getWeekRange(weekDate);
  const weekLabel = `${format(new Date(weekStart), 'MMM d')} – ${format(new Date(weekEnd), 'MMM d, yyyy')}`;

  const isLoading = loadingAssignments || loadingChairs;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Chair Assignments"
          description="Assign stylists to chairs weekly. Randomize or carry over from previous weeks."
          backTo="/dashboard/admin/team-hub"
          actions={
            <Button
              onClick={() => setModalOpen(true)}
              disabled={!isReady}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Assign Chairs
            </Button>
          }
        />

        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekDate(d => subWeeks(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={tokens.body.emphasis}>{weekLabel}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekDate(d => addWeeks(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="ml-2"
          >
            This Week
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : (
          <ChairGrid
            chairs={chairs}
            assignments={assignments}
            stylists={stylists}
            onRemoveAssignment={(id) => deleteMutation.mutate(id)}
          />
        )}

        {/* Summary */}
        {!isLoading && (
          <div className="flex items-center gap-4 text-sm">
            <span className={tokens.body.muted}>
              {assignments.length} of {chairs.length} chairs assigned
            </span>
            <span className={tokens.body.muted}>
              {stylists.length} stylists available
            </span>
          </div>
        )}

        {/* Modal */}
        <RandomAssignModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          stylists={stylists}
          onRandomize={(excludeIds) => randomize(excludeIds)}
          onCarryover={carryover}
          onApply={(a) => saveMutation.mutate(a)}
          isApplying={saveMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
