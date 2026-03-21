/**
 * LUXURY SKELETON LOADERS — Website Editor
 *
 * Three skeleton components matching the glass-bento panel architecture.
 * Uses a subtle opacity pulse (1.0 → 0.94 → 1.0) — no shimmer.
 * Scoped to editor only; never ships to public site.
 */

import { editorTokens } from './editor-tokens';
import { cn } from '@/lib/utils';

// ─── Shared skeleton shape ───
const sk = 'bg-muted/60 rounded-md animate-skeleton-pulse';
const skPill = 'bg-muted/60 rounded-full animate-skeleton-pulse';

// ─── Structure Panel Skeleton ───
interface StructureSkeletonProps {
  width?: number;
  visible?: boolean;
}

export function StructurePanelSkeleton({ width, visible = true }: StructureSkeletonProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(editorTokens.panel.structure, 'flex flex-col overflow-hidden'}
      style={{ width }}
    >
      {/* Header */}
      <div className={cn(editorTokens.panel.header, 'justify-between'}>
        <div className={cn(sk, 'h-4 w-24'} />
        <div className={cn(sk, 'h-5 w-5 rounded'} />
      </div>

      {/* Segmented control */}
      <div className="px-4 pt-4 pb-2">
        <div className={cn(editorTokens.segmented.container)}>
          {['w-14', 'w-12', 'w-16'].map((w, i) => (
            <div key={i} className={cn(skPill, 'h-7 flex-1'} />
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className={cn(skPill, 'h-9 w-full'} />
      </div>

      {/* Section rows */}
      <div className="px-2 space-y-1 flex-1">
        {[
          { indent: false, textW: 'w-[70%]' },
          { indent: false, textW: 'w-[60%]' },
          { indent: true, textW: 'w-[55%]' },
          { indent: true, textW: 'w-[65%]' },
          { indent: false, textW: 'w-[75%]' },
          { indent: false, textW: 'w-[50%]' },
          { indent: true, textW: 'w-[60%]' },
          { indent: false, textW: 'w-[68%]' },
        ].map((row, i) => (
          <div
            key={i}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', row.indent && 'pl-8'}
          >
            <div className={cn(skPill, 'h-5 w-5 flex-shrink-0'} />
            <div className={cn(sk, 'h-3.5', row.textW)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Canvas Panel Skeleton ───
export function CanvasPanelSkeleton() {
  return (
    <div className={cn(editorTokens.panel.canvas, 'flex flex-col'}>
      {/* Control strip */}
      <div className={editorTokens.canvas.controlStrip}>
        <div className="flex items-center gap-3">
          <div className={cn(sk, 'h-7 w-7 rounded-lg'} />
          <div className={cn(sk, 'h-4 w-28'} />
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(sk, 'h-7 w-20 rounded-lg'} />
          <div className={cn(sk, 'h-7 w-7 rounded-lg'} />
          <div className={cn(sk, 'h-7 w-7 rounded-lg'} />
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(skPill, 'h-8 w-20'} />
          <div className={cn(skPill, 'h-8 w-24'} />
        </div>
      </div>

      {/* Canvas surface with section card skeletons */}
      <div className={cn(editorTokens.canvas.surface, 'flex-1 p-6 overflow-auto scrollbar-thin'}>
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Hero card */}
          <div className="rounded-[20px] bg-card/80 border border-border/40 p-6 space-y-4" style={{ minHeight: 200 }}>
            <div className={cn(sk, 'h-6 w-[65%]'} />
            <div className={cn(sk, 'h-4 w-[45%]'} />
            <div className="pt-2">
              <div className={cn(skPill, 'h-10 w-32'} />
            </div>
          </div>

          {/* Text section card */}
          <div className="rounded-[20px] bg-card/80 border border-border/40 p-6 space-y-3" style={{ minHeight: 120 }}>
            <div className={cn(sk, 'h-4 w-[80%]'} />
            <div className={cn(sk, 'h-3.5 w-[90%]'} />
            <div className={cn(sk, 'h-3.5 w-[70%]'} />
            <div className={cn(sk, 'h-3.5 w-[55%]'} />
          </div>

          {/* Gallery card */}
          <div className="rounded-[20px] bg-card/80 border border-border/40 p-6" style={{ minHeight: 140 }}>
            <div className={cn(sk, 'h-4 w-[40%] mb-4'} />
            <div className="flex gap-3">
              <div className={cn(sk, 'h-24 flex-1 rounded-lg'} />
              <div className={cn(sk, 'h-24 flex-1 rounded-lg'} />
              <div className={cn(sk, 'h-24 flex-1 rounded-lg'} />
            </div>
          </div>

          {/* CTA card */}
          <div className="rounded-[20px] bg-card/80 border border-border/40 p-6 flex flex-col items-center gap-3" style={{ minHeight: 80 }}>
            <div className={cn(sk, 'h-5 w-[50%]'} />
            <div className={cn(skPill, 'h-9 w-28'} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inspector Panel Skeleton ───
interface InspectorSkeletonProps {
  width?: number;
  visible?: boolean;
}

export function InspectorPanelSkeleton({ width, visible = true }: InspectorSkeletonProps) {
  if (!visible) return null;

  const fieldGroup = (fields: number, hasToggle = false) => (
    <div className="space-y-4">
      {/* Group header */}
      <div className={cn(sk, 'h-3 w-[35%]'} />
      {/* Fields */}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className={cn(sk, 'h-3 w-[30%]'} />
          <div className={cn(skPill, 'h-10 w-full'} />
        </div>
      ))}
      {hasToggle && (
        <div className="flex items-center justify-between">
          <div className={cn(sk, 'h-3 w-[40%]'} />
          <div className={cn(skPill, 'h-6 w-11'} />
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(editorTokens.panel.inspector, 'flex flex-col overflow-hidden'}
      style={{ width }}
    >
      {/* Header */}
      <div className={cn(editorTokens.panel.header, 'justify-between'}>
        <div className="flex items-center gap-2">
          <div className={cn(sk, 'h-4 w-16'} />
          <div className={cn(sk, 'h-3 w-3 rounded'} />
          <div className={cn(sk, 'h-4 w-24'} />
        </div>
        <div className={cn(sk, 'h-5 w-5 rounded'} />
      </div>

      {/* Content */}
      <div className="p-5 space-y-8 flex-1">
        {fieldGroup(3, true)}
        {fieldGroup(2, false)}
        {fieldGroup(2, true)}
      </div>
    </div>
  );
}
