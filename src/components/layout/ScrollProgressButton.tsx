import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useHeroExitProgress } from "@/lib/heroExitProgressSignal";

export function ScrollProgressButton() {
  // One source of truth: the hero publishes its own exit progress; we just
  // gate visibility on it. Replaces a duplicated `window.scrollY` listener
  // that would drift if the hero's height/anchor changed.
  const heroExit = useHeroExitProgress();
  const isVisible = (heroExit ?? 0) > 0.5;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-foreground/20 bg-background/80 backdrop-blur-sm hover:bg-foreground hover:text-background transition-all duration-200 cursor-pointer text-foreground"
          aria-label="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}