import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, HeartPulse, CalendarX, AlertTriangle, UserX, UserPlus, Cake, TrendingDown, Loader2 } from 'lucide-react';
import { useClientHealthSegments, SEGMENTS, type SegmentKey } from '@/hooks/useClientHealthSegments';
import { ClientSegmentTable } from '@/components/dashboard/client-health/ClientSegmentTable';
import { BulkOutreachBar } from '@/components/dashboard/client-health/BulkOutreachBar';

const SEGMENT_ICONS: Record<SegmentKey, React.ComponentType<{ className?: string }>> = {
  'needs-rebooking': CalendarX,
  'at-risk': AlertTriangle,
  'win-back': UserX,
  'new-no-return': UserPlus,
  'birthday': Cake,
  'high-value-quiet': TrendingDown,
};

const SEGMENT_COLORS: Record<SegmentKey, string> = {
  'needs-rebooking': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'at-risk': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'win-back': 'bg-red-500/10 text-red-600 dark:text-red-400',
  'new-no-return': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'birthday': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'high-value-quiet': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export default function ClientHealthHub() {
  const [searchParams] = useSearchParams();
  const initialSegment = (searchParams.get('segment') as SegmentKey) || 'needs-rebooking';
  const [activeSegment, setActiveSegment] = useState<SegmentKey>(initialSegment);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: segments, isLoading } = useClientHealthSegments();

  // Reset selection when segment changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeSegment]);

  const currentClients = segments?.[activeSegment] || [];
  const selectedClients = currentClients.filter(c => selectedIds.has(c.id));
  const currentSegment = SEGMENTS.find(s => s.key === activeSegment)!;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link to="/dashboard/admin/management">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <HeartPulse className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h1 className="font-display text-3xl lg:text-4xl">Client Health Hub</h1>
                <p className="text-muted-foreground mt-1">Identify and reach clients who need attention</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Segment Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {SEGMENTS.map(seg => {
                const Icon = SEGMENT_ICONS[seg.key];
                const count = segments?.[seg.key]?.length || 0;
                const isActive = activeSegment === seg.key;
                return (
                  <button
                    key={seg.key}
                    onClick={() => setActiveSegment(seg.key)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg w-fit mb-2 ${SEGMENT_COLORS[seg.key]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-medium">{count}</p>
                    <p className="text-xs text-muted-foreground truncate">{seg.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Active Segment Detail */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium">{currentSegment.label}</h2>
                    <p className="text-sm text-muted-foreground">{currentSegment.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {currentClients.length} clients
                  </Badge>
                </div>

                <ClientSegmentTable
                  clients={currentClients}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
              </CardContent>
            </Card>

            {/* Bulk Outreach Bar */}
            <BulkOutreachBar
              selectedClients={selectedClients}
              segmentLabel={currentSegment.label}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
