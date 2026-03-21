/**
 * DockBottomNav — macOS-style morphing dock with sliding indicator.
 * Floating capsule · spring-animated pill · scale morphing · label reveal.
 */

import { Calendar, FlaskConical, Users, Weight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

export function DockBottomNav({ activeTab, onTabChange }: DockBottomNavProps) {
  return (
    <div className="flex-shrink-0 px-4 pb-3 pt-1">
      <nav className="relative flex items-center justify-around rounded-full border border-white/[0.06] bg-[hsl(var(--platform-bg-elevated)/0.75)] backdrop-blur-xl px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="relative flex-1 h-12"
            >
              {/* Full-width pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-indicator"
                  transition={SPRING}
                  className="absolute inset-y-0 inset-x-1 rounded-full bg-violet-500/[0.12] shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                />
              )}

              {/* Centered content stack */}
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-0.5">
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={SPRING}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-150',
                      isActive
                        ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]'
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
                      className="text-[9px] font-medium tracking-wide text-violet-300 whitespace-nowrap"
                    >
                      {label}
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
