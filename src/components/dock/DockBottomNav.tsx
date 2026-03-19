/**
 * DockBottomNav — 5-tab bottom navigation bar.
 * Schedule | Active | Clients | Scale | Settings
 */

import { Calendar, FlaskConical, Users, Weight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockTab } from '@/pages/Dock';

interface DockBottomNavProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
}

const TABS: { id: DockTab; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'active', label: 'Active', icon: FlaskConical },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'scale', label: 'Scale', icon: Weight },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DockBottomNav({ activeTab, onTabChange }: DockBottomNavProps) {
  return (
    <nav className="flex-shrink-0 border-t border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-elevated))] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-150',
                isActive
                  ? 'text-violet-400'
                  : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]')} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
