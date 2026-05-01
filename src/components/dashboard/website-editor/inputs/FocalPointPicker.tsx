/**
 * FocalPointPicker — click/drag on a thumbnail to anchor the most important
 * region of a background image. Stored as percentages (0..100) and applied via
 * CSS `object-position` on the rendered media. Reused by both the section
 * background editor and per-slide background editor.
 */
import { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Crosshair } from 'lucide-react';
import { DefaultBadge } from '@/components/ui/default-badge';

interface FocalPointPickerProps {
  imageUrl: string;
  isVideo?: boolean;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  onReset: () => void;
  /** Optional title override (default: "Focal Point") */
  label?: string;
  /** Optional helper text override */
  helper?: string;
}

export function FocalPointPicker({
  imageUrl,
  isVideo = false,
  x,
  y,
  onChange,
  onReset,
  label = 'Focal Point',
  helper,
}: FocalPointPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 100;
    const ny = ((clientY - rect.top) / rect.height) * 100;
    onChange(
      Math.round(Math.max(0, Math.min(100, nx))),
      Math.round(Math.max(0, Math.min(100, ny))),
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromEvent(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromEvent(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const helperText =
    helper ??
    'Click or drag on the image to anchor the most important area — it stays in view as the section is cropped on different screens.';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs inline-flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" />
          {label}
          {x === 50 && y === 50 && (
            <span className="font-sans normal-case tracking-normal text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded-full border border-border/60">
              Default
            </span>
          )}
        </Label>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to center
        </button>
      </div>
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-muted cursor-crosshair select-none touch-none"
        style={{ aspectRatio: '16 / 9' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{ objectPosition: `${x}% ${y}%` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
            {isVideo ? 'Add a poster image to set the focal point' : ''}
          </div>
        )}
        <div
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {helperText} ({x}%, {y}%)
      </p>
    </div>
  );
}
