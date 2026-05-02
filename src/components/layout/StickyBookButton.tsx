import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ScrollProgressButton } from "./ScrollProgressButton";
import { useOrgPath } from "@/hooks/useOrgPath";
import { useHeroExitProgress } from "@/lib/heroExitProgressSignal";

export function StickyBookButton() {
  const orgPath = useOrgPath();
  const [shine, setShine] = useState(false);
  const location = useLocation();
  const isBookingPage = location.pathname === "/booking";

  // Subscribe to the hero's exit-progress signal instead of binding our own
  // scroll listener. When no hero is mounted (non-public-site routes) the
  // signal is `null` — we treat that as "not past the hero" so the FAB
  // stays hidden on routes that never had a hero to begin with.
  const heroExit = useHeroExitProgress();
  const isVisible = (heroExit ?? 0) > 0.5;

  // Shine animation every 6 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setShine(true);
      setTimeout(() => setShine(false), 800);
    }, 6000);

    // Trigger initial shine after a short delay
    const initialTimeout = setTimeout(() => {
      setShine(true);
      setTimeout(() => setShine(false), 800);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isVisible]);

  if (isBookingPage) return null;

  return (
    <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3">
      <AnimatePresence>
        {isVisible && (
          <>
            <ScrollProgressButton />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 15,
                mass: 1
              }}
            >
              <Link
                to={orgPath("/booking")}
                className="relative inline-flex items-center gap-2 px-6 py-4 text-sm font-sans font-normal bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-2xl overflow-hidden"
              >
                {/* Shine effect */}
                <span
                  className={`absolute inset-0 transition-transform duration-700 ease-out ${
                    shine ? "translate-x-full" : "-translate-x-full"
                  }`}
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                    width: "100%",
                  }}
                />
                <span className="relative z-10">Book consult</span>
                <ArrowUpRight size={14} className="relative z-10" />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
