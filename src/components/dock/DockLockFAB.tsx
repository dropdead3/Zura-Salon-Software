import { Lock } from 'lucide-react';

interface DockLockFABProps {
  onLock: () => void;
}

export function DockLockFAB({ onLock }: DockLockFABProps) {
  return (
    <button
      onClick={onLock}
      className="absolute bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center bg-white/[0.08] backdrop-blur-2xl border border-white/[0.15] ring-1 ring-white/[0.06] shadow-xl shadow-black/30 active:scale-95 transition-all duration-150 hover:bg-white/[0.12]"
      aria-label="Lock station"
    >
      <Lock className="w-6 h-6 text-white/50" />
    </button>
  );
}
