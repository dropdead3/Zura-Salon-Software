import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AIInsightsDrawer, AIInsightsPanel } from '@/components/dashboard/AIInsightsDrawer';
import { PersonalInsightsDrawer, PersonalInsightsPanel } from '@/components/dashboard/PersonalInsightsDrawer';
import { AnnouncementsDrawer, AnnouncementsPanel } from '@/components/dashboard/AnnouncementsDrawer';
import { LiveSessionIndicator } from '@/components/dashboard/LiveSessionIndicator';
import { PhorestSyncPopout } from '@/components/dashboard/PhorestSyncPopout';
import { DashboardCustomizeMenu } from '@/components/dashboard/DashboardCustomizeMenu';
import { AnalyticsFilterBar } from '@/components/dashboard/AnalyticsFilterBar';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalyticsFilters, DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';

type Density = 'full' | 'short' | 'icon-some';

function useControlRowDensity(containerRef: React.RefObject<HTMLDivElement | null>): Density {
  const [density, setDensity] = useState<Density>('full');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 1440;
      if (width >= 1280) {
        setDensity('full');
      } else if (width >= 1024) {
        setDensity('short');
      } else {
        setDensity('icon-some');
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return density;
}

interface RoleContext {
  isLeadership: boolean;
  hasStylistRole: boolean;
  isFrontDesk: boolean;
  isReceptionist: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface CommandCenterControlRowProps {
  isLeadership: boolean;
  analyticsFilters: AnalyticsFilters;
  onLocationChange: (value: string) => void;
  onDateRangeChange: (value: DateRangeType) => void;
  accessibleLocations: Location[];
  canViewAggregate: boolean;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
  roleContext: RoleContext;
}

type ExpansionPanel = 'insights' | 'announcements' | null;

export function CommandCenterControlRow({
  isLeadership,
  analyticsFilters,
  onLocationChange,
  onDateRangeChange,
  accessibleLocations,
  canViewAggregate,
  compact,
  onCompactChange,
  roleContext,
}: CommandCenterControlRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const density = useControlRowDensity(containerRef);
  const [activePanel, setActivePanel] = useState<ExpansionPanel>(null);

  const isShort = density === 'short' || density === 'icon-some';
  const announcementsIconOnly = density === 'icon-some';
  const gapClass = density === 'full' ? 'gap-2' : 'gap-1.5';

  const toggleInsights = useCallback(() => {
    setActivePanel(prev => prev === 'insights' ? null : 'insights');
  }, []);

  const toggleAnnouncements = useCallback(() => {
    setActivePanel(prev => prev === 'announcements' ? null : 'announcements');
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  // Allow other surfaces (e.g., InsightsNudgeBanner) to open the Insights drawer
  useEffect(() => {
    const handler = () => {
      setActivePanel('insights');
      requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('open-insights-panel', handler);
    return () => window.removeEventListener('open-insights-panel', handler);
  }, []);

  return (
    <div ref={containerRef} className="pt-6 pb-2">
      {/* Controls Row — stable, never shifts */}
      <div className={cn(
        'flex items-center justify-between flex-nowrap overflow-hidden',
        gapClass,
      )}>
        {/* LEFT CLUSTER: Context — shrinks first */}
        <div className={cn('flex items-center min-w-0 shrink', gapClass)}>
          {isLeadership ? (
            <AIInsightsDrawer
              label={isShort ? 'Insights' : undefined}
              expanded={activePanel === 'insights'}
              onToggle={toggleInsights}
            />
          ) : (
            <PersonalInsightsDrawer
              label={isShort ? 'Insights' : undefined}
              expanded={activePanel === 'insights'}
              onToggle={toggleInsights}
            />
          )}
          <AnnouncementsDrawer
            isLeadership={isLeadership}
            label={isShort ? 'Announce' : undefined}
            iconOnly={announcementsIconOnly}
            expanded={activePanel === 'announcements'}
            onToggle={toggleAnnouncements}
          />
          <LiveSessionIndicator
            locationId={analyticsFilters.locationId}
            compact={isShort}
          />
        </div>

        {/* ELASTIC SPACER */}
        <div className="flex-1 min-w-0" />

        {/* RIGHT CLUSTER: Scope + Controls — never wraps */}
        <div className="shrink-0">
          <AnalyticsFilterBar
            locationId={analyticsFilters.locationId}
            onLocationChange={onLocationChange}
            dateRange={analyticsFilters.dateRange}
            onDateRangeChange={onDateRangeChange}
            accessibleLocations={accessibleLocations}
            canViewAggregate={canViewAggregate}
            compact={compact}
            onCompactChange={onCompactChange}
            density={density}
            leadingContent={
              <div className="flex items-center gap-1">
                {isLeadership && <PhorestSyncPopout />}
                <DashboardCustomizeMenu roleContext={roleContext} />
              </div>
            }
          />
        </div>
      </div>

      {/* Expansion Row — full-width, below controls, in document flow */}
      <AnimatePresence>
        {activePanel === 'insights' && (
          <motion.div
            key="insights-expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-clip"
          >
            <div className="pt-3">
              {isLeadership ? (
                <AIInsightsPanel onClose={closePanel} />
              ) : (
                <PersonalInsightsPanel onClose={closePanel} />
              )}
            </div>
          </motion.div>
        )}
        {activePanel === 'announcements' && (
          <motion.div
            key="announcements-expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-clip"
          >
            <div className="pt-3">
              <AnnouncementsPanel isLeadership={isLeadership} onClose={closePanel} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
