import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface OrgLoginPinPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  errorShake?: boolean;
}

/**
 * 4-digit PIN entry pad for the branded org login surface.
 * Visual language matches the dock/kiosk pads but tuned for laptop and tablet.
 */
export function OrgLoginPinPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  errorShake = false,
}: OrgLoginPinPadProps) {
  const handleDigit = (d: string) => {
    if (disabled) return;
    if (value.length >= 4) return;
    const next = value + d;
    onChange(next);
    if (next.length === 4) {
      // Auto-submit on 4th digit
      setTimeout(() => onSubmit(), 80);
    }
  };

  const handleDelete = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dot indicators */}
      <motion.div
        className="flex items-center gap-3"
        animate={errorShake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full border border-white/30 transition-all"
            style={{
              backgroundColor:
                value.length > i ? 'rgba(255,255,255,0.95)' : 'transparent',
              transform: value.length > i ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ))}
      </motion.div>

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <motion.button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.04 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            className="w-16 h-16 rounded-2xl text-2xl font-display tracking-wide bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {d}
          </motion.button>
        ))}

        <div className="w-16 h-16" />

        <motion.button
          type="button"
          onClick={() => handleDigit('0')}
          disabled={disabled}
          whileHover={{ scale: disabled ? 1 : 1.04 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          className="w-16 h-16 rounded-2xl text-2xl font-display tracking-wide bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          0
        </motion.button>

        <motion.button
          type="button"
          onClick={handleDelete}
          disabled={disabled || value.length === 0}
          whileHover={{ scale: disabled ? 1 : 1.04 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.10] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          aria-label="Delete digit"
        >
          <Delete className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
