/**
 * DockHamburgerMenu — Full-screen overlay nav replacing bottom tab bar.
 * Absolute containment · spring transitions · dock token styling.
 */

import { useState } from 'react';
import { Menu, X, Calendar, FlaskConical, Users, Weight, Settings, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DOCK_SHEET } from './dock-ui-tokens';
import type { DockTab } from '@/pages/Dock';

interface DockHamburgerMenuProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  onLockStation: () => void;
}

const TABS: { id: DockTab; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'active', label: 'Active', icon: FlaskConical },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'scale', label: 'Scale', icon: Weight },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

export function DockHamburgerMenu({ activeTab, onTabChange, onLockStation }: DockHamburgerMenuProps) {
  const [open, setOpen] = useState(false);

  const handleTabSelect = (id: DockTab) => {
    onTabChange(id);
    setOpen(false);
  };

  const handleLock = () => {
    setOpen(false);
    onLockStation();
  };

  return (
    <>
      {/* Hamburger trigger — top-right */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute top-5 right-5 z-40 p-2.5 rounded-xl bg-[hsl(var(--platform-bg-elevated)/0.8)] border border-[hsl(var(--platform-border)/0.2)] backdrop-blur-md transition-colors hover:bg-[hsl(var(--platform-bg-elevated))]"
      >
        {open ? (
          <X className="w-5 h-5 text-[hsl(var(--platform-foreground))]" />
        ) : (
          <Menu className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
        )}
      </button>

      {/* Full-screen overlay menu */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Menu panel — slides down from top */}
            <motion.div
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={SPRING}
              className="absolute inset-x-0 top-0 z-35 flex flex-col bg-[hsl(var(--platform-bg-elevated))] border-b border-[hsl(var(--platform-border)/0.3)] rounded-b-2xl shadow-2xl pt-16 pb-6 px-6"
              style={{ zIndex: 35 }}
            >
              {/* Tab items */}
              <div className="space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTabSelect(id)}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors',
                        isActive
                          ? 'bg-violet-500/[0.12] text-violet-300'
                          : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.05)]'
                      )}
                    >
                      <Icon className={cn('w-5 h-5', isActive ? 'text-violet-400' : '')} />
                      <span className={cn(
                        'font-display text-sm tracking-wide uppercase',
                        isActive ? 'text-violet-300' : ''
                      )}>
                        {label}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-[hsl(var(--platform-border)/0.2)]" />

              {/* Lock Station */}
              <button
                onClick={handleLock}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/[0.1] transition-colors"
              >
                <Lock className="w-5 h-5" />
                <span className="font-display text-sm tracking-wide uppercase">Lock Station</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
