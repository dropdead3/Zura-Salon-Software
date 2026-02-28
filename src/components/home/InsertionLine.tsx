/**
 * INSERTION LINE
 * 
 * Between-card hover zone in the editor canvas preview.
 * Shows a subtle "+ Add Section" pill on hover.
 * Editor-only — never renders on the public site.
 */

import { useCallback } from 'react';
import { Plus } from 'lucide-react';

interface InsertionLineProps {
  afterSectionId: string;
}

export function InsertionLine({ afterSectionId }: InsertionLineProps) {
  const handleClick = useCallback(() => {
    window.parent.postMessage(
      { type: 'EDITOR_ADD_SECTION_AT', afterSectionId },
      window.location.origin
    );
  }, [afterSectionId]);

  return (
    <div className="group/insert relative h-0 hover:h-8 flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden" onClick={handleClick}>
      {/* Line */}
      <div className="absolute inset-x-4 h-px bg-primary/0 group-hover/insert:bg-primary/30 transition-colors duration-150" />
      
      {/* Add button pill */}
      <button
        className="relative z-10 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-sans text-primary bg-primary/0 group-hover/insert:bg-primary/10 opacity-0 group-hover/insert:opacity-100 transition-all duration-150"
      >
        <Plus className="h-3 w-3" />
        Add Section
      </button>
    </div>
  );
}
