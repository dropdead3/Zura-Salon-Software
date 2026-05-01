import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Phone, ChevronUp } from "lucide-react";
import { ScrollProgressButton } from "./ScrollProgressButton";
import { useActiveLocations } from "@/hooks/useLocations";
import { useOrgPath } from "@/hooks/useOrgPath";
import {
  useStickyFooterBarConfig,
  DEFAULT_STICKY_FOOTER_BAR,
} from "@/hooks/useSectionConfig";

export function StickyFooterBar() {
  const orgPath = useOrgPath();
  const isEditorPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "true";
  const [isVisible, setIsVisible] = useState(isEditorPreview);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const routeLocation = useLocation();
  const { data: allLocations = [] } = useActiveLocations();
  const { data: configRaw } = useStickyFooterBarConfig();
  const config = configRaw ?? DEFAULT_STICKY_FOOTER_BAR;

  // Resolve the visible location list:
  // 1) Always require a phone number (the bar is a call/CTA strip).
  // 2) When operator picked an explicit allow-list, use it ordered. Empty
  //    array preserves the legacy "show every active location" behavior.
  const locations = useMemo(() => {
    const withPhone = allLocations.filter((l) => !!l.phone);
    if (!config.show_phone_numbers) return [];
    if (!config.visible_location_ids?.length) return withPhone;
    const byId = new Map(withPhone.map((l) => [l.id, l]));
    return config.visible_location_ids
      .map((id) => byId.get(id))
      .filter((l): l is typeof withPhone[number] => !!l);
  }, [allLocations, config.show_phone_numbers, config.visible_location_ids]);

  // Page-exclusion check: /booking is always implicit + operator-defined extras.
  const isExcludedPage = useMemo(() => {
    if (routeLocation.pathname === "/booking") return true;
    return (config.page_exclusions ?? []).some(
      (p) => p && routeLocation.pathname === p,
    );
  }, [routeLocation.pathname, config.page_exclusions]);

  useEffect(() => {
    if (!config.enabled) {
      setIsVisible(false);
      return;
    }
    // In the website-editor preview iframe, always show the bar so operators
    // can see/style it without scrolling inside the iframe.
    if (isEditorPreview) {
      setIsVisible(true);
      return;
    }

    const threshold = Math.max(0, config.scroll_show_after_px ?? 180);
    let lastY = window.scrollY;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(documentHeight - windowHeight, 0);

      // Direction-aware: only reveal while the user is actively scrolling
      // DOWN past the threshold. Any upward scroll hides the bar so it never
      // covers content the visitor is scrolling back up to read.
      const delta = scrollY - lastY;
      const scrollingDown = delta > 2; // small dead-zone to ignore jitter
      const scrollingUp = delta < -2;
      const pastThreshold = scrollY > threshold;
      const nearBottom = maxScroll > 240 && scrollY >= maxScroll - 120;

      setIsVisible((prev) => {
        if (nearBottom) return false;
        if (!pastThreshold) return false;
        if (scrollingDown) return true;
        if (scrollingUp) return false;
        return prev; // no movement → preserve current state
      });

      lastY = scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isEditorPreview, config.enabled, config.scroll_show_after_px]);

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

  if (!config.enabled) return null;
  if (isExcludedPage) return null;

  const ctaText = config.cta_text?.trim() || "Book consult";
  const ctaUrl = config.cta_url?.trim() || "/booking";
  // External URLs (http/https) bypass the org-scoped router prefix.
  const isExternalCta = /^https?:\/\//i.test(ctaUrl);

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
            <div className="relative flex items-center gap-2 p-1.5 md:p-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Mobile: Dropdown for locations */}
              {locations.length > 0 && (
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
                            key={loc.id}
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
              )}

              {/* Desktop: Show all locations with dividers between them */}
              {locations.length > 0 && (
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
              )}

              {/* Book CTA */}
              {isExternalCta ? (
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all duration-200 group"
                >
                  <span className="text-xs md:text-sm font-medium">{ctaText}</span>
                  <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ) : (
                <Link
                  to={orgPath(ctaUrl)}
                  className="flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all duration-200 group"
                >
                  <span className="text-xs md:text-sm font-medium">{ctaText}</span>
                  <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
