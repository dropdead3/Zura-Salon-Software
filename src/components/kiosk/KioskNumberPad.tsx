import { motion } from 'framer-motion';
import { Delete, MoveRight } from 'lucide-react';

interface KioskNumberPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  accentColor?: string;
  textColor?: string;
}

export function KioskNumberPad({
  value,
  onChange,
  onSubmit,
  maxLength = 10,
  accentColor = '#8B5CF6',
  textColor = '#FFFFFF',
}: KioskNumberPadProps) {
  const handleDigit = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const isReady = value.length >= 4;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Number pad grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit, index) => (
          <motion.button
            key={digit}
            className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl text-3xl md:text-4xl font-medium backdrop-blur-md transition-all"
            style={{
              backgroundColor: `${textColor}08`,
              border: `1px solid ${textColor}15`,
              color: textColor,
            }}
            onClick={() => handleDigit(digit)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            whileHover={{ 
              backgroundColor: `${textColor}15`,
              scale: 1.05,
            }}
            whileTap={{ 
              scale: 0.95,
              backgroundColor: `${accentColor}20`,
            }}
            type="button"
          >
            {digit}
          </motion.button>
        ))}

        {/* Bottom row: Clear, 0, Delete */}
        <motion.button
          className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl text-lg font-medium backdrop-blur-md transition-all"
          style={{
            backgroundColor: `${textColor}05`,
            border: `1px solid ${textColor}10`,
            color: `${textColor}80`,
          }}
          onClick={handleClear}
          whileHover={{ backgroundColor: `${textColor}12` }}
          whileTap={{ scale: 0.95 }}
          type="button"
        >
          Clear
        </motion.button>

        <motion.button
          className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl text-3xl md:text-4xl font-medium backdrop-blur-md transition-all"
          style={{
            backgroundColor: `${textColor}08`,
            border: `1px solid ${textColor}15`,
            color: textColor,
          }}
          onClick={() => handleDigit('0')}
          whileHover={{ 
            backgroundColor: `${textColor}15`,
            scale: 1.05,
          }}
          whileTap={{ 
            scale: 0.95,
            backgroundColor: `${accentColor}20`,
          }}
          type="button"
        >
          0
        </motion.button>

        <motion.button
          className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl backdrop-blur-md transition-all"
          style={{
            backgroundColor: `${textColor}05`,
            border: `1px solid ${textColor}10`,
            color: `${textColor}80`,
          }}
          onClick={handleDelete}
          whileHover={{ backgroundColor: `${textColor}12` }}
          whileTap={{ scale: 0.95 }}
          type="button"
        >
          <Delete className="w-7 h-7" />
        </motion.button>
      </div>

      {/* Submit button - Glass style */}
      <motion.button
        className="flex items-center justify-center gap-4 w-full max-w-xs py-6 px-10 rounded-2xl text-xl font-medium transition-all backdrop-blur-md"
        style={{
          backgroundColor: isReady ? `${accentColor}15` : `${textColor}08`,
          border: isReady ? `1.5px solid ${accentColor}40` : `1px solid ${textColor}15`,
          color: isReady ? textColor : `${textColor}40`,
          cursor: isReady ? 'pointer' : 'not-allowed',
        }}
        onClick={onSubmit}
        disabled={!isReady}
        whileHover={isReady ? { 
          scale: 1.02, 
          y: -2,
          backgroundColor: `${accentColor}25`,
        } : {}}
        whileTap={isReady ? { scale: 0.98 } : {}}
        type="button"
      >
        <span>Check In</span>
        <motion.div
          animate={isReady ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <MoveRight className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
