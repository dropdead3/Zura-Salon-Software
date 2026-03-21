/**
 * DockLocationPicker — Full-screen location selection for multi-location staff.
 * Shown after PIN validation when no device-bound location exists and staff has multiple assignments.
 */

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocations } from '@/hooks/useLocations';
import { PLATFORM_NAME } from '@/lib/brand';

interface DockLocationPickerProps {
  organizationId: string;
  locationIds: string[];
  staffName: string;
  onSelect: (locationId: string) => void;
}

export function DockLocationPicker({ organizationId, locationIds, staffName, onSelect }: DockLocationPickerProps) {
  const { data: allLocations = [] } = useLocations(organizationId);
  const [selected, setSelected] = useState<string | null>(null);

  // Filter to only staff's assigned locations
  const locations = allLocations.filter(l => locationIds.includes(l.id));

  const handleSelect = (locId: string) => {
    setSelected(locId);
    // Brief delay for visual feedback
    setTimeout(() => onSelect(locId), 200);
  };

  return (
    <div className="platform-theme platform-dark absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.12)_0%,rgba(59,130,246,0.06)_40%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-4">
          <MapPin className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))] text-center mb-1">
          Select Location
        </h1>
        <p className="text-sm text-[hsl(var(--platform-foreground-muted))] text-center mb-8">
          Hi {staffName} — choose which location this station is at
        </p>

        {/* Location cards */}
        <div className="w-full space-y-3">
          {locations.map((loc, i) => (
            <motion.button
              key={loc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
              onClick={() => handleSelect(loc.id)}
              className={`flex items-center gap-4 w-full p-4 rounded-2xl border transition-all text-left ${
                selected === loc.id
                  ? 'bg-violet-600/20 border-violet-500/50'
                  : 'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">
                  {loc.name}
                </p>
                {loc.city && (
                  <p className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
                    {loc.city}
                  </p>
                )}
              </div>
              {selected === loc.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.3)]">
          Powered by {PLATFORM_NAME}
        </span>
      </div>
    </div>
  );
}
