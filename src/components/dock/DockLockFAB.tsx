import { Lock } from 'lucide-react';

interface DockLockFABProps {
  onLock: () => void;
}

export function DockLockFAB({ onLock }: DockLockFABProps) {
  return (
    <button
      onClick={onLock}
      className="absolute bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] shadow-lg shadow-black/20 active:scale-95 transition-all duration-150 hover:bg-white/[0.10]"
      aria-label="Lock station"
    >
      <Lock className="w-5 h-5 text-white/50" />
    </button>
  );
}
