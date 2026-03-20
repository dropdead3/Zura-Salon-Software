import { useDockDemo } from '@/contexts/DockDemoContext';

export function DockDemoBadge() {
  const { isDemoMode } = useDockDemo();
  if (!isDemoMode) return null;

  return (
    <div className="fixed top-3 left-3 z-50">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Demo
      </span>
    </div>
  );
}
