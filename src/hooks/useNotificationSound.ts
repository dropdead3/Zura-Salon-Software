import { useCallback, useMemo, useRef } from 'react';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';

type SoundType = 'success' | 'error' | 'achievement' | 'chaching';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function playTone(ctx: AudioContext, freq: number, durationMs: number, type: OscillatorType, gainPeak = 0.06) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = ctx.currentTime;
  const dur = durationMs / 1000;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur);
}

/** Layered cash-register "ka-ching" using noise burst + metallic bell tones */
function playChaChingSound(ctx: AudioContext) {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  // --- Layer 1: Metallic bell strike (high sine with fast decay) ---
  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.type = 'sine';
  bell.frequency.setValueAtTime(3200, now);
  bell.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.exponentialRampToValueAtTime(0.07, now + 0.005);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  bell.connect(bellGain);
  bellGain.connect(ctx.destination);
  bell.start(now);
  bell.stop(now + 0.25);

  // --- Layer 2: Second harmonic for richness ---
  const bell2 = ctx.createOscillator();
  const bell2Gain = ctx.createGain();
  bell2.type = 'sine';
  bell2.frequency.setValueAtTime(4800, now);
  bell2.frequency.exponentialRampToValueAtTime(3600, now + 0.12);
  bell2Gain.gain.setValueAtTime(0.0001, now);
  bell2Gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
  bell2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  bell2.connect(bell2Gain);
  bell2Gain.connect(ctx.destination);
  bell2.start(now);
  bell2.stop(now + 0.18);

  // --- Layer 3: Coin rattle shimmer (filtered noise burst) ---
  const bufferSize = ctx.sampleRate * 0.12;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 6000;
  noiseFilter.Q.value = 2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.04, now + 0.035);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now + 0.02);

  // --- Layer 4: Cheerful rising chime (delayed) ---
  setTimeout(() => {
    const t = ctx.currentTime;
    const chime1 = ctx.createOscillator();
    const chime1Gain = ctx.createGain();
    chime1.type = 'sine';
    chime1.frequency.value = 1318.5; // E6
    chime1Gain.gain.setValueAtTime(0.0001, t);
    chime1Gain.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
    chime1Gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    chime1.connect(chime1Gain);
    chime1Gain.connect(ctx.destination);
    chime1.start(t);
    chime1.stop(t + 0.15);

    const chime2 = ctx.createOscillator();
    const chime2Gain = ctx.createGain();
    chime2.type = 'sine';
    chime2.frequency.value = 1760; // A6
    chime2Gain.gain.setValueAtTime(0.0001, t + 0.06);
    chime2Gain.gain.exponentialRampToValueAtTime(0.035, t + 0.07);
    chime2Gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    chime2.connect(chime2Gain);
    chime2Gain.connect(ctx.destination);
    chime2.start(t + 0.06);
    chime2.stop(t + 0.22);
  }, 120);
}

export function useNotificationSound() {
  const { enabled } = useSoundSettings();
  const ctxRef = useRef<AudioContext | null>(null);

  const canPlay = useMemo(() => enabled && !prefersReducedMotion(), [enabled]);

  const ensureContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (ctxRef.current) return ctxRef.current;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    ctxRef.current = new Ctx();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      if (!canPlay) return;
      const ctx = ensureContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      if (type === 'chaching') {
        playChaChingSound(ctx);
        return;
      }

      if (type === 'success') {
        playTone(ctx, 523.25, 90, 'sine', 0.05);
        setTimeout(() => playTone(ctx, 659.25, 110, 'sine', 0.045), 70);
        return;
      }

      if (type === 'achievement') {
        playTone(ctx, 440, 120, 'triangle', 0.055);
        setTimeout(() => playTone(ctx, 659.25, 140, 'triangle', 0.05), 90);
        setTimeout(() => playTone(ctx, 880, 160, 'triangle', 0.045), 160);
        return;
      }

      // error
      playTone(ctx, 196, 140, 'sine', 0.055);
      setTimeout(() => playTone(ctx, 155.56, 170, 'sine', 0.05), 90);
    },
    [canPlay, ensureContext]
  );

  return {
    playSuccess: () => play('success'),
    playError: () => play('error'),
    playAchievement: () => play('achievement'),
    playChaChing: () => play('chaching'),
    enabled: canPlay,
  };
}

