import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import type { DockDevice } from '@/hooks/dock/useDockDevicePreview';

interface DockDeviceSwitcherProps {
  device: DockDevice;
  onChange: (device: DockDevice) => void;
}

const options = [
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
  { value: 'full', label: 'Full', icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function DockDeviceSwitcher({ device, onChange }: DockDeviceSwitcherProps) {
  return (
    <div className="fixed top-3 right-3 z-50">
      <TogglePill
        options={options}
        value={device}
        onChange={(v) => onChange(v as DockDevice)}
        size="sm"
        variant="glass"
      />
    </div>
  );
}
