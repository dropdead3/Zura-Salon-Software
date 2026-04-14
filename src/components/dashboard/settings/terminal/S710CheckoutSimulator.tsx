import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CreditCard, Check, Wifi, Signal, Battery, ChevronRight } from 'lucide-react';

// S710 screen: 1080x1920 @ 420dpi — we simulate at ~270x480 (25% scale)
const SCREEN_W = 270;
const SCREEN_H = 480;

type ScreenState = 'splash' | 'idle' | 'cart' | 'tip' | 'tap' | 'processing' | 'success';

export interface SimCartItem {
  label: string;
  amount: number;
}

interface S710SimulatorProps {
  businessName?: string;
  cartItems?: SimCartItem[];
  autoPlay?: boolean;
  className?: string;
  onScreenChange?: (index: number, total: number) => void;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] text-white/60 font-mono select-none">
      <span>12:34</span>
      <div className="flex items-center gap-1">
        <Wifi className="w-2.5 h-2.5" />
        <Signal className="w-2.5 h-2.5" />
        <Battery className="w-2.5 h-2.5" />
      </div>
    </div>
  );
}

function SplashScreen({ businessName }: { businessName: string }) {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full relative"
    >
      <div className="absolute inset-0 bg-gradient-radial from-emerald-500/8 via-transparent to-transparent" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h1 className="text-white text-lg font-medium tracking-[0.12em] uppercase">ZURA PAY</h1>
        <p className="text-white/40 text-[9px] tracking-[0.2em] uppercase mt-1">Powered by Intelligence</p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/30 text-[8px] tracking-wider uppercase mt-8"
      >
        {businessName}
      </motion.p>
    </motion.div>
  );
}

function IdleScreen({ businessName }: { businessName: string }) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col items-center justify-center h-full px-6"
    >
      <div className="text-center">
        <p className="text-white/40 text-[9px] tracking-[0.15em] uppercase mb-3">Welcome to</p>
        <h2 className="text-white text-base font-medium tracking-wide mb-1">{businessName}</h2>
        <div className="w-8 h-px bg-emerald-500/40 mx-auto my-4" />
        <p className="text-white/30 text-[8px] tracking-wider">ZURA PAY · READY</p>
      </div>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-20 w-20 h-20 rounded-full border border-emerald-500/20"
      />
    </motion.div>
  );
}

function CartScreen({ items, total }: { items: SimCartItem[]; total: number }) {
  return (
    <motion.div
      key="cart"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full px-5 pt-4"
    >
      <p className="text-white/40 text-[8px] tracking-[0.15em] uppercase mb-3">Order Summary</p>
      <div className="flex-1 space-y-2.5 overflow-auto">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between py-2 border-b border-white/[0.06]"
          >
            <span className="text-white/80 text-[10px]">{item.label}</span>
            <span className="text-white text-[10px] font-mono">{fmt(item.amount)}</span>
          </motion.div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-3 pb-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-[9px] tracking-wider uppercase">Total</span>
          <span className="text-white text-sm font-medium font-mono">{fmt(total)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function TipScreen({ total, tipPercentages = [20, 25, 30] }: { total: number; tipPercentages?: number[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setSelected(1), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      key="tip"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full px-5 pt-4"
    >
      <p className="text-white/40 text-[8px] tracking-[0.15em] uppercase mb-2">Add a Tip</p>
      <div className="text-center mb-4">
        <p className="text-white/50 text-[9px] tracking-wider uppercase">Subtotal</p>
        <p className="text-white text-base font-medium font-mono mt-0.5">{fmt(total)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {tipPercentages.map((pct, i) => {
          const tipAmount = Math.round(total * pct / 100);
          const isSelected = selected === i;
          return (
            <motion.button
              key={pct}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(i)}
              className={cn(
                'rounded-xl py-3 flex flex-col items-center gap-0.5 transition-all border',
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]'
              )}
            >
              <span className={cn('text-[12px] font-medium', isSelected ? 'text-emerald-400' : 'text-white/80')}>{pct}%</span>
              <span className="text-[9px] text-white/40 font-mono">{fmt(tipAmount)}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="space-y-2 mt-auto pb-4">
        <button className="w-full rounded-xl py-2.5 bg-white/[0.04] border border-white/[0.08] text-white/60 text-[10px] tracking-wider uppercase hover:bg-white/[0.06] transition-colors">Custom Amount</button>
        <button className="w-full rounded-xl py-2 text-white/30 text-[9px] tracking-wider uppercase hover:text-white/50 transition-colors">No Tip</button>
      </div>
    </motion.div>
  );
}

function TapScreen({ total }: { total: number }) {
  return (
    <motion.div
      key="tap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full px-6"
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full border-2 border-emerald-500/40 flex items-center justify-center mb-6"
      >
        <CreditCard className="w-8 h-8 text-emerald-400" />
      </motion.div>
      <p className="text-white text-sm font-medium mb-1">{fmt(total)}</p>
      <p className="text-white/50 text-[10px] tracking-wider">Tap, insert, or swipe</p>
      <div className="mt-6 flex flex-col items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            className="rounded-full border border-emerald-500/30"
            style={{ width: 20 + i * 12, height: 10 + i * 6 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ProcessingScreen() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-500 mb-5"
      />
      <p className="text-white/60 text-[10px] tracking-[0.15em] uppercase">Processing</p>
    </motion.div>
  );
}

function SuccessScreen({ total }: { total: number }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/40"
      >
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-white text-sm font-medium mb-1">Approved</p>
        <p className="text-white/50 text-[10px] font-mono">{fmt(total)}</p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/30 text-[8px] tracking-wider uppercase mt-6"
      >
        Thank you
      </motion.p>
    </motion.div>
  );
}

const SCREEN_LABELS: Record<ScreenState, string> = {
  splash: 'Splash',
  idle: 'Idle',
  cart: 'Cart',
  tip: 'Tip',
  tap: 'Tap',
  processing: 'Processing',
  success: 'Success',
};

const SCREEN_DURATIONS: Record<ScreenState, number> = {
  splash: 2500,
  idle: 2000,
  cart: 3000,
  tip: 3000,
  tap: 2500,
  processing: 1800,
  success: 2500,
};

export function S710CheckoutSimulator({
  businessName = 'Your Salon',
  cartItems = [
    { label: 'Balayage Color Service', amount: 18500 },
    { label: 'Olaplex Treatment', amount: 4500 },
    { label: 'Blowout & Style', amount: 6500 },
  ],
  autoPlay = false,
  className,
  onScreenChange,
}: S710SimulatorProps) {
  const total = cartItems.reduce((s, i) => s + i.amount, 0);
  const screens: ScreenState[] = ['splash', 'idle', 'cart', 'tip', 'tap', 'processing', 'success'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const screen = screens[currentIndex];
  const [progress, setProgress] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
    setProgress(0);
  }, [screens.length]);

  // Notify parent of screen changes
  useEffect(() => {
    onScreenChange?.(currentIndex, screens.length);
  }, [currentIndex, screens.length, onScreenChange]);

  // Auto-play mode with progress tracking
  useEffect(() => {
    if (!autoPlay) return;
    const duration = SCREEN_DURATIONS[screen];
    const interval = 50;
    let elapsed = 0;

    const tick = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(elapsed / duration, 1));
    }, interval);

    const timer = setTimeout(advance, duration);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [autoPlay, screen, advance]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* S710 device frame */}
      <div
        className="relative rounded-[28px] bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1e] p-[6px] shadow-2xl shadow-black/50"
        style={{ width: SCREEN_W + 12, height: SCREEN_H + 12 }}
      >
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

        <div
          className="relative rounded-[22px] overflow-hidden bg-[#0a0a0c]"
          style={{ width: SCREEN_W, height: SCREEN_H }}
        >
          <StatusBar />
          <div className="absolute inset-0 pt-6">
            <AnimatePresence mode="wait">
              {screen === 'splash' && <SplashScreen businessName={businessName} />}
              {screen === 'idle' && <IdleScreen businessName={businessName} />}
              {screen === 'cart' && <CartScreen items={cartItems} total={total} />}
              {screen === 'tip' && <TipScreen total={total} />}
              {screen === 'tap' && <TapScreen total={total} />}
              {screen === 'processing' && <ProcessingScreen />}
              {screen === 'success' && <SuccessScreen total={total} />}
            </AnimatePresence>
          </div>

          {/* Auto-play progress bar at bottom of screen */}
          {autoPlay && (
            <div className="absolute bottom-4 inset-x-4 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500/50 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-2">
            <span className="text-white/15 text-[7px] tracking-[0.2em] uppercase">Zura Pay</span>
          </div>
        </div>

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/[0.06]" />
      </div>

      {/* Stage dots */}
      <div className="flex items-center gap-1.5 mt-3">
        {screens.map((s, i) => (
          <button
            key={s}
            onClick={() => { setCurrentIndex(i); setProgress(0); }}
            title={SCREEN_LABELS[s]}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all duration-300',
              i === currentIndex
                ? 'bg-emerald-500 w-4'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
          />
        ))}
      </div>

      {/* Stage label */}
      <p className="text-[9px] text-muted-foreground/60 font-mono mt-1.5 tracking-wider uppercase">
        {SCREEN_LABELS[screen]}
      </p>

      {/* Manual controls */}
      {!autoPlay && (
        <button
          onClick={advance}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
        >
          <span className="uppercase tracking-wider text-[10px]">
            {screen === 'success' ? 'Restart' : 'Next'}
          </span>
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
