import { Lock } from 'lucide-react';

interface DockLockFABProps {
  onLock: () => void;
}

export function DockLockFAB({ onLock }: DockLockFABProps) {
  return (
    <button
      onClick={onLock}
      className="absolute bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-white/[0.12] to-white/[0.04] backdrop-blur-2xl border border-white/[0.18] ring-1 ring-white/[0.08] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-150 hover:from-white/[0.16] hover:to-white/[0.06]"
      aria-label="Lock station"
    >
      <Lock className="w-6 h-6 text-white/50" />
    </button>
  );
}
