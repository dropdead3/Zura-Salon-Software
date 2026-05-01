import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, ChevronDown, MoreHorizontal, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { OrganizationLogo } from "@/components/brand/OrganizationLogo";
import { cn } from "@/lib/utils";
import { useAnnouncementBarSettings } from "@/hooks/useAnnouncementBar";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { useOrgPath } from "@/hooks/useOrgPath";
import { usePublicMenuBySlug, buildMenuTree, type MenuItem, type MenuConfig } from "@/hooks/useWebsiteMenus";
import { emitNavEvent } from "@/lib/nav-tracking";

function isColorDark(color: string): boolean {
  if (!color) return false;
  const hslMatch = color.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/);
  if (hslMatch) return parseInt(hslMatch[3]) < 40;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Fallback hardcoded links (used when no published menu exists)
const FALLBACK_NAV_ITEMS = [
  { href: "/services", label: "Services", priority: 1, type: "link" as const },
  { href: "/about", label: "About", priority: 2, type: "dropdown" as const, children: [
    { href: "/about", label: "About Us" },
    { href: "/policies", label: "Policies" },
  ]},
  { href: "/team", label: "Team", priority: 3, type: "link" as const },
  { href: "/gallery", label: "Gallery", priority: 4, type: "link" as const },
  { href: "/contact", label: "Contact", priority: 5, type: "link" as const },
];

const FALLBACK_CTA = { href: "/booking", label: "Book Now" };

/** Transform published menu items into the nav format used by the Header */
function menuItemToNavItem(item: MenuItem, index: number, orgPath: (p: string) => string): {
  href: string;
  label: string;
  priority: number;
  type: 'link' | 'dropdown' | 'cta';
  children?: { href: string; label: string }[];
  openInNewTab?: boolean;
  ctaStyle?: string;
  visibility?: string;
} {
  const href = item.target_url
    ? (item.target_url.startsWith('http') ? item.target_url : orgPath(item.target_url))
    : item.target_page_id
      ? orgPath(`/${item.target_page_id}`)
      : '#';

  const type = item.item_type === 'cta' ? 'cta' as const
    : item.item_type === 'dropdown_parent' ? 'dropdown' as const
    : 'link' as const;

  return {
    href,
    label: item.label,
    priority: index + 1,
    type,
    children: item.children?.map(child => ({
      href: child.target_url
        ? (child.target_url.startsWith('http') ? child.target_url : orgPath(child.target_url))
        : '#',
      label: child.label,
    })),
    openInNewTab: item.open_in_new_tab,
    ctaStyle: item.cta_style ?? undefined,
    visibility: item.visibility,
  };
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isHoverNearTop, setIsHoverNearTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOverDark, setIsOverDark] = useState(false);
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [hiddenNavItems, setHiddenNavItems] = useState<number[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const staffMenuRef = useRef<HTMLDivElement>(null);
  const { data: businessSettings } = useBusinessSettings();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const { data: dbAnnouncementSettings } = useAnnouncementBarSettings();
  // In editor preview mode, merge unsaved announcement-bar edits.
  const announcementSettings = useLiveOverride('announcement_bar', dbAnnouncementSettings);
  const orgPath = useOrgPath();

  // Fetch published primary menu
  const { data: publishedMenuData } = usePublicMenuBySlug('primary');
  const publishedMenu = publishedMenuData?.items ?? null;
  const menuConfig = publishedMenuData?.config;
  const mobileMenuStyle = menuConfig?.mobile_menu_style ?? 'overlay';
  const mobileCTAVisible = menuConfig?.mobile_cta_visible ?? true;

  // Build nav items from published menu or fallback
  const { navItems, ctaItem } = useMemo(() => {
    if (!publishedMenu || publishedMenu.length === 0) {
      return {
        navItems: FALLBACK_NAV_ITEMS.map(item => ({
          ...item,
          href: orgPath(item.href),
          children: item.children?.map(c => ({ ...c, href: orgPath(c.href) })),
        })),
        ctaItem: { ...FALLBACK_CTA, href: orgPath(FALLBACK_CTA.href) },
      };
    }

    const nonCta: typeof FALLBACK_NAV_ITEMS = [];
    let cta = { href: orgPath('/booking'), label: 'Book Consult' };

    publishedMenu.forEach((item, idx) => {
      if (item.visibility === 'mobile_only') return;
      const nav = menuItemToNavItem(item, idx, orgPath);
      if (nav.type === 'cta') {
        cta = { href: nav.href, label: nav.label };
      } else {
        nonCta.push(nav as typeof FALLBACK_NAV_ITEMS[0]);
      }
    });

    return { navItems: nonCta, ctaItem: cta };
  }, [publishedMenu, orgPath]);

  // Mobile nav items (include mobile_only, exclude desktop_only)
  const mobileNavItems = useMemo(() => {
    if (!publishedMenu || publishedMenu.length === 0) {
      const items: { href: string; label: string; type: string }[] = [];
      FALLBACK_NAV_ITEMS.forEach(item => {
        if (item.type === 'dropdown' && item.children) {
          items.push({ href: orgPath(item.href), label: item.label, type: 'link' });
          item.children.forEach(c => items.push({ href: orgPath(c.href), label: c.label, type: 'child' }));
        } else {
          items.push({ href: orgPath(item.href), label: item.label, type: 'link' });
        }
      });
      return items;
    }

    const items: { href: string; label: string; type: string }[] = [];
    publishedMenu.forEach((item) => {
      if (item.visibility === 'desktop_only') return;
      if (item.item_type === 'cta') return;
      const nav = menuItemToNavItem(item, 0, orgPath);
      if (nav.type === 'dropdown' && nav.children) {
        nav.children.forEach(c => items.push({ href: c.href, label: c.label, type: 'child' }));
      } else {
        items.push({ href: nav.href, label: nav.label, type: 'link' });
      }
    });
    return items;
  }, [publishedMenu, orgPath]);

  // Track desktop breakpoint for sticky effects
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const isScrolledDesktop = isScrolled && isDesktop;

  // Calculate which items should be hidden based on window width
  const calculateHiddenItems = useCallback(() => {
    const windowWidth = window.innerWidth;
    const allPriorities = navItems.map(i => i.priority).sort((a, b) => b - a);
    
    if (windowWidth >= 1400) {
      setHiddenNavItems([]);
    } else if (windowWidth >= 1280) {
      setHiddenNavItems(allPriorities.slice(0, 1));
    } else if (windowWidth >= 1180) {
      setHiddenNavItems(allPriorities.slice(0, 2));
    } else if (windowWidth >= 1100) {
      setHiddenNavItems(allPriorities.slice(0, 3));
    } else if (windowWidth >= 1024) {
      setHiddenNavItems(allPriorities.slice(0, 4));
    } else {
      setHiddenNavItems(allPriorities);
    }
  }, [navItems]);

  // ResizeObserver for responsive nav
  useEffect(() => {
    calculateHiddenItems();
    const resizeObserver = new ResizeObserver(() => {
      calculateHiddenItems();
    });
    if (navContainerRef.current?.parentElement) {
      resizeObserver.observe(navContainerRef.current.parentElement);
    }
    window.addEventListener("resize", calculateHiddenItems);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateHiddenItems);
    };
  }, [calculateHiddenItems]);

  // Close staff menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isStaffMenuOpen && staffMenuRef.current && !staffMenuRef.current.contains(event.target as Node)) {
        setIsStaffMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStaffMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsScrollingUp(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsScrollingUp(false);
      }
      lastScrollY.current = currentScrollY;
      setIsScrolled(currentScrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal hidden header when the mouse moves near the top of the viewport.
  useEffect(() => {
    const HOVER_REVEAL_THRESHOLD = 80; // px from top edge
    const handleMouseMove = (e: MouseEvent) => {
      setIsHoverNearTop(e.clientY <= HOVER_REVEAL_THRESHOLD);
    };
    const handleMouseLeave = () => setIsHoverNearTop(false);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);
  useEffect(() => {
    const detectTheme = () => {
      const headerEl = headerRef.current;
      if (!headerEl) return;
      const headerRect = headerEl.getBoundingClientRect();
      const sampleY = headerRect.bottom + 50;
      const sampleX = window.innerWidth / 2;
      const elBehind = document.elementFromPoint(sampleX, sampleY);
      let foundDark = false;
      let cur: Element | null = elBehind;
      while (cur && cur !== document.body) {
        if (cur instanceof HTMLElement && cur.hasAttribute("data-theme")) {
          const theme = cur.getAttribute("data-theme");
          if (theme === "dark") foundDark = true;
          break;
        }
        cur = cur.parentElement;
      }
      setIsOverDark(foundDark);
    };
    window.addEventListener("scroll", detectTheme, { passive: true });
    detectTheme();
    return () => window.removeEventListener("scroll", detectTheme);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none [&>*]:pointer-events-auto">
      {/* Top Announcement Bar — translucent so hero media shows through */}
      {announcementSettings?.enabled && (() => {
        // Determine effective bg darkness for text contrast.
        // When operator sets a bg_color, use it. Otherwise the bar is translucent
        // over hero media — fall back to the section theme (isOverDark) detected
        // by the same logic the main header uses.
        const hasExplicitBg = !!announcementSettings.bg_color;
        const effectiveDark = hasExplicitBg
          ? isColorDark(announcementSettings.bg_color!)
          : isOverDark;
        // Strengthen scrim over hero media so text stays legible on busy footage.
        const overMediaDark = !hasExplicitBg && isOverDark;
        // Hide announcement bar on scroll-down past hero, slide back in on scroll-up.
        const announcementHidden = isScrolled && !isScrollingUp;
        return (
          <div 
            className={cn(
              "relative py-4 md:py-2.5 px-4 md:px-6 backdrop-blur-xl border-b border-border/40",
              "transition-[transform,opacity] duration-300 ease-out will-change-transform origin-top",
              announcementHidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
              !hasExplicitBg && (isOverDark ? "bg-black/70" : "bg-secondary/90"),
              // Subtle top-down gradient scrim improves readability over photographic backgrounds
              overMediaDark && "bg-gradient-to-b from-black/80 to-black/60",
              // Warm cream overlay — sits above the glass to add a soft champagne tint
              "before:pointer-events-none before:absolute before:inset-0 before:bg-[hsl(42_38%_90%/0.18)] before:mix-blend-soft-light",
              "[&>*]:relative [&>*]:z-[1]",
            )}
            style={hasExplicitBg ? { backgroundColor: `${announcementSettings.bg_color}F2` } : undefined}
          >
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-center md:justify-between gap-1 md:gap-0">
              <p className={cn(
                "text-sm text-center md:text-left",
                effectiveDark ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]" : "text-foreground/80",
              )}>
                {announcementSettings.message_prefix}{' '}
                <span className="font-medium">{announcementSettings.message_highlight}</span>{' '}
                {announcementSettings.message_suffix}
              </p>
              <a 
                href={announcementSettings.cta_url || '#'} 
                target={announcementSettings.open_in_new_tab ? '_blank' : undefined}
                rel={announcementSettings.open_in_new_tab ? 'noopener noreferrer' : undefined}
                className={cn(
                  "group inline-flex items-center gap-1.5 text-sm font-display uppercase tracking-wide hover:opacity-80 transition-opacity",
                  effectiveDark ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]" : "text-foreground",
                )}
              >
                {announcementSettings.cta_text}
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        );
      })()}

      {/* Main Header — overlays hero media; sticks to top on scroll, hides on scroll-down */}
      <header 
        ref={headerRef}
        className={cn(
          "sticky top-0 left-0 right-0 z-50 px-4 md:px-6 lg:px-8",
          "transition-[padding,transform,opacity] duration-300 ease-out will-change-transform",
          isScrolledDesktop ? "pt-3 md:pt-4 lg:pt-5" : "pt-2",
          isScrolled && !isScrollingUp ? "-translate-y-[120%] opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
        )}
      >
        <motion.div
          initial={false}
          animate={{
            backgroundColor: isScrolledDesktop 
              ? isOverDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.1)" 
              : "transparent",
            backdropFilter: isScrolledDesktop ? "blur(24px) saturate(1.5)" : "blur(0px)",
            borderColor: isScrolledDesktop 
              ? isOverDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)" 
              : "transparent",
            boxShadow: isScrolledDesktop 
              ? "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : "none",
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            "rounded-full border transition-colors duration-300",
            isScrolledDesktop 
              ? isOverDark ? "bg-black/20" : "bg-white/10" 
              : "bg-transparent"
          )}
        >
          <div className={cn(
            "container mx-auto px-6 lg:px-8 transition-colors duration-300",
            isOverDark ? "text-white [&_svg]:text-white" : "text-foreground"
          )}>
            <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="w-40 lg:w-40 xl:w-56 shrink-0 flex items-center">
              <Link
                to={orgPath("/")}
                className="flex items-center hover:opacity-70 transition-opacity relative h-8"
              >
                <OrganizationLogo
                  variant="website"
                  logoUrl={businessSettings?.logo_light_url}
                  theme="light"
                  alt={businessSettings?.business_name || 'Salon'}
                  style={{ 
                    opacity: !isScrolledDesktop || isScrollingUp ? 1 : 0,
                    transform: !isScrolledDesktop || isScrollingUp ? "scale(1)" : "scale(0.95)",
                    transition: "opacity 0.5s ease-out, transform 0.5s ease-out"
                  }}
                  className={cn(
                    "h-7 w-auto",
                    isOverDark && "invert"
                  )}
                />
                <OrganizationLogo
                  variant="website-icon"
                  logoUrl={businessSettings?.logo_light_url}
                  iconUrl={businessSettings?.icon_light_url}
                  theme="light"
                  alt={businessSettings?.business_name || 'Salon'}
                  style={{ 
                    opacity: isScrolledDesktop && !isScrollingUp ? 1 : 0,
                    transform: isScrolledDesktop && !isScrollingUp ? "scale(1)" : "scale(0.95)",
                    transition: "opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s"
                  }}
                  className={cn(
                    "h-6 w-auto absolute left-0",
                    isOverDark && "invert"
                  )}
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <motion.nav 
              ref={navContainerRef}
              className="hidden lg:flex items-center gap-4 xl:gap-8 shrink-0"
              animate={{ 
                opacity: isStaffMenuOpen ? 0 : 1,
                pointerEvents: isStaffMenuOpen ? "none" : "auto"
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {navItems.map((item, index) => {
                const isHidden = hiddenNavItems.includes(item.priority);
                if (isHidden) return null;
                
                if (item.type === "dropdown" && item.children) {
                  return (
                    <motion.div
                      key={item.href + item.label}
                      data-nav-item
                      data-priority={item.priority}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                      className="relative shrink-0"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger 
                          className={cn(
                            "flex items-center gap-1 text-sm tracking-wide font-sans font-medium transition-opacity leading-none outline-none whitespace-nowrap",
                            item.children.some(c => location.pathname === c.href)
                              ? "opacity-100"
                              : "opacity-70 hover:opacity-100"
                          )}
                        >
                          {item.label}
                          <ChevronDown size={14} className="transition-transform duration-200" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="center" 
                          sideOffset={12}
                          className="w-[180px] rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
                        >
                          {item.children.map((link) => (
                            <DropdownMenuItem key={link.href} asChild>
                              <Link
                                to={link.href}
                                className={cn(
                                  "flex items-center gap-3 select-none rounded-md px-3 py-2.5 text-sm font-medium leading-none cursor-pointer transition-all duration-200",
                                  location.pathname === link.href
                                    ? "bg-accent text-accent-foreground" 
                                    : "text-foreground/80"
                                )}
                              >
                                {link.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.href + item.label}
                    data-nav-item
                    data-priority={item.priority}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                    className="shrink-0"
                  >
                    <Link
                      to={item.href}
                      onClick={() => emitNavEvent('nav_item_clicked', {
                        label: item.label,
                        href: item.href,
                        item_type: 'link',
                        menu_location: 'header',
                      })}
                      className={cn(
                        "group relative flex items-center gap-1 text-sm tracking-wide font-sans font-medium transition-opacity leading-none whitespace-nowrap",
                        location.pathname === item.href
                          ? "opacity-100"
                          : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <span className="transition-transform duration-300 group-hover:-translate-x-1">
                        {item.label}
                      </span>
                      <ArrowRight 
                        size={14} 
                        className="opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" 
                      />
                    </Link>
                  </motion.div>
                );
              })}

              {/* Overflow Dropdown */}
              {hiddenNavItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="shrink-0"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      className="flex items-center justify-center w-8 h-8 rounded-full opacity-70 hover:opacity-100 hover:bg-foreground/5 transition-all outline-none"
                    >
                      <MoreHorizontal size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      sideOffset={12}
                      className="w-[200px] rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
                    >
                      {navItems
                        .filter(item => hiddenNavItems.includes(item.priority))
                        .map((item) => {
                          if (item.type === "dropdown" && item.children) {
                            return item.children.map((link) => (
                              <DropdownMenuItem key={link.href} asChild>
                                <Link
                                  to={link.href}
                                  className={cn(
                                    "flex items-center gap-3 select-none rounded-md px-3 py-2.5 text-sm font-medium leading-none cursor-pointer transition-all duration-200",
                                    location.pathname === link.href
                                      ? "bg-accent text-accent-foreground" 
                                      : "text-foreground/80"
                                  )}
                                >
                                  {link.label}
                                </Link>
                              </DropdownMenuItem>
                            ));
                          }
                          return (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link
                                to={item.href}
                                className={cn(
                                  "flex items-center gap-3 select-none rounded-md px-3 py-2.5 text-sm font-medium leading-none cursor-pointer transition-all duration-200",
                                  location.pathname === item.href 
                                    ? "bg-accent text-accent-foreground" 
                                    : "text-foreground/80"
                                )}
                              >
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}
            </motion.nav>

            {/* Right Side - Contact & Book */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ 
                opacity: isStaffMenuOpen ? 0 : 1, 
                y: 0,
                pointerEvents: isStaffMenuOpen ? "none" : "auto"
              }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="hidden lg:flex items-center gap-3 xl:gap-6 shrink-0"
            >
              <Link
                to="/contact"
                className="text-sm tracking-wide font-sans font-medium opacity-70 hover:opacity-100 transition-opacity duration-300 link-underline"
              >
                Contact Us
              </Link>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={ctaItem.href}
                      onClick={() => emitNavEvent('cta_clicked', {
                        label: ctaItem.label,
                        href: ctaItem.href,
                        cta_style: 'primary',
                        menu_location: 'header',
                      })}
                      className={cn(
                        "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-sans font-medium rounded-full border transition-all duration-300 active:scale-[0.98] hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg",
                        isOverDark 
                          ? "bg-transparent border-white/40 text-white hover:bg-white/10 hover:border-white/60" 
                          : "bg-transparent border-foreground/30 text-foreground hover:bg-foreground/5 hover:border-foreground/50"
                      )}
                    >
                      {ctaItem.label}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[320px] p-5 bg-background text-foreground border border-border shadow-lg">
                    <p className="text-sm text-center leading-relaxed">New-client consultations ($15) are required for all new clients to ensure we match you to your best suited stylist and prepare the best plan to achieve your end goal.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Staff Menu Button */}
              <AnimatePresence>
                {!isStaffMenuOpen && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsStaffMenuOpen(true)}
                    className="p-2 transition-opacity"
                    aria-label="Staff login"
                  >
                    <UserRound size={20} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Staff Login Expanding Menu */}
            <AnimatePresence>
              {isStaffMenuOpen && (
                <motion.div
                  ref={staffMenuRef}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute right-4 md:right-6 lg:right-8 top-1/2 -translate-y-1/2 overflow-hidden"
                >
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="flex items-center gap-3 pl-4 pr-2"
                  >
                    <Link
                      to="/login"
                      onClick={() => setIsStaffMenuOpen(false)}
                      className={cn(
                        "text-sm font-sans font-medium whitespace-nowrap px-4 py-2 rounded-full border transition-all duration-200",
                        isOverDark 
                          ? "border-white/30 text-white hover:bg-white/10" 
                          : "border-foreground/20 text-foreground hover:bg-foreground/5"
                      )}
                    >
                      Staff Login
                    </Link>
                    <button
                      onClick={() => setIsStaffMenuOpen(false)}
                      className="p-1.5 opacity-70 hover:opacity-100 transition-opacity"
                      aria-label="Close menu"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "lg:hidden p-2 transition-all",
                isMobileMenuOpen && "p-3 rounded-full border border-border"
              )}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={24} />}
            </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Menu — Overlay Style */}
        <AnimatePresence>
          {isMobileMenuOpen && mobileMenuStyle === 'overlay' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-background border-t border-border overflow-hidden"
            >
              <nav className="container mx-auto px-6 py-8 flex flex-col gap-6">
                {mobileNavItems.map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    className={cn(
                      "text-xl font-display uppercase tracking-wide transition-opacity flex items-center gap-2",
                      location.pathname === item.href ? "opacity-100" : "opacity-60",
                      item.type === 'child' && "pl-4"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.type === 'child' && (
                      <ArrowRight size={16} className="text-muted-foreground" />
                    )}
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/contact"
                  className="text-xl font-display uppercase tracking-wide opacity-60"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact Us
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                {mobileCTAVisible && (
                  <Link
                    to={ctaItem.href}
                    className="mt-4 w-full text-center inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-display uppercase tracking-wide bg-foreground text-background rounded-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {ctaItem.label}
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu — Drawer Style */}
        <AnimatePresence>
          {isMobileMenuOpen && mobileMenuStyle === 'drawer' && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              {/* Drawer panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 z-50 h-full w-[85vw] max-w-sm bg-background border-l border-border shadow-2xl lg:hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <span className="text-sm font-display uppercase tracking-wide text-muted-foreground">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-5">
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href + item.label}
                      to={item.href}
                      className={cn(
                        "text-lg font-display uppercase tracking-wide transition-opacity flex items-center gap-2",
                        location.pathname === item.href ? "opacity-100" : "opacity-60",
                        item.type === 'child' && "pl-4 text-base"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.type === 'child' && (
                        <ArrowRight size={14} className="text-muted-foreground" />
                      )}
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    to="/contact"
                    className="text-lg font-display uppercase tracking-wide opacity-60"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Contact Us
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                </nav>
                {mobileCTAVisible && (
                  <div className="px-6 py-5 border-t border-border">
                    <Link
                      to={ctaItem.href}
                      className="w-full text-center inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-display uppercase tracking-wide bg-foreground text-background rounded-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {ctaItem.label}
                    </Link>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
