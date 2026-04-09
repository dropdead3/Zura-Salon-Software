import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { RankedResult } from '@/lib/searchRanker';
import { ClientPreview } from './previews/ClientPreview';
import { TeamPreview } from './previews/TeamPreview';
import { NavigationPreview } from './previews/NavigationPreview';
import { ReportPreview } from './previews/ReportPreview';
import { InventoryPreview } from './previews/InventoryPreview';
import { AppointmentPreview } from './previews/AppointmentPreview';
import { TaskPreview } from './previews/TaskPreview';

interface CommandPreviewPanelProps {
  result: RankedResult;
}

export function CommandPreviewPanel({ result }: CommandPreviewPanelProps) {
  const renderPreview = () => {
    switch (result.type) {
      case 'client':
        return <ClientPreview result={result} />;
      case 'team':
        return <TeamPreview result={result} />;
      case 'report':
        return <ReportPreview result={result} />;
      case 'inventory':
        return <InventoryPreview result={result} />;
      case 'appointment':
        return <AppointmentPreview result={result} />;
      case 'task':
        return <TaskPreview result={result} />;
      case 'navigation':
      case 'help':
      case 'utility':
      case 'action':
      default:
        return <NavigationPreview result={result} />;
    }
  };

  return (
    <div
      className={cn(
        'preview-panel w-[340px] shrink-0 border-l border-border/20',
        'bg-card-inner/50 backdrop-blur-sm',
        'animate-in fade-in-0 slide-in-from-right-2 duration-150',
        'overflow-y-auto hidden lg:block'
      )}
    >
      <div className="p-5">
        {renderPreview()}
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-full mt-4" />
    </div>
  );
}
