/**
 * STRUCTURE NAV TAB
 * 
 * Renders the full NavigationManager inline in the left Structure panel.
 */

import { NavigationManager } from '../navigation/NavigationManager';

export function StructureNavTab() {
  return (
    <div className="flex flex-col">
      <NavigationManager />
    </div>
  );
}
