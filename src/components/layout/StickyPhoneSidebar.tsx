import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useActiveLocations } from "@/hooks/useLocations";

export function StickyPhoneSidebar() {
  const { data: dbLocations = [] } = useActiveLocations();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Only show locations that have a phone number
  const locationsWithPhone = dbLocations.filter(loc => loc.phone);

  const handleLocationClick = (locationId: string) => {
    setSelectedLocation(selectedLocation === locationId ? null : locationId);
  };

  const selectedLocationData = locationsWithPhone.find(l => l.id === selectedLocation);

  // Hide sidebar if no locations have phone numbers
  if (locationsWithPhone.length === 0) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-foreground text-background py-6 px-4 flex flex-col items-center gap-6"
          >
            {/* Collapse button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="text-background/60 hover:text-background transition-colors"
              aria-label="Collapse phone sidebar"
            >
              <ChevronRight size={16} />
            </button>

            {/* Location names - vertical layout */}
            <div className="flex flex-col gap-4">
              {locationsWithPhone.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationClick(location.id)}
                  className={`flex flex-col items-center gap-2 group transition-colors ${
                    selectedLocation === location.id ? "text-background" : "text-background/60 hover:text-background"
                  }`}
                >
                  <Phone size={16} />
                  <span
                    className="text-xs uppercase tracking-wider font-display"
                    style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                  >
                    {location.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Phone number reveal */}
            <AnimatePresence>
              {selectedLocationData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-background/20 pt-4 flex flex-col items-center gap-2"
                >
                  <a
                    href={`tel:${selectedLocationData.phone.replace(/[^0-9+]/g, "")}`}
                    className="text-xs font-sans text-background hover:text-background/80 transition-colors whitespace-nowrap"
                    style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                  >
                    {selectedLocationData.phone}
                  </a>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-background/40 hover:text-background transition-colors mt-2"
                    aria-label="Close phone number"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => setIsExpanded(true)}
            className="bg-foreground text-background p-3 hover:bg-foreground/90 transition-colors"
            aria-label="Expand phone sidebar"
          >
            <div className="flex items-center gap-2">
              <ChevronLeft size={14} />
              <Phone size={16} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
