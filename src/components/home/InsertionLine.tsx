import { useCallback } from 'react';

interface InsertionLineProps {
  afterSectionId: string;
}

export function InsertionLine({ afterSectionId }: InsertionLineProps) {
  const handleClick = useCallback(() => {
    window.parent.postMessage({ type: 'EDITOR_ADD_SECTION_AT', afterSectionId }, '*');
  }, [afterSectionId]);

  return (
    <div className="group/insert relative h-6 flex items-center justify-center">
      {/* Line */}
      <div className="absolute inset-x-4 h-px bg-primary/0 group-hover/insert:bg-primary/30 transition-colors duration-150" />
      {/* Button */}
      <button
        onClick={handleClick}
        className="relative z-10 opacity-0 group-hover/insert:opacity-100 transition-opacity duration-150 text-[11px] font-sans px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        + Add Section
      </button>
    </div>
  );
}
