import { useDockDemo } from '@/contexts/DockDemoContext';
import { DOCK_BADGE } from '@/components/dock/dock-ui-tokens';
import { cn } from '@/lib/utils';

export function DockDemoBadge() {
  const { isDemoMode } = useDockDemo();
  if (!isDemoMode) return null;

  return (
    <div className="absolute top-[1.45rem] right-20 z-50">
      <span className={cn(DOCK_BADGE.base, DOCK_BADGE.demo, 'inline-flex items-center gap-1.5 backdrop-blur-md')}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Demo
      </span>
    </div>
  );
}
