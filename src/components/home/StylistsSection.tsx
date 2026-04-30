import { useState, useRef, useEffect, memo, useCallback, startTransition, useMemo } from "react";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, Info, Star, X, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TogglePill } from "@/components/ui/toggle-pill";
import { StylistFlipCard } from "./StylistFlipCard";
import { useActiveLocations } from "@/hooks/useLocations";
import { useHomepageStylists } from "@/hooks/useHomepageStylists";
import { useHomepageStylistsSettings } from "@/hooks/useSiteSettings";
import { useSpecialtyOptions } from "@/hooks/useSpecialtyOptions";
import { sampleStylists } from "@/data/sampleStylists";
import { useStylistsDisplayConfig, DEFAULT_STYLISTS_DISPLAY } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "./InlineEditableText";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";

import { locations as staticLocations, stylistLevels, type Stylist, type Location } from "@/data/stylists";
import { useLocationName } from "@/hooks/useLocationName";
import { useStylistLevels } from "@/hooks/useStylistLevels";
import { useWebsiteLevelDisplayMode } from "@/hooks/useWebsiteLevelDisplayMode";

// Helper to convert text to title case
const toTitleCase = (str: string) => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// Expanded Application Form Component
function ExpandedApplicationForm({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    experience: "",
    clientBook: "",
    specialties: "",
    whyJoinUs: "",
  });

  const validateForm = () => {
    const missingFields: string[] = [];
    
    if (!formData.name.trim()) missingFields.push("Full Name");
    if (!formData.email.trim()) missingFields.push("Email");
    if (!formData.phone.trim()) missingFields.push("Phone");
    if (!formData.experience) missingFields.push("Experience");
    if (!formData.clientBook) missingFields.push("Current Client Book");
    if (!formData.specialties.trim()) missingFields.push("Your Specialties");
    if (!formData.whyJoinUs.trim()) missingFields.push("Why Us");
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }
    
    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill out: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Application submitted:", formData);
    setIsSubmitting(false);
    setIsSubmitted(true);
    // Auto-close after showing success
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Success state
  if (isSubmitted) {
    return (
      <motion.div 
        className="w-full max-w-2xl mx-auto text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-foreground/10 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-10 h-10 text-foreground" />
          </motion.div>
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-2xl md:text-3xl font-display mb-3"
        >
          Application Received!
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-foreground/60 text-sm max-w-sm mx-auto mb-6"
        >
          Thank you for your interest in joining our team. We'll review your application and get back to you soon.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="flex justify-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-foreground/30"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    );
  }


  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-foreground/50" />
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">
            Join Our Team
          </p>
        </div>
        <h3 className="text-2xl md:text-3xl font-display mb-2">
          Apply Now
        </h3>
        <p className="text-foreground/60 text-sm">
          Fill out the form below and we'll be in touch soon.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="you@email.com"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", formatPhoneNumber(e.target.value))}
              placeholder="(555) 555-5555"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => handleChange("instagram", e.target.value)}
              placeholder="@yourusername"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Experience *</label>
            <Select value={formData.experience} onValueChange={(value) => handleChange("experience", value)}>
              <SelectTrigger className="w-full h-11 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-2">0-2 years</SelectItem>
                <SelectItem value="2-5">2-5 years</SelectItem>
                <SelectItem value="5-10">5-10 years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Current Client Book *</label>
          <Select value={formData.clientBook} onValueChange={(value) => handleChange("clientBook", value)}>
            <SelectTrigger className="w-full h-11 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less-than-10">Less than 10</SelectItem>
              <SelectItem value="10-20">10-20 clients</SelectItem>
              <SelectItem value="20-30">20-30 clients</SelectItem>
              <SelectItem value="30-50">30-50 clients</SelectItem>
              <SelectItem value="50+">50+ clients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Your Specialties *</label>
          <textarea
            value={formData.specialties}
            onChange={(e) => handleChange("specialties", e.target.value)}
            placeholder="e.g., balayage, extensions, vivid colors..."
            rows={2}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-foreground/70 mb-1.5 block">Why Us? *</label>
          <textarea
            value={formData.whyJoinUs}
            onChange={(e) => handleChange("whyJoinUs", e.target.value)}
            placeholder="Tell us what excites you about joining our team..."
            rows={3}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-full px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors group disabled:opacity-50"
        >
          <span>{isSubmitting ? "Submitting..." : "Submit Application"}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}

// Join Team Card with dynamic column spanning and expanding form animation
function JoinTeamCardComponent({ 
  stylistCount, 
  isExpanded,
  onToggleExpand
}: { 
  stylistCount: number; 
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  // Calculate remaining spots for xl (4 cols)
  const remainderXl = stylistCount % 4;
  const spanXl = remainderXl === 0 ? 4 : 4 - remainderXl;
  
  // For lg (3 cols)
  const remainderLg = stylistCount % 3;
  const spanLg = remainderLg === 0 ? 3 : 3 - remainderLg;
  
  // For sm (2 cols)
  const remainderSm = stylistCount % 2;
  const spanSm = remainderSm === 0 ? 2 : 2 - remainderSm;

  // Use predefined classes based on calculated spans
  const getSpanClass = () => {
    const xlClass = spanXl === 4 ? 'xl:col-span-4' : spanXl === 3 ? 'xl:col-span-3' : spanXl === 2 ? 'xl:col-span-2' : 'xl:col-span-1';
    const lgClass = spanLg === 3 ? 'lg:col-span-3' : spanLg === 2 ? 'lg:col-span-2' : 'lg:col-span-1';
    const smClass = spanSm === 2 ? 'sm:col-span-2' : 'sm:col-span-1';
    
    return `col-span-1 ${smClass} ${lgClass} ${xlClass}`;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => {
      onToggleExpand();
    }, 0);
  };

  return (
    <div
      className={cn(
        getSpanClass(),
        "relative bg-muted/50 border border-foreground/15 rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300",
        isExpanded ? "min-h-auto" : "min-h-[300px]"
      )}
    >
      {!isExpanded ? (
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-foreground/50" />
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">
              Join Our Team
            </p>
          </div>
          <h3 className="text-2xl md:text-3xl font-display mb-3">
            Work With Us
          </h3>
          <p className="text-foreground/60 text-sm max-w-sm mx-auto mb-5">
            Passionate stylist looking for your next opportunity? We'd love to hear from you.
          </p>
          
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-2 text-sm font-sans font-medium text-foreground hover:text-foreground/70 transition-colors group"
          >
            <span>Apply now</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      ) : (
        <div className="w-full animate-fade-in">
          <ExpandedApplicationForm onClose={onToggleExpand} />
        </div>
      )}
      
      {/* Close button when expanded */}
      {isExpanded && (
        <button
          type="button"
          onClick={handleClick}
          className="absolute right-4 top-4 rounded-full p-2 bg-foreground/5 hover:bg-foreground/10 transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  );
}

const JoinTeamCard = memo(JoinTeamCardComponent);


export function StylistsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const isPreview = useIsEditorPreview();
  const [selectedLocation, setSelectedLocation] = useState<Location | "all">("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const { data: dbDisplayConfig } = useStylistsDisplayConfig();
  const displayConfig = useLiveOverride('section_stylists_display', dbDisplayConfig) ?? dbDisplayConfig ?? DEFAULT_STYLISTS_DISPLAY;
  const stylistsTitle = displayConfig?.section_title ?? DEFAULT_STYLISTS_DISPLAY.section_title;
  const stylistsDescription = displayConfig?.section_description ?? DEFAULT_STYLISTS_DISPLAY.section_description;
  const showStylistsTitle = displayConfig?.show_title ?? true;
  const showStylistsDescription = displayConfig?.show_description ?? true;

  // Fetch stylists from database
  const { data: dbStylists, isLoading: stylistsLoading } = useHomepageStylists();
  
  // Fetch sample cards setting
  const { data: settings } = useHomepageStylistsSettings();
  const showSampleCards = settings?.show_sample_cards ?? false;

  // Fetch specialty options from database
  const { data: specialtyOptionsData } = useSpecialtyOptions();

  // Fetch stylist levels from database
  const { data: dbLevels } = useStylistLevels();

  // Fetch level display mode from org settings
  const { data: levelDisplayMode } = useWebsiteLevelDisplayMode();

  // Resolve display label for a stylist's level based on display mode
  const resolveDisplayLabel = useCallback((rawLevel: string): string => {
    if (!dbLevels || dbLevels.length === 0 || levelDisplayMode !== 'custom_name') return rawLevel;
    const match = dbLevels.find(l => l.client_label === rawLevel || l.slug === rawLevel);
    return match ? match.label : rawLevel;
  }, [dbLevels, levelDisplayMode]);

  // Fetch locations from database
  const { data: dbLocations } = useActiveLocations();
  
  // Transform database stylists to match Stylist type
  const realStylists: Stylist[] = useMemo(() => {
    if (!dbStylists) return [];
    return dbStylists.map(s => ({
      id: s.id,
      name: s.full_name, // Always use full_name as the base name
      displayName: s.display_name || null, // Pass nickname separately
      instagram: s.instagram || "",
      tiktok: s.tiktok || undefined,
      preferred_social_handle: s.preferred_social_handle || undefined,
      level: s.stylist_level || "LEVEL 1 STYLIST",
      specialties: s.specialties || [],
      highlighted_services: s.highlighted_services || undefined,
      imageUrl: s.photo_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
      locations: (s.location_ids && s.location_ids.length > 0 ? s.location_ids : (s.location_id ? [s.location_id] : [])) as Location[],
      isBooking: s.is_booking ?? true,
      bio: s.bio || undefined,
      card_focal_x: s.card_focal_x ?? 50,
      card_focal_y: s.card_focal_y ?? 50,
      card_zoom: s.card_zoom ?? 1,
      card_rotation: s.card_rotation ?? 0,
    }));
  }, [dbStylists]);

  // Use sample stylists if toggle is on and no real stylists exist
  const stylists: Stylist[] = useMemo(() => {
    if (showSampleCards && realStylists.length === 0) {
      return sampleStylists;
    }
    return realStylists;
  }, [showSampleCards, realStylists]);

  // Use specialty options from database, ordered by display_order
  const allSpecialties = useMemo(() => {
    if (specialtyOptionsData && specialtyOptionsData.length > 0) {
      return specialtyOptionsData.map(opt => opt.name);
    }
    // Fallback: derive from stylists if no database options
    const specs = new Set<string>();
    stylists.forEach(s => s.specialties.forEach(spec => specs.add(spec)));
    return Array.from(specs).sort((a, b) => {
      if (a === "EXTENSIONS") return -1;
      if (b === "EXTENSIONS") return 1;
      return a.localeCompare(b);
    });
  }, [specialtyOptionsData, stylists]);
  
  // Merge database locations with static locations for tooltip info
  const locations = useMemo(() => {
    if (!dbLocations) return staticLocations.map(loc => ({ ...loc, address: '', city: '', hours: '' }));
    return staticLocations.map(staticLoc => {
      const dbLoc = dbLocations.find(db => db.id === staticLoc.id);
      return {
        ...staticLoc,
        address: dbLoc?.address || "",
        city: dbLoc?.city || "",
        hours: dbLoc?.hours || "Hours not available",
      };
    });
  }, [dbLocations]);

  // Listen for location filter events from LocationsSection
  useEffect(() => {
    const handleLocationFilter = (e: CustomEvent<{ location: Location | "all" }>) => {
      setSelectedLocation(e.detail.location);
      // Reset other filters when switching location
      setSelectedSpecialty(null);
      setSelectedLevel(null);
    };

    window.addEventListener('setLocationFilter', handleLocationFilter as EventListener);
    return () => {
      window.removeEventListener('setLocationFilter', handleLocationFilter as EventListener);
    };
  }, []);

  // Filter stylists - order is already set from admin panel or default sorting in the hook
  const filteredStylists = useMemo(() => {
    return stylists.filter((s) => {
      const matchesLocation = selectedLocation === "all" || s.locations.includes(selectedLocation as Location);
      const matchesSpecialty = !selectedSpecialty || s.specialties.includes(selectedSpecialty);
      const matchesLevel = !selectedLevel || s.level === selectedLevel;
      return matchesLocation && matchesSpecialty && matchesLevel;
    });
  }, [stylists, selectedLocation, selectedSpecialty, selectedLevel]);

  const handleToggleFormExpand = useCallback(() => {
    startTransition(() => {
      setIsFormExpanded(prev => !prev);
    });
  }, []);

  return (
    <section ref={sectionRef} id="stylists-section" data-theme="light" className="relative py-20 lg:py-32 bg-secondary overflow-visible pb-0">
      {/* Gradient transition from previous section */}
      <div 
        className="absolute top-0 left-0 right-0 h-24 sm:h-32 md:h-40 -translate-y-full pointer-events-none"
        style={{ 
          background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)' 
        }}
      />
      {/* Gradient fade at bottom of section */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 sm:h-52 md:h-64 pointer-events-none z-0"
        style={{ 
          background: 'linear-gradient(180deg, transparent 0%, hsl(var(--secondary)) 100%)' 
        }}
      />
      <div className="container mx-auto px-6">
        {/* Header */}
        <SectionHeader
          title="Meet our stylists"
          description="Our talented team of artists are ready to help you achieve your hair goals. Each stylist brings their own unique expertise and creative vision."
          align="center"
          className="mb-8"
          animate
          isInView={isInView}
        />

        <div className="text-center">
          <Eyebrow className="text-muted-foreground mb-4">
            VIEW STYLISTS BY LOCATION
          </Eyebrow>
          
          <TogglePill
            options={[
              { value: "all", label: "All", icon: <Info className="w-3.5 h-3.5" />, tooltip: "View all stylists from both locations" },
              ...locations.map(loc => ({
                value: loc.id,
                label: loc.name,
                icon: <Info className="w-3.5 h-3.5" />,
                tooltip: [loc.address, loc.city, loc.hours].filter(Boolean).join('\n') || loc.name,
              }))
            ]}
            value={selectedLocation}
            onChange={(val) => setSelectedLocation(val as Location | "all")}
            size="lg"
            variant="solid"
          />

          {/* Filters */}
          <div className="mt-8 flex flex-col gap-8 items-center">
            {/* Specialty Filter */}
            <div>
              <Eyebrow className="text-muted-foreground mb-4">
                VIEW BY SPECIALTY
              </Eyebrow>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedSpecialty(null)}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium border border-border rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                    selectedSpecialty === null 
                      ? "bg-foreground text-background" 
                      : "bg-background text-foreground"
                  )}
                >
                  All
                </button>
                {allSpecialties.map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => setSelectedSpecialty(specialty)}
                    className={cn(
                      "px-5 py-2.5 text-sm font-medium border border-border rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                      selectedSpecialty === specialty 
                        ? "bg-foreground text-background" 
                        : "bg-background text-foreground"
                    )}
                  >
                    {toTitleCase(specialty)}
                  </button>
                ))}
              </div>
            </div>

            {/* Level/Price Filter */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Eyebrow className="text-muted-foreground">
                  VIEW BY LEVEL & PRICE
                </Eyebrow>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-4 bg-background text-foreground border border-border">
                      <p className="font-medium mb-2">Stylist Level System</p>
                      <ul className="text-xs space-y-1.5 text-foreground/80">
                        {dbLevels?.map((level) => (
                          <li key={level.id}><span className="font-medium text-foreground">{level.client_label}:</span> {level.description || level.label}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">Higher levels reflect experience, training, and demand.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedLevel(null)}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium border border-border rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                    selectedLevel === null 
                      ? "bg-foreground text-background" 
                      : "bg-background text-foreground"
                  )}
                >
                  All Levels
                </button>
                {stylistLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={cn(
                      "px-5 py-2.5 text-sm font-medium border border-border rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                      selectedLevel === level.id 
                        ? "bg-foreground text-background" 
                        : "bg-background text-foreground"
                    )}
                  >
                    <span>{level.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedSpecialty || selectedLevel) && (
              <button
                onClick={() => {
                  setSelectedSpecialty(null);
                  setSelectedLevel(null);
                }}
                className="text-xs tracking-wide text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors animate-fade-in"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Specialty Notice */}
      <div className="container mx-auto px-6 mt-8">
        <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <span className="italic">Note:</span> Specialty badges indicate each stylist's preferred focus areas, not a comprehensive list. All our stylists provide excellent services across nearly every service type.
        </p>
      </div>

      {/* Stylists Grid */}
      <div className="container mx-auto px-6 mt-8">
        {filteredStylists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStylists.map((stylist) => (
              <StylistFlipCard key={stylist.id} stylist={stylist} index={0} selectedLocation={selectedLocation} levels={dbLevels} displayLabel={resolveDisplayLabel(stylist.level)} />
            ))}
            
            {/* Join Our Team Card - dynamically spans remaining columns */}
            <JoinTeamCard 
              stylistCount={filteredStylists.length} 
              isExpanded={isFormExpanded}
              onToggleExpand={handleToggleFormExpand}
            />
          </div>
        ) : (
          <div className="text-center py-16 px-6 animate-fade-in">
            <p className="text-lg text-muted-foreground">
              No stylists match your selected filters
            </p>
          </div>
        )}
      </div>


      {/* View All Link */}
      <div className="container mx-auto px-6 mt-10 text-center">
        <Link
          to="/stylists"
          className="inline-flex items-center gap-2 text-sm font-medium group"
        >
          <span className="link-underline">View all stylists</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
