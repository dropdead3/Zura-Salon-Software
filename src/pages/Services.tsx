import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Section } from "@/components/ui/section";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, UserPlus, ChevronDown, Star, CalendarX, Loader2 } from "lucide-react";
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useRef, useState, useEffect } from "react";
import { usePublicOrg } from "@/contexts/PublicOrgContext";
import { usePublicServicesForWebsite, type PublicStylistLevel, type PublicServiceItem, type PublicServiceCategory } from "@/hooks/usePublicServicesForWebsite";

const editorialEasing: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function StylistLevelSelector({ 
  selectedLevel, 
  onLevelChange,
  isSticky,
  levels
}: { 
  selectedLevel: string; 
  onLevelChange: (level: string) => void;
  isSticky: boolean;
  levels: PublicStylistLevel[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = levels.find(l => l.slug === selectedLevel);
  const selectedLabel = selectedItem?.label || 'New Talent';
  const selectedClientLabel = selectedItem?.clientLabel || 'Level 1';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 border rounded-full text-sm font-sans transition-all duration-300 ${
          isSticky 
            ? 'bg-white/10 text-white border-white/40 hover:border-white/60 hover:bg-white/15' 
            : 'bg-card text-foreground border-border hover:border-foreground/30'
        }`}
      >
        <span className={isSticky ? 'text-white/70' : 'text-muted-foreground'}>Service Pricing Level:</span>
        <span className={`font-medium ${isSticky ? 'text-white' : ''}`}>{selectedClientLabel} Stylist — {selectedLabel}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isSticky ? 'text-white/70' : 'text-muted-foreground'}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 min-w-full w-max bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
            >
              {levels.map((level) => (
                <button
                  key={level.slug}
                  onClick={() => {
                    onLevelChange(level.slug);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-sans transition-colors duration-200 ${
                    selectedLevel === level.slug 
                      ? 'bg-foreground text-background' 
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <span>{level.clientLabel} Stylist — {level.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceCard({ 
  service, 
  index, 
  selectedLevel,
  isAddOn = false,
  isConsultation = false
}: { 
  service: PublicServiceItem; 
  index: number;
  selectedLevel: string;
  isAddOn?: boolean;
  isConsultation?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const price = service.prices[selectedLevel];
  const hasPrice = price !== null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05, ease: editorialEasing }}
      className="group relative"
    >
      {service.isPopular && (
        <div className="absolute -top-2 left-4 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-display tracking-wider uppercase rounded-full">
            <Star size={10} className="fill-current" />
            Popular
          </span>
        </div>
      )}
      <div className={`p-5 lg:p-6 bg-card border border-border rounded-xl transition-all duration-500 hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 ${!hasPrice ? 'opacity-50' : ''} ${service.isPopular ? 'border-primary/30' : ''}`}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-display text-sm lg:text-base text-foreground leading-tight tracking-wide">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-xs text-muted-foreground mt-1.5 font-sans font-light leading-relaxed">
                  {service.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center shrink-0">
              {hasPrice ? (
                <span className="font-display text-sm text-foreground">
                  {isAddOn ? price : `${price}+`}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  —
                </span>
              )}
            </div>
          </div>
          {isConsultation && (
            <a
              href="#book-consult"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-display tracking-[0.1em] uppercase rounded-full transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02]"
            >
              Book Consult
              <ArrowRight size={12} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CategorySection({ 
  category, 
  categoryIndex,
  selectedLevel 
}: { 
  category: PublicServiceCategory; 
  categoryIndex: number;
  selectedLevel: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Sort items so popular services appear first
  const sortedItems = [...category.items].sort((a, b) => {
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;
    return 0;
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, ease: editorialEasing }}
      className="scroll-mt-32"
      id={category.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}
    >
      {/* Category Header */}
      <div className="mb-10 lg:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: editorialEasing }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-border"
        >
          <div>
            <Eyebrow className="text-muted-foreground mb-3">
              {category.category === "New-Client Consultations" ? "New-Client" : String(categoryIndex + 1).padStart(2, '0')}
            </Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight">
              {category.category === "New-Client Consultations" ? "Consultations" : category.category}
            </h2>
          </div>
          {category.description && (
            <p className="text-muted-foreground font-sans font-light max-w-md lg:text-right">
              {category.description}
            </p>
          )}
        </motion.div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {sortedItems.map((service, index) => (
          <ServiceCard 
            key={service.name} 
            service={service} 
            index={index}
            selectedLevel={selectedLevel}
            isAddOn={category.isAddOn}
            isConsultation={category.category === "New-Client Consultations"}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Services() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const { organization } = usePublicOrg();
  const { categories, levels, isLoading } = usePublicServicesForWebsite(organization?.id);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const stickyRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  // Set default level once loaded
  useEffect(() => {
    if (levels.length > 0 && !selectedLevel) {
      setSelectedLevel(levels[0].slug);
    }
  }, [levels, selectedLevel]);

  // Detect when sticky bar is in sticky state
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        const rect = stickyRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 121);
      }
    };
    
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <DashboardLoader size="lg" className="min-h-screen" />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Hair Services - Color, Extensions, Cutting & Treatments"
        description="Explore our luxury hair services including custom color, blonding, extensions, precision cuts, and restorative treatments. Book your transformation today."
      />
      
      {/* Hero */}
      <section ref={heroRef} className="pt-32 lg:pt-40 pb-8 lg:pb-12" data-theme="light">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: editorialEasing }}
            >
              <Eyebrow className="text-muted-foreground mb-6">
                Our Services
              </Eyebrow>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: editorialEasing }}
              className="font-display text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.05] mb-8"
            >
              Services &<br />
              Experiences
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2, ease: editorialEasing }}
              className="text-lg md:text-xl text-muted-foreground font-sans font-light max-w-2xl leading-relaxed"
            >
              Every appointment begins with intention and ends with transformation. 
              Explore our full menu of services designed to elevate your look.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stylist Level Selector - Sticky */}
      {levels.length > 0 && (
        <div 
          ref={stickyRef}
          className={`sticky top-[120px] z-30 py-4 transition-all duration-500 ${
            isSticky 
              ? 'bg-[#2a2a2a] shadow-lg' 
              : 'bg-background/95 backdrop-blur-md'
          }`}
        >
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.25, ease: editorialEasing }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
            >
              <AnimatePresence>
                {isSticky && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: editorialEasing }}
                    className="hidden lg:block text-sm font-display tracking-wide text-white/90"
                  >
                    See prices based on the stylist
                  </motion.span>
                )}
              </AnimatePresence>
              
              <StylistLevelSelector 
                selectedLevel={selectedLevel}
                onLevelChange={setSelectedLevel}
                isSticky={isSticky}
                levels={levels}
              />
              <p className={`text-sm font-sans flex-shrink-0 transition-colors duration-300 ${isSticky ? 'text-white/70' : 'text-muted-foreground'}`}>
                <span className={`font-medium transition-colors duration-300 ${isSticky ? 'text-white' : 'text-foreground'}`}>Pricing varies by stylist level</span>
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* New Client Notice */}
      <section className="pb-8 lg:pb-12">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: editorialEasing }}
            className="max-w-4xl"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8">
              <p className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] uppercase text-primary mb-3">
                <UserPlus size={14} />
                New Clients
              </p>
              <p className="font-sans text-base md:text-lg text-foreground/80 leading-relaxed mb-4">
                All new clients must request a <span className="text-foreground font-medium">New-Client Consultation</span> to match you with the stylist most skilled for your desired service — and to understand your current look and how to best achieve your vision.
              </p>
              <a
                href="#book-consult"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-display text-xs tracking-[0.15em] uppercase text-primary hover:text-primary/80 transition-colors"
              >
                Request Consultation
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Navigation Pills */}
      <section className="pb-16 lg:pb-24">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4, ease: editorialEasing }}
            className="flex flex-wrap gap-3"
          >
            {categories.map((category, index) => (
              <a
                key={category.category}
                href={`#${category.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
                className="group inline-flex items-center gap-2 px-5 py-3 text-sm font-sans text-foreground bg-card border border-border rounded-full transition-all duration-300 hover:bg-foreground hover:text-background hover:border-foreground hover:scale-105"
              >
                <span className="text-xs text-muted-foreground group-hover:text-background/70 font-display">{String(index + 1).padStart(2, '0')}</span>
                {category.category}
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <Section className="pt-0 pb-24 lg:pb-32" theme="light">
        <div className="space-y-24 lg:space-y-32">
          {categories.map((category, categoryIndex) => (
            <CategorySection 
              key={category.category} 
              category={category} 
              categoryIndex={categoryIndex}
              selectedLevel={selectedLevel}
            />
          ))}
        </div>
      </Section>

      {/* Policy Note */}
      <Section className="bg-secondary py-16 lg:py-20" theme="light">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={32} className="mx-auto mb-6 text-foreground/30" />
          <h3 className="font-display text-xl md:text-2xl text-foreground mb-6">
            Before you book, check our policies.
          </h3>
          <div className="space-y-3 mb-8">
            <p className="flex items-center justify-center gap-2 text-lg font-sans font-medium text-foreground">
              <CalendarX size={20} className="text-primary" />
              Walk-ins not accepted.
            </p>
            <p className="text-lg font-sans font-light text-foreground/80">
              Services are by appointment only.
            </p>
            <p className="text-lg font-sans font-light text-foreground/80">
              Typically we can schedule you in within 1 business day.
            </p>
          </div>
          <Link
            to="/policies"
            className="text-sm font-sans font-medium text-foreground link-underline"
          >
            View our policies <ArrowRight size={14} className="inline-block ml-1" />
          </Link>
        </div>
      </Section>

    </Layout>
  );
}
