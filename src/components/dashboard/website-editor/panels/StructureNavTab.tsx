/**
 * STRUCTURE NAV TAB
 * 
 * Activating this tab tells the Inspector to render NavigationManager.
 * Shows a minimal placeholder prompting the user to use the Inspector.
 */

import { Navigation } from 'lucide-react';

interface StructureNavTabProps {
  isActive: boolean;
  onActivate: () => void;
}

export function StructureNavTab({ isActive, onActivate }: StructureNavTabProps) {
  // Auto-activate navigation in Inspector when this tab is shown
  if (!isActive) {
    // Trigger on mount
    setTimeout(onActivate, 0);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <Navigation className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-sans font-medium text-foreground">
          Navigation Manager
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Edit menus, items, and mobile settings in the Inspector panel →
        </p>
      </div>
    </div>
  );
}
