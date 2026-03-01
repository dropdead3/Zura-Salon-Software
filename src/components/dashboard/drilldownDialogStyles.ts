/** Shared DialogContent className for all drill-down popups. Ensures identical open/close animation. */
export const DRILLDOWN_DIALOG_CONTENT_CLASS =
  'max-w-lg p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]';

export const DRILLDOWN_OVERLAY_CLASS = 'backdrop-blur-sm bg-black/60';
