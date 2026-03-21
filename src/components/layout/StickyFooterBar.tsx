import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Phone, ChevronUp } from "lucide-react";
import { ScrollProgressButton } from "./ScrollProgressButton";
import { useActiveLocations } from "@/hooks/useLocations";
import { useOrgPath } from "@/hooks/useOrgPath";

export function StickyFooterBar() {
  const orgPath = useOrgPath();
  const [isVisible, setIsVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const routeLocation = useLocation();
  const isBookingPage = routeLocation.pathname === "/booking";
  const { data: locations = [] } = useActiveLocations();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Detect scroll direction
      const isScrollingDown = scrollY > lastScrollY;
      lastScrollY = scrollY;
      
      // Show after scrolling past 50% of first viewport
      const pastThreshold = scrollY > windowHeight * 0.5;
      
      // Hide when near bottom (within 1.5 viewport heights of the bottom)
      const nearBottom = scrollY + windowHeight > documentHeight - windowHeight * 1.5;
      
      // Show on scroll down, hide on scroll up
      setIsVisible(pastThreshold && !nearBottom && isScrollingDown);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isBookingPage) return null;

  return (
    <>
      {/* Scroll to top - bottom right (hidden on mobile) */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <AnimatePresence>
          {isVisible && <ScrollProgressButton />}
        </AnimatePresence>
      </div>

      {/* Glassmorphism footer bar */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-4 inset-x-0 mx-auto w-fit md:bottom-8 z-40"
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-3xl blur-sm" />
            <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-2xl" />
            
            <div className="relative flex items-center gap-2 p-1.5 md:p-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Mobile: Dropdown for locations */}
              <div ref={dropdownRef} className="relative md:hidden">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-3 text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-full transition-all duration-200"
                >
                  <Phone size={14} />
                  <span className="text-xs font-medium uppercase tracking-wide">Call</span>
                  <ChevronUp 
                    size={12} 
                    className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-0' : 'rotate-180'}`} 
                  />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                    >
                      {locations.map((loc) => (
                        <a
                          key={loc.name}
                          href={`tel:${loc.phone.replace(/[^0-9]/g, "")}`}
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
                        >
                          <Phone size={14} className="text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{loc.name}</p>
                            <p className="text-xs text-muted-foreground">{loc.phone}</p>
                          </div>
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop: Show all locations with dividers between them */}
              <div className="hidden md:flex items-center">
                {locations.map((loc, index) => (
                  <div key={loc.id} className="flex items-center">
                    {index > 0 && <div className="w-px h-6 bg-foreground/15" />}
                    <a
                      href={`tel:${loc.phone.replace(/[^0-9]/g, "")}`}
                      className="flex items-center gap-2 px-4 py-3 text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-full transition-all duration-200"
                    >
                      <Phone size={14} />
                      <span className="text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                        {loc.name}
                      </span>
                    </a>
                  </div>
                ))}
              </div>

              {/* Book CTA */}
              <Link
                to={orgPath("/booking")}
                className="flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all duration-200 group"
              >
                <span className="text-xs md:text-sm font-medium">Book consult</span>
                <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
