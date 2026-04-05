import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const QUOTE_TEXT = `"Zura gives us visibility we never had. It helps us monitor margins, reinforce team structure, and provide daily clarity, significantly improving our operations."`;

const HIGHLIGHTS = [
  'visibility we never had',
  'monitor margins',
  'significantly improving',
];

function renderQuoteWithHighlights(text: string, highlights: string[]) {
  const parts: { text: string; highlighted: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestIndex = remaining.length;
    let earliestPhrase = '';

    for (const phrase of highlights) {
      const idx = remaining.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1 && idx < earliestIndex) {
        earliestIndex = idx;
        earliestPhrase = phrase;
      }
    }

    if (earliestPhrase) {
      if (earliestIndex > 0) {
        parts.push({ text: remaining.slice(0, earliestIndex), highlighted: false });
      }
      parts.push({ text: remaining.slice(earliestIndex, earliestIndex + earliestPhrase.length), highlighted: true });
      remaining = remaining.slice(earliestIndex + earliestPhrase.length);
    } else {
      parts.push({ text: remaining, highlighted: false });
      remaining = '';
    }
  }

  return parts.map((part, i) =>
    part.highlighted ? (
      <span key={i} className="bg-amber-100/60 px-1 rounded-sm">
        {part.text}
      </span>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

export function FounderQuote() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="relative z-10 bg-[#FAF9F7] py-20 lg:py-28">
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16 items-center">
          {/* Photo placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex justify-center md:justify-end"
          >
            <div className="w-48 h-56 sm:w-56 sm:h-64 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden">
              <span className="font-display text-4xl text-slate-400 tracking-wide">SM</span>
            </div>
          </motion.div>

          {/* Quote + attribution */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl text-slate-900 leading-snug tracking-tight mb-8">
              {renderQuoteWithHighlights(QUOTE_TEXT, HIGHLIGHTS)}
            </p>

            <div className="space-y-1">
              <p className="font-sans text-base text-slate-900">Sarah Mitchell</p>
              <p className="font-sans text-sm text-slate-500">Founder, Luxe Collective</p>
            </div>

            <p className="font-display text-[11px] tracking-[0.15em] text-slate-400 uppercase mt-5">
              Luxe Collective
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
