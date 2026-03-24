/**
 * DockHamburgerMenu — Bottom-sheet nav matching DockNewBookingSheet visual language.
 * Absolute containment · spring transitions · pull-to-dismiss · dock token styling.
 */

import { useState } from 'react';
import { Menu, X, Calendar, FlaskConical, Users, Weight, Settings, Lock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DOCK_SHEET, DOCK_TEXT } from './dock-ui-tokens';
import type { DockTab } from '@/pages/Dock';

interface DockHamburgerMenuProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  onLockStation: () => void;
  onAddAppointment?: () => void;
}

const TABS: { id: DockTab; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'active', label: 'Active', icon: FlaskConical },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'scale', label: 'Scale', icon: Weight },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SPRING = DOCK_SHEET.spring;

export function DockHamburgerMenu({ activeTab, onTabChange, onLockStation, onAddAppointment }: DockHamburgerMenuProps) {
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
        className="absolute top-5 right-5 z-40 p-2.5 rounded-xl bg-[hsl(var(--platform-bg-elevated)/0.95)] border border-[hsl(var(--platform-border)/0.35)] backdrop-blur-md transition-colors hover:bg-[hsl(var(--platform-bg-elevated))]"
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
              {/* Top spacer for rounded corners */}
              <div className="h-2" />

              {/* Header row — close button only */}
              <div className="flex items-center justify-end px-5 pt-4 pb-1">
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors"
                >
                  <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
                </button>
              </div>

              {/* Nav items — grouped card container */}
              <div className="px-5 pt-1">
                <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-2xl p-1.5 space-y-0.5">
                  {TABS.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleTabSelect(id)}
                        className={cn(
                          'relative w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors',
                          isActive
                            ? 'bg-violet-500/[0.12] text-violet-300'
                            : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.05)]'
                        )}
                      >
                        {/* Active left accent bar */}
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-violet-400" />
                        )}
                        <Icon className={cn('w-5 h-5', isActive ? 'text-violet-400' : '')} />
                        <span className={cn(
                          'font-display text-sm tracking-wide uppercase',
                          isActive ? 'text-violet-300' : ''
                        )}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions — two-column grid */}
              <div className="px-5 mt-5">
                <p className={cn(DOCK_TEXT.category, 'px-1 mb-2')}>Quick Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  {onAddAppointment && (
                    <button
                      onClick={() => { onAddAppointment(); setOpen(false); }}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-violet-500/30 text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/[0.06] transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="font-sans text-xs">Add Appointment</span>
                    </button>
                  )}
                  <button
                    onClick={handleLock}
                    className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/[0.06] transition-colors"
                  >
                    <Lock className="w-5 h-5" />
                    <span className="font-sans text-xs">Lock Station</span>
                  </button>
                </div>
              </div>

              {/* Drag handle — bottom position for top-anchored sheet */}
              <div className="flex justify-center pb-4 pt-2">
                <div className="w-12 h-1.5 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.5)] cursor-grab active:cursor-grabbing" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}