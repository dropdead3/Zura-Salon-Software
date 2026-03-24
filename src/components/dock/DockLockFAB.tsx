import { Lock } from 'lucide-react';

interface DockLockFABProps {
  onLock: () => void;
}

export function DockLockFAB({ onLock }: DockLockFABProps) {
  return (
    <button
      onClick={onLock}
      className="absolute bottom-6 left-6 z-30 w-12 h-12 rounded-full flex items-center justify-center bg-[hsl(var(--platform-foreground)/0.08)] border border-[hsl(var(--platform-border)/0.2)] active:scale-95 transition-transform duration-150"
      aria-label="Lock station"
    >
      <Lock className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
    </button>
  );
}
