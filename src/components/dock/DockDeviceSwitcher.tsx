import { Monitor, Smartphone, Tablet, RotateCcw } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import type { DockDevice, DockOrientation } from '@/hooks/dock/useDockDevicePreview';

interface DockDeviceSwitcherProps {
  device: DockDevice;
  onChange: (device: DockDevice) => void;
  orientation: DockOrientation;
  onOrientationChange: (orientation: DockOrientation) => void;
}

const deviceOptions = [
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
  { value: 'full', label: 'Full', icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function DockDeviceSwitcher({ device, onChange, orientation, onOrientationChange }: DockDeviceSwitcherProps) {
  const showRotate = device === 'tablet';

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      {showRotate && (
        <button
          type="button"
          onClick={() => onOrientationChange(orientation === 'portrait' ? 'landscape' : 'portrait')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground/10 backdrop-blur-md text-foreground/60 hover:text-foreground/80 transition-colors"
          title={orientation === 'portrait' ? 'Switch to landscape' : 'Switch to portrait'}
        >
          <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${orientation === 'landscape' ? 'rotate-90' : ''}`} />
        </button>
      )}
      <TogglePill
        options={deviceOptions}
        value={device}
        onChange={(v) => onChange(v as DockDevice)}
        size="sm"
        variant="glass"
      />
    </div>
  );
}
