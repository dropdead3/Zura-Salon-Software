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
              className="relative flex flex-col items-center justify-center flex-1 h-12 z-10"
            >
              {/* Sliding pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-indicator"
                  transition={SPRING}
                  className="absolute inset-0 rounded-full bg-violet-500/[0.12] shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                />
              )}

              {/* Icon with scale morph */}
              <motion.div
                animate={{ scale: isActive ? 1.2 : 1 }}
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

              {/* Label — only visible on active tab */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="text-[9px] font-medium tracking-wide text-violet-300 mt-0.5"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
