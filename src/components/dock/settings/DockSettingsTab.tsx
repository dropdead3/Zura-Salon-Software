/**
 * DockSettingsTab — Staff profile, personal stats, team compliance,
 * station location, and logout.
 */

import { useState } from 'react';
import { User, MapPin, BarChart3, ShieldCheck, Lock, ChevronRight, Droplets, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { useDockDispensingVisual, type DispensingVisual } from '@/hooks/dock/useDockDispensingVisual';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import { useLocations } from '@/hooks/useLocations';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DockMyStatsPanel } from './DockMyStatsPanel';
import { DockTeamCompliancePanel } from './DockTeamCompliancePanel';
import { InventoryReconciliationBanner } from '@/components/dashboard/color-bar/InventoryReconciliationBanner';

interface DockSettingsTabProps {
  staff: DockStaffSession;
  onLogout: () => void;
}

type SettingsView = 'main' | 'my-stats' | 'team-compliance';

export function DockSettingsTab({ staff, onLogout }: DockSettingsTabProps) {
  const [view, setView] = useState<SettingsView>('main');
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const { data: locations } = useLocations(staff.organizationId);
  const { isDemoMode } = useDockDemo();
  const locationName = locations?.find(l => l.id === staff.locationId)?.name ?? 'Unknown location';

  const { data: stationCount } = useQuery({
    queryKey: ['color-bar-stations-count', staff.organizationId, staff.locationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('backroom_stations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', staff.organizationId!)
        .eq('location_id', staff.locationId!)
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 1;
    },
    enabled: !!staff.organizationId && !!staff.locationId,
    staleTime: 5 * 60 * 1000,
  });

  const totalStations = stationCount ?? 1;

  const handleMoveStation = () => {
    if (isDemoMode) {
      toast.info('Not available in demo mode');
      return;
    }
    try {
      localStorage.removeItem('dock-organization-id');
      localStorage.removeItem('dock-location-id');
    } catch {}
    toast.success('Station unbound — next login will bind to new location');
    onLogout();
  };

  if (view === 'my-stats') {
    return <DockMyStatsPanel staff={staff} onBack={() => setView('main')} />;
  }

  if (view === 'team-compliance') {
    return <DockTeamCompliancePanel staff={staff} onBack={() => setView('main')} />;
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Page header */}
      <div className="px-7 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]">
        <h1 className="font-display text-3xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">Settings</h1>
        <p className="text-base text-[hsl(var(--platform-foreground-muted))]">Station & account</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {/* Inventory reconciliation banner — shown only when this station's location is flagged */}
      <InventoryReconciliationBanner locationId={staff.locationId} />

      {/* Staff profile card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
        <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
          {staff.avatarUrl ? (
            <img src={staff.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-violet-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[hsl(var(--platform-foreground))] truncate">
            {staff.displayName}
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Zura Color Bar Station 1 of {totalStations} at {locationName}
          </p>
        </div>
      </div>

      {/* My Stats card */}
      <button
        onClick={() => setView('my-stats')}
        className="mt-4 flex items-center gap-3 w-full p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-600/15 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">
            My Performance
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Reweigh, waste & cost stats
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
      </button>

      {/* Team Compliance card */}
      <button
        onClick={() => setView('team-compliance')}
        className="mt-3 flex items-center gap-3 w-full p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">
            Team Compliance
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Admin PIN required
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
      </button>

      {/* Dispensing Visual preference */}
      <DispensingVisualSelector />

      {/* Station Location module */}
      <div className="mt-4 p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">
              Station Location
            </p>
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
              {locationName}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] mb-3 leading-relaxed">
          Reassign this device to a different salon location. The station will log out and prompt for location selection on next PIN login.
        </p>

        <button
          onClick={() => setShowMoveConfirm(true)}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[hsl(var(--platform-bg-hover))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-elevated))] transition-colors text-sm"
        >
          Move to Another Location
        </button>
      </div>
      </div>

      {/* Move Dock confirmation overlay — absolute, not portal */}
      <AnimatePresence>
        {showMoveConfirm && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMoveConfirm(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-card))] p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))] mb-2">
                Move Zura Dock?
              </h2>
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed mb-6">
                This will unbind this device from{' '}
                <strong className="text-[hsl(var(--platform-foreground))]">{locationName}</strong>.
                On next PIN login, it will bind to the new staff member's location.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMoveConfirm(false)}
                  className="h-10 px-7 rounded-full border border-[hsl(var(--platform-border)/0.4)] text-sm text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMoveConfirm(false);
                    handleMoveStation();
                  }}
                  className="h-10 px-7 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                >
                  Move Station
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DispensingVisualSelector() {
  const { visual, setVisual } = useDockDispensingVisual();

  const options: { value: DispensingVisual; label: string; icon: React.ReactNode }[] = [
    { value: 'teardrop', label: 'Teardrop', icon: <Droplets className="w-5 h-5" /> },
    { value: 'bar', label: 'Progress Bar', icon: <BarChart className="w-5 h-5" /> },
  ];

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
      <p className="text-sm font-medium text-[hsl(var(--platform-foreground))] mb-1">
        Dispensing Visual
      </p>
      <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mb-3">
        Choose the visual aid shown during ingredient dispensing
      </p>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { navigator.vibrate?.(15); setVisual(opt.value); }}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
              visual === opt.value
                ? 'bg-violet-600/15 border-violet-500/40 text-violet-300'
                : 'bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border)/0.2)] text-[hsl(var(--platform-foreground-muted))] hover:border-[hsl(var(--platform-border)/0.4)]'
            )}
          >
            {opt.icon}
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
