import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // Disable custom cursor on dashboard routes
  const isDashboard = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    // Toggle body and html class for cursor + scrollbar styling
    if (isDashboard) {
      document.body.classList.add('dashboard-cursor');
      document.documentElement.classList.add('dashboard-cursor');
    } else {
      document.body.classList.remove('dashboard-cursor');
      document.documentElement.classList.remove('dashboard-cursor');
    }

    return () => {
      document.body.classList.remove('dashboard-cursor');
      document.documentElement.classList.remove('dashboard-cursor');
    };
  }, [isDashboard]);

  useEffect(() => {
    // Only enable on devices with fine pointer (desktop) and not on dashboard
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer || isDashboard) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const isInteractiveElement = (target: HTMLElement) => {
      return (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[role='button']") ||
        target.classList.contains("cursor-pointer") ||
        target.classList.contains("cursor-grab") ||
        target.closest(".cursor-grab")
      );
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isInteractiveElement(target)) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isInteractiveElement(target)) {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updatePosition);
    document.addEventListener("mouseover", handleMouseEnter);
    document.addEventListener("mouseout", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
    };
  }, [isDashboard]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999] mix-blend-difference"
      animate={{
        x: position.x - (isHovering ? 12 : 10),
        y: position.y - (isHovering ? 12 : 10),
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 28,
        mass: 0.5,
      }}
    >
      {isHovering ? (
        // Pulsating dot on hover
        <motion.div
          className="relative"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Pulsating ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ width: 24, height: 24 }}
          />
          {/* Center dot */}
          <motion.div
            className="w-6 h-6 rounded-full bg-white"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      ) : (
        // X cursor for default state
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-white">
          <line
            x1="4"
            y1="4"
            x2="16"
            y2="16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="4"
            x2="4"
            y2="16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </motion.div>
  );
}
