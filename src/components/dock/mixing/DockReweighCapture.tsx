/**
 * DockReweighCapture — Scale-driven reweigh view.
 * Automatically captures leftover weight when bowl is placed on scale and reading stabilizes.
 * Falls back to manual numpad entry if scale is disconnected.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Scale, Check, Keyboard } from 'lucide-react';
import { useDockScale } from '@/hooks/dock/useDockScale';
import { useDockDispensingVisual } from '@/hooks/dock/useDockDispensingVisual';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { TeardropFill } from './TeardropFill';
import { ProgressBarFill } from './ProgressBarFill';
import { DockWeightInput } from './DockWeightInput';
import { roundWeight } from '@/lib/color-bar/mix-calculations';
import { cn } from '@/lib/utils';

interface DockReweighCaptureProps {
  bowlNumber: number;
  totalDispensed: number;
  onSubmit: (weight: number) => void;
  onCancel: () => void;
}

const AUTO_CONFIRM_MS = 1500;
const WEIGHT_CHANGE_THRESHOLD = 0.5; // grams — cancel countdown if weight drifts more

export function DockReweighCapture({
  bowlNumber,
  totalDispensed,
  onSubmit,
  onCancel,
}: DockReweighCaptureProps) {
  const scale = useDockScale();
  const { visual } = useDockDispensingVisual();
  const { isDemoMode } = useDockDemo();
  const [showManual, setShowManual] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableWeightRef = useRef<number>(0);
  const hasSubmittedRef = useRef(false);

  // Tare on mount + start demo simulation if in demo mode
  useEffect(() => {
    scale.tare();
    if (isDemoMode) {
      // Simulate a leftover weight ramping to ~15g
      scale.startDemoSimulation(15);
      return () => scale.stopDemoSimulation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-confirm logic: stable + weight > 0 → countdown → submit
  useEffect(() => {
    if (hasSubmittedRef.current) return;

    if (scale.isStable && scale.liveWeight > 0) {
      // Start countdown if not already running, or reset if weight changed significantly
      const drift = Math.abs(scale.liveWeight - stableWeightRef.current);
      if (drift > WEIGHT_CHANGE_THRESHOLD || countdownRef.current === null) {
        // Clear existing
        if (countdownRef.current) clearTimeout(countdownRef.current);
        stableWeightRef.current = scale.liveWeight;
        setCountdown(AUTO_CONFIRM_MS);

        countdownRef.current = setTimeout(() => {
          if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            navigator.vibrate?.(15);
            onSubmit(scale.liveWeight);
          }
        }, AUTO_CONFIRM_MS);
      }
    } else {
      // Not stable or zero — cancel countdown
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(null);
    }

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [scale.isStable, scale.liveWeight, onSubmit]);

  const handleManualConfirm = useCallback(() => {
    if (scale.liveWeight > 0 && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      navigator.vibrate?.(15);
      onSubmit(scale.liveWeight);
    }
  }, [scale.liveWeight, onSubmit]);

  // Manual numpad fallback
  if (showManual) {
    return (
      <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
        <div className="flex-shrink-0 px-7 pt-6 pb-2">
          <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            Bowl {bowlNumber} — Reweigh
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)] mt-0.5">
            Enter leftover weight manually
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <DockWeightInput
            onSubmit={onSubmit}
            onCancel={() => setShowManual(false)}
            label="Leftover Weight"
          />
        </div>
      </div>
    );
  }

  // Visual fill — use totalDispensed as the visual max so the fill is proportional
  const visualMax = totalDispensed > 0 ? totalDispensed : 100;
  const fillPercent = scale.liveWeight / visualMax;
  const isAutoConfirming = countdown !== null;

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
      {/* Header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-2">
        <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
          Bowl {bowlNumber} — Reweigh
        </p>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)] mt-0.5">
          Place bowl on scale — weight will capture automatically
        </p>
      </div>

      {/* Visual + live weight */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-7">
        {/* Fill visual */}
        <div className="relative">
          {visual === 'teardrop' ? (
            <TeardropFill
              fillPercent={fillPercent}
              fillColor="hsl(45 93% 47%)"
              size={200}
            />
          ) : (
            <ProgressBarFill
              fillPercent={fillPercent}
              fillColor="hsl(45 93% 47%)"
              size={140}
            />
          )}
        </div>

        {/* Live weight readout */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'font-display text-5xl tracking-tight transition-colors',
            scale.liveWeight > 0
              ? 'text-[hsl(var(--platform-foreground))]'
              : 'text-[hsl(var(--platform-foreground-muted)/0.3)]'
          )}>
            {roundWeight(scale.liveWeight)}
          </span>
          <span className="text-lg text-[hsl(var(--platform-foreground-muted)/0.5)]">g</span>
        </div>

        {/* Stability indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full transition-colors',
            scale.isStable && scale.liveWeight > 0
              ? 'bg-emerald-500'
              : scale.liveWeight > 0
                ? 'bg-amber-500 animate-pulse'
                : 'bg-[hsl(var(--platform-foreground-muted)/0.2)]'
          )} />
          <span className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)]">
            {scale.liveWeight === 0
              ? 'Waiting for bowl…'
              : scale.isStable
                ? isAutoConfirming
                  ? 'Stable — capturing…'
                  : 'Stable'
                : 'Stabilizing…'}
          </span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.2)] space-y-2">
        <button
          onClick={handleManualConfirm}
          disabled={scale.liveWeight <= 0}
          className={cn(
            'w-full h-12 rounded-xl text-white font-medium text-sm transition-all flex items-center justify-center gap-2',
            isAutoConfirming
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-amber-600 hover:bg-amber-500',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Check className="w-4 h-4" />
          {isAutoConfirming ? 'Capturing…' : 'Confirm Weight'}
        </button>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] text-xs font-medium transition-colors hover:bg-[hsl(var(--platform-bg-card))]"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="flex-1 h-10 rounded-xl border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] text-xs font-medium transition-colors hover:bg-[hsl(var(--platform-bg-card))] flex items-center justify-center gap-1.5"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Enter Manually
          </button>
        </div>
      </div>
    </div>
  );
}
