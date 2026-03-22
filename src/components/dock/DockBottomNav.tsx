/**
 * DockBottomNav — macOS-style morphing dock with sliding indicator.
 * Floating capsule · spring-animated pill · scale morphing · label reveal.
 */

import { Calendar, FlaskConical, Users, Weight, Settings, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DockTab } from '@/pages/Dock';

interface DockBottomNavProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  onLockStation?: () => void;
}

const TABS: { id: DockTab; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'active', label: 'Active', icon: FlaskConical },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'scale', label: 'Scale', icon: Weight },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

export function DockBottomNav({ activeTab, onTabChange, onLockStation }: DockBottomNavProps) {
  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-1">
      <nav className="relative flex items-center justify-around rounded-full border border-white/[0.06] bg-[hsl(var(--platform-bg-elevated)/0.75)] backdrop-blur-xl px-2 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const isSettingsLock = id === 'settings' && isActive;
          const DisplayIcon = isSettingsLock ? Lock : Icon;
          const displayLabel = isSettingsLock ? 'Lock Station' : label;

          const handleClick = () => {
            if (isSettingsLock && onLockStation) {
              onLockStation();
            } else {
              onTabChange(id);
            }
          };

          return (
            <button
              key={id}
              onClick={handleClick}
              className="relative flex h-[72px] flex-1 items-center justify-center px-1"
            >
              {/* Full-slot pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-indicator"
                  transition={SPRING}
                  className={cn(
                    "absolute inset-0 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.15)]",
                    isSettingsLock
                      ? 'bg-red-500/[0.12] shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : 'bg-violet-500/[0.12]'
                  )}
                />
              )}

              {/* Centered content stack */}
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-0.5">
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={SPRING}
                >
                  <DisplayIcon
                    className={cn(
                      'h-7 w-7 transition-colors duration-150',
                      isActive
                        ? isSettingsLock
                          ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                        : 'text-white/40 hover:text-white/60'
                    )}
                  />
                </motion.div>

                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "whitespace-nowrap text-xs font-medium tracking-wide",
                        isSettingsLock ? 'text-red-300' : 'text-violet-300'
                      )}
                    >
                      {displayLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
