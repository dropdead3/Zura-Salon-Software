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
              className="relative flex items-center justify-center flex-1 h-12 z-10"
            >
              {/* Icon wrapper — serves as anchor for indicator */}
              <div className="relative flex items-center justify-center">
                {/* Sliding circle indicator — centered on icon */}
                {isActive && (
                  <motion.div
                    layoutId="dock-indicator"
                    transition={SPRING}
                    className="absolute w-11 h-11 rounded-full bg-violet-500/[0.12] shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  />
                )}

                {/* Icon with scale morph */}
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
              </div>

              {/* Label — absolutely positioned below icon */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-medium tracking-wide text-violet-300 whitespace-nowrap"
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
