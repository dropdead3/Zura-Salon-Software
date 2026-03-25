import { useDockDemo } from '@/contexts/DockDemoContext';

export function DockDemoBadge() {
  const { isDemoMode } = useDockDemo();
  if (!isDemoMode) return null;

  return (
    <div className="w-full shrink-0 bg-amber-500/10 border-b border-amber-500/20 py-1.5 flex items-center justify-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider font-display">
        Now viewing in Demo Mode
      </span>
    </div>
  );
}
