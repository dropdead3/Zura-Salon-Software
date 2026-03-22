/**
 * DockHamburgerMenu — Bottom-sheet nav matching DockNewBookingSheet visual language.
 * Absolute containment · spring transitions · pull-to-dismiss · dock token styling.
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

const SPRING = DOCK_SHEET.spring;

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

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y < -DOCK_SHEET.dismissThreshold.offset || info.velocity.y < -DOCK_SHEET.dismissThreshold.velocity) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Hamburger trigger — top-right */}
      <button
        onClick={() => setOpen(true)}
        className="absolute top-5 right-5 z-40 p-2.5 rounded-xl bg-[hsl(var(--platform-bg-elevated)/0.8)] border border-[hsl(var(--platform-border)/0.2)] backdrop-blur-md transition-colors hover:bg-[hsl(var(--platform-bg-elevated))]"
      >
        <Menu className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
      </button>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={DOCK_SHEET.backdrop}
              style={{ zIndex: 45 }}
              onClick={() => setOpen(false)}
            />

            {/* Sheet panel — slides up from bottom */}
            <motion.div
              drag="y"
              dragConstraints={{ bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={SPRING}
              className="absolute inset-x-0 top-0 flex flex-col bg-[hsl(var(--platform-bg))] border-b border-[hsl(var(--platform-border))] rounded-b-2xl shadow-2xl"
              style={{ zIndex: 46, maxHeight: DOCK_SHEET.maxHeight }}
            >
              {/* Drag handle */}
              <div className={DOCK_SHEET.dragHandle} />

              {/* Header row */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                  Navigation
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors"
                >
                  <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
                </button>
              </div>

              {/* Tab items */}
              <div className="px-4 space-y-1">
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
              <div className="mx-6 my-4 h-px bg-[hsl(var(--platform-border)/0.2)]" />

              {/* Lock Station */}
              <div className="px-4 pb-8">
                <button
                  onClick={handleLock}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/[0.1] transition-colors"
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-display text-sm tracking-wide uppercase">Lock Station</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}