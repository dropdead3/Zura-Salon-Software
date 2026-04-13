import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CreditCard, Check, Wifi, Signal, Battery, ChevronRight } from 'lucide-react';

// S710 screen: 1080x1920 @ 420dpi — we simulate at ~270x480 (25% scale)
const SCREEN_W = 270;
const SCREEN_H = 480;

type ScreenState = 'splash' | 'idle' | 'cart' | 'tap' | 'processing' | 'success';

interface CartItem {
  label: string;
  amount: number;
}

interface S710SimulatorProps {
  /** Organization/salon name shown on splash */
  businessName?: string;
  /** Demo cart items */
  cartItems?: CartItem[];
  /** Auto-play the full flow */
  autoPlay?: boolean;
  className?: string;
}

// ---- Utility: format cents to dollars ----
function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---- Status Bar (top of device) ----
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

// ---- Splash Screen: Zura Pay branding ----
function SplashScreen({ businessName }: { businessName: string }) {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full relative"
    >
      {/* Radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-emerald-500/8 via-transparent to-transparent" />

      {/* Logo mark */}
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
        <h1 className="text-white text-lg font-medium tracking-[0.12em] uppercase">
          ZURA PAY
        </h1>
        <p className="text-white/40 text-[9px] tracking-[0.2em] uppercase mt-1">
          Powered by Intelligence
        </p>
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

// ---- Idle Screen: Ready for next client ----
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
        <p className="text-white/40 text-[9px] tracking-[0.15em] uppercase mb-3">
          Welcome to
        </p>
        <h2 className="text-white text-base font-medium tracking-wide mb-1">
          {businessName}
        </h2>
        <div className="w-8 h-px bg-emerald-500/40 mx-auto my-4" />
        <p className="text-white/30 text-[8px] tracking-wider">
          ZURA PAY · READY
        </p>
      </div>

      {/* Breathing pulse ring */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-20 w-20 h-20 rounded-full border border-emerald-500/20"
      />
    </motion.div>
  );
}

// ---- Cart Screen: Line items ----
function CartScreen({ items, total }: { items: CartItem[]; total: number }) {
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

      {/* Total */}
      <div className="border-t border-white/10 pt-3 pb-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-[9px] tracking-wider uppercase">Total</span>
          <span className="text-white text-sm font-medium font-mono">{fmt(total)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Tap / Insert Card Screen ----
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

      {/* Animated contactless waves */}
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

// ---- Processing Screen ----
function ProcessingScreen() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full"
    >
      {/* Spinning ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-500 mb-5"
      />
      <p className="text-white/60 text-[10px] tracking-[0.15em] uppercase">Processing</p>
    </motion.div>
  );
}

// ---- Success Screen ----
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

// ---- Device Frame ----
export function S710CheckoutSimulator({
  businessName = 'Your Salon',
  cartItems = [
    { label: 'Balayage Color Service', amount: 18500 },
    { label: 'Olaplex Treatment', amount: 4500 },
    { label: 'Blowout & Style', amount: 6500 },
  ],
  autoPlay = false,
  className,
}: S710SimulatorProps) {
  const total = cartItems.reduce((s, i) => s + i.amount, 0);

  const screens: ScreenState[] = ['splash', 'idle', 'cart', 'tap', 'processing', 'success'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const screen = screens[currentIndex];

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
  }, [screens.length]);

  // Auto-play mode
  useEffect(() => {
    if (!autoPlay) return;
    const durations: Record<ScreenState, number> = {
      splash: 2500,
      idle: 2000,
      cart: 3000,
      tap: 2500,
      processing: 1800,
      success: 2500,
    };
    const timer = setTimeout(advance, durations[screen]);
    return () => clearTimeout(timer);
  }, [autoPlay, screen, advance]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* S710 device frame */}
      <div
        className="relative rounded-[28px] bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1e] p-[6px] shadow-2xl shadow-black/50"
        style={{ width: SCREEN_W + 12, height: SCREEN_H + 12 }}
      >
        {/* Bezel gloss */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

        {/* Screen */}
        <div
          className="relative rounded-[22px] overflow-hidden bg-[#0a0a0c]"
          style={{ width: SCREEN_W, height: SCREEN_H }}
        >
          <StatusBar />

          {/* Content area */}
          <div className="absolute inset-0 pt-6">
            <AnimatePresence mode="wait">
              {screen === 'splash' && <SplashScreen businessName={businessName} />}
              {screen === 'idle' && <IdleScreen businessName={businessName} />}
              {screen === 'cart' && <CartScreen items={cartItems} total={total} />}
              {screen === 'tap' && <TapScreen total={total} />}
              {screen === 'processing' && <ProcessingScreen />}
              {screen === 'success' && <SuccessScreen total={total} />}
            </AnimatePresence>
          </div>

          {/* Bottom brand bar */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-2">
            <span className="text-white/15 text-[7px] tracking-[0.2em] uppercase">Zura Pay</span>
          </div>
        </div>

        {/* Chin indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/[0.06]" />
      </div>

      {/* Stage controls */}
      {!autoPlay && (
        <button
          onClick={advance}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
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
