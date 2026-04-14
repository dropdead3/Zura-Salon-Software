import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { format, subWeeks, startOfWeek } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Save, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useLeaderboardHistory, LeaderboardHistoryEntry } from '@/hooks/useLeaderboardHistory';
import { toast } from 'sonner';
import { usePaginatedSort } from '@/hooks/usePaginatedSort';
import { TablePagination } from '@/components/ui/TablePagination';

interface LeaderboardHistoryPanelProps {
  currentRankings?: {
    userId: string;
    name: string;
    rank: number;
    score: number;
    newClients: { rank: number; value: number };
    retention: { rank: number; value: number };
    retail: { rank: number; value: number };
    extensions: { rank: number; value: number };
  }[];
  canSaveSnapshot?: boolean;
}

export function LeaderboardHistoryPanel({ 
  currentRankings = [], 
  canSaveSnapshot = false 
}: LeaderboardHistoryPanelProps) {
  const { formatDate } = useFormatDate();
  const { allHistory, loading, saveWeeklySnapshot, refetch } = useLeaderboardHistory();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [saving, setSaving] = useState(false);

  const selectedWeek = format(
    subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), selectedWeekOffset),
    'yyyy-MM-dd'
  );

  const weekHistory = allHistory
    .filter(h => h.week_start === selectedWeek)
    .sort((a, b) => a.overall_rank - b.overall_rank);

  const {
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    showingFrom,
    showingTo,
  } = usePaginatedSort({
    data: weekHistory,
    defaultPageSize: 20,
  });

  const handleSaveSnapshot = async () => {
    if (currentRankings.length === 0) {
      toast.error('No rankings to save');
      return;
    }

    setSaving(true);
    try {
      await saveWeeklySnapshot(currentRankings);
      toast.success('Weekly snapshot saved!');
    } catch (error) {
      toast.error('Failed to save snapshot');
    } finally {
      setSaving(false);
    }
  };

  const getRankChangeIcon = (entry: LeaderboardHistoryEntry) => {
    const previousWeek = format(
      subWeeks(new Date(entry.week_start), 1),
      'yyyy-MM-dd'
    );
    const previousEntry = allHistory.find(
      h => h.user_id === entry.user_id && h.week_start === previousWeek
    );

    if (!previousEntry) return <Minus className="w-3 h-3 text-muted-foreground" />;

    const change = previousEntry.overall_rank - entry.overall_rank;
    if (change > 0) return <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-base tracking-wide">RANKING HISTORY</h3>
        </div>
        {canSaveSnapshot && (
          <Button
            size={tokens.button.card}
            variant="outline"
            onClick={handleSaveSnapshot}
            disabled={saving || currentRankings.length === 0}
            className="text-xs"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Save className="w-3 h-3 mr-1" />
            )}
            Save Snapshot
          </Button>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
        <Button
          variant="ghost"
          size={tokens.button.inline}
          onClick={() => setSelectedWeekOffset(prev => prev + 1)}
          disabled={selectedWeekOffset >= 7}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-sans text-sm">
          Week of {formatDate(new Date(selectedWeek), 'MMM d, yyyy')}
        </span>
        <Button
          variant="ghost"
          size={tokens.button.inline}
          onClick={() => setSelectedWeekOffset(prev => prev - 1)}
          disabled={selectedWeekOffset <= 0}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* History list */}
      {loading ? (
        <DashboardLoader size="sm" className="py-8" />
      ) : weekHistory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm font-sans">
          No history for this week
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedData.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 flex items-center justify-center font-display text-sm bg-muted rounded">
                  {entry.overall_rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm truncate">
                    User {entry.user_id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(entry.overall_score).toFixed(1)} pts
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {getRankChangeIcon(entry)}
                </div>
              </div>
            ))}
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            showingFrom={showingFrom}
            showingTo={showingTo}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </Card>
  );
}
