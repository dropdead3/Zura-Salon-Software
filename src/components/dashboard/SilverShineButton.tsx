import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import '@/styles/silver-shine.css';

interface SilverShineButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SilverShineButton({ children, className, onClick }: SilverShineButtonProps) {
  return (
    <motion.button
      key="collapsed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        'silver-shine-border rounded-md cursor-pointer border border-border/40 bg-background',
        className,
      )}
    >
      <span className="relative z-[2] inline-flex items-center gap-2 h-9 px-4 w-full text-sm font-sans whitespace-nowrap">
        {children}
      </span>
    </motion.button>
  );
}
