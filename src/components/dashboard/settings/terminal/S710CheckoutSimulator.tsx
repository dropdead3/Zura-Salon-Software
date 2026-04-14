import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CreditCard, Check, Wifi, Signal, Battery, ChevronRight } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { PLATFORM_NAME } from '@/lib/brand';
import type { ColorTheme } from '@/hooks/useColorTheme';
import { getTerminalPalette } from '@/lib/terminal-splash-palettes';

// S710 screen: 1080x1920 @ 420dpi — we simulate at ~270x480 (25% scale)
const SCREEN_W = 270;
const SCREEN_H = 480;

type ScreenState = 'splash' | 'cart' | 'tip' | 'tap' | 'processing' | 'success';

export interface SimCartItem {
  label: string;
  amount: number;
}

interface S710SimulatorProps {
  businessName?: string;
  cartItems?: SimCartItem[];
  autoPlay?: boolean;
  className?: string;
  orgLogoUrl?: string | null;
  splashImageUrl?: string | null;
  tipPercentages?: number[];
  tipEnabled?: boolean;
  receiptSlogan?: string;
  colorTheme?: ColorTheme;
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

function SplashScreen({ businessName, orgLogoUrl, splashImageUrl, colorTheme = 'cream' }: { businessName: string; orgLogoUrl?: string | null; splashImageUrl?: string | null; colorTheme?: ColorTheme }) {
  const p = getTerminalPalette(colorTheme);

  // If an actual splash image has been uploaded, show it full-bleed
  if (splashImageUrl) {
    return (
      <motion.div
        key="splash-image"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
      >
        <img
          src={splashImageUrl}
          alt="Splash screen"
          className="w-full h-full object-cover"
        />
      </motion.div>
    );
  }

  // Default: match the canvas-generated design (solid black, corner glows, centered brand)
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#000000' }}
    >
      {/* Corner radial glows matching canvas generator */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at 5% 5%, ${p.accentRgba(0.18)}, transparent 50%), radial-gradient(circle at 95% 95%, ${p.accentRgba(0.18)}, transparent 50%)`,
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        {orgLogoUrl ? (
          <img src={orgLogoUrl} alt={businessName} className="max-h-14 max-w-[60%] object-contain mb-5" />
        ) : (
          <motion.h1
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-xl font-display tracking-[0.14em] uppercase mb-2"
          >
            POINT OF SALE
          </motion.h1>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.4 }}
          className="text-white text-[8px] tracking-[0.25em] uppercase"
        >
          Powered by Intelligence
        </motion.p>

        {/* Accent divider */}
        <div className="w-8 h-px mt-5 mb-4" style={{ background: p.accentColor }} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 0.6 }}
          className="text-white text-[9px] tracking-[0.15em] uppercase font-display"
        >
          {businessName}
        </motion.p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-1.5" style={{ color: p.accentRgba(0.5) }}>
        <ZuraZIcon className="w-2.5 h-2.5" />
        <span className="text-[7px] tracking-[0.2em] uppercase font-display">
          Powered by Zura
          Powered by Zura
        </span>
      </div>
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

function TipScreen({ total, tipPercentages = [20, 25, 30], colorTheme = 'cream' }: { total: number; tipPercentages?: number[]; colorTheme?: ColorTheme }) {
  const p = getTerminalPalette(colorTheme);
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
      <div className="text-center mb-2">
        <p className="text-white/50 text-[9px] tracking-wider uppercase">Subtotal</p>
        <p className="text-white text-base font-medium font-mono mt-0.5">{fmt(total)}</p>
      </div>
      <div className="text-center mb-4">
        <p className="text-white/40 text-[9px] tracking-[0.15em] uppercase">Add a Tip</p>
        <p className="text-white/25 text-[7px] mt-0.5">In addition to the subtotal above</p>
      </div>
      <div className="flex flex-col gap-2 mb-3">
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
                'rounded-xl py-3 px-4 flex flex-row items-center justify-between transition-all border',
                isSelected
                  ? 'border-white/30'
                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]'
              )}
              style={isSelected ? {
                background: p.accentRgba(0.2),
                borderColor: p.accentRgba(0.5),
              } : undefined}
            >
              <span
                className={cn('text-[12px] font-medium', !isSelected && 'text-white/80')}
                style={isSelected ? { color: p.accentColor } : undefined}
              >
                {pct}%
              </span>
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

function TapScreen({ total }: { total: number; colorTheme?: ColorTheme }) {
  // This screen mirrors the real S710 firmware UI (white bg, blue concentric rings).
  // Stripe controls this screen entirely — it is NOT customizable via the API.
  return (
    <motion.div
      key="tap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#FFFFFF' }}
    >
      {/* Concentric blue rings matching real S710 firmware */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-5">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.08, 1], opacity: [0.15 + i * 0.08, 0.35 + i * 0.05, 0.15 + i * 0.08] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            className="absolute rounded-full"
            style={{
              width: 110 - i * 22,
              height: 110 - i * 22,
              border: `2px solid rgba(76, 111, 255, ${0.2 + i * 0.1})`,
            }}
          />
        ))}
        <CreditCard className="w-7 h-7 text-[#4C6FFF]" />
      </div>
      <p className="text-[#1a1a2e] text-sm font-medium mb-0.5">{fmt(total)}</p>
      <p className="text-[#6b7280] text-[10px] tracking-wider">Tap, insert, or swipe</p>

      {/* Firmware badge */}
      <div className="absolute bottom-8 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f4f6] border border-[#e5e7eb]">
        <span className="text-[7px] text-[#9ca3af] tracking-wider uppercase">Not Brandable</span>
      </div>
    </motion.div>
  );
}

function ProcessingScreen() {
  // Processing screen is also firmware-controlled on the real reader
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#FFFFFF' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-2 border-[#e5e7eb] mb-5"
        style={{ borderTopColor: '#4C6FFF' }}
      />
      <p className="text-[#6b7280] text-[10px] tracking-[0.15em] uppercase">Processing</p>
      <div className="absolute bottom-8 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f4f6] border border-[#e5e7eb]">
        <span className="text-[7px] text-[#9ca3af] tracking-wider uppercase">Not Brandable</span>
      </div>
    </motion.div>
  );
}

function SuccessScreen({ total, receiptSlogan }: { total: number; receiptSlogan?: string; colorTheme?: ColorTheme }) {
  // Success screen is firmware-controlled on the real reader
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#FFFFFF' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: '#22c55e' }}
      >
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-[#1a1a2e] text-sm font-medium mb-1">Approved</p>
        <p className="text-[#6b7280] text-[10px] font-mono">{fmt(total)}</p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-[#9ca3af] text-[8px] tracking-wider uppercase mt-6"
      >
        {receiptSlogan || 'Thank you'}
      </motion.p>
      <div className="absolute bottom-8 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f4f6] border border-[#e5e7eb]">
        <span className="text-[7px] text-[#9ca3af] tracking-wider uppercase">Not Brandable</span>
      </div>
    </motion.div>
  );
}

const SCREEN_LABELS: Record<ScreenState, string> = {
  splash: 'Splash',
  cart: 'Cart',
  tip: 'Tip',
  tap: 'Tap',
  processing: 'Processing',
  success: 'Success',
};

const SCREEN_DURATIONS: Record<ScreenState, number> = {
  splash: 3500,
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
  orgLogoUrl,
  splashImageUrl,
  tipPercentages = [20, 25, 30],
  tipEnabled = true,
  receiptSlogan,
  colorTheme = 'cream',
  onScreenChange,
}: S710SimulatorProps) {
  const p = useMemo(() => getTerminalPalette(colorTheme), [colorTheme]);
  const total = cartItems.reduce((s, i) => s + i.amount, 0);
  const screens: ScreenState[] = [
    'splash', 'cart',
    ...(tipEnabled ? ['tip' as ScreenState] : []),
    'tap', 'processing', 'success',
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const screen = screens[currentIndex];
  const [progress, setProgress] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
    setProgress(0);
  }, [screens.length]);

  useEffect(() => {
    onScreenChange?.(currentIndex, screens.length);
  }, [currentIndex, screens.length, onScreenChange]);

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

  // Themed background gradient for the screen
  const screenBg = useMemo(() => {
    return `linear-gradient(180deg, ${p.gradientStops[0]}, ${p.gradientStops[1]} 50%, ${p.gradientStops[2]})`;
  }, [p]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* S710 device frame */}
      <div
        className="relative rounded-[28px] bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1e] p-[6px] shadow-2xl shadow-black/50"
        style={{ width: SCREEN_W + 12, height: SCREEN_H + 12 }}
      >
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

        <div
          className="relative rounded-[22px] overflow-hidden"
          style={{ width: SCREEN_W, height: SCREEN_H, background: screenBg }}
        >
          <StatusBar />
          <div className="absolute inset-0 pt-6">
            <AnimatePresence mode="wait">
              {screen === 'splash' && <SplashScreen businessName={businessName} orgLogoUrl={orgLogoUrl} splashImageUrl={splashImageUrl} colorTheme={colorTheme} />}
              
              {screen === 'cart' && <CartScreen items={cartItems} total={total} />}
              {screen === 'tip' && <TipScreen total={total} tipPercentages={tipPercentages} colorTheme={colorTheme} />}
              {screen === 'tap' && <TapScreen total={total} />}
              {screen === 'processing' && <ProcessingScreen />}
              {screen === 'success' && <SuccessScreen total={total} receiptSlogan={receiptSlogan} />}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1.5 pb-2">
            <ZuraZIcon className="w-2 h-2 text-white/20" />
            <span className="text-white/20 text-[7px] tracking-[0.2em] uppercase">Powered by {PLATFORM_NAME}</span>
          </div>
        </div>

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/[0.06]" />
      </div>

      {/* Auto-play progress bar */}
      {autoPlay && (
        <div className="w-full mt-3 h-[2px] rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: p.accentColor, opacity: 0.6 }}
          />
        </div>
      )}

      {/* Stage dots */}
      <div className="flex items-center gap-1.5 mt-3">
        {screens.map((s, i) => (
          <button
            key={s}
            onClick={() => { setCurrentIndex(i); setProgress(0); }}
            title={SCREEN_LABELS[s]}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all duration-300',
              i !== currentIndex && 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            style={i === currentIndex ? { background: p.accentColor, width: 16 } : undefined}
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
