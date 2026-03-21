import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, X, ChevronLeft, ChevronRight, Star, Award, Users, Clock, Check, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Section } from "@/components/ui/section";
import { BeforeAfterSlider } from "@/components/home/BeforeAfterSlider";
import { ExtensionReviewsSection } from "@/components/home/ExtensionReviewsSection";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { getExtensionSpecialists } from "@/data/stylists";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Transformation gallery data
const transformations = [
  {
    id: 1,
    beforeImage: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=750&fit=crop",
    afterImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=750&fit=crop",
    title: "Volume & Length",
    description: "Added 18 inches of seamless extensions for dramatic length and volume"
  },
  {
    id: 2,
    beforeImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=750&fit=crop",
    afterImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=750&fit=crop",
    title: "Natural Blending",
    description: "Subtle extensions for thickness without added length"
  },
  {
    id: 3,
    beforeImage: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=750&fit=crop",
    afterImage: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&h=750&fit=crop",
    title: "Color & Extensions",
    description: "Custom color matching with dimensional highlights"
  },
  {
    id: 4,
    beforeImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=750&fit=crop",
    afterImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=750&fit=crop",
    title: "Full Transformation",
    description: "Complete length transformation with balayage"
  }
];

// Extension benefit cards
const extensionBenefits = [
  {
    title: "Instant Volume",
    description: "Increase volume with seamless, lightweight extensions that blend naturally and boost your hair's fullness in just one appointment.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=500&fit=crop"
  },
  {
    title: "Instant Length",
    description: "Get the hair of your dreams by achieving instant length with our custom extensions—designed to add inches and impact without the wait.",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=500&fit=crop"
  },
  {
    title: "Damage-Free",
    description: "Enjoy damage-free extensions with our signature method, designed to protect your natural hair while enhancing your look.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop"
  }
];

// Extension-specific FAQs
const extensionFaqs = [
  {
    question: "How long do hair extensions last?",
    answer: "With proper care and regular maintenance appointments every 6-8 weeks, our extensions typically last 6-12 months. The longevity depends on your hair type, lifestyle, and how well you follow our care instructions."
  },
  {
    question: "Will extensions damage my natural hair?",
    answer: "When installed and maintained properly by our certified stylists, our method is designed to be completely damage-free. Our hidden beaded row technique distributes weight evenly and doesn't use heat, glue, or harsh chemicals."
  },
  {
    question: "How long does the installation process take?",
    answer: "A full extension installation typically takes 2-3 hours. This includes custom color matching, sectioning, and precise placement to ensure the most natural-looking results."
  },
  {
    question: "Can I color my extensions?",
    answer: "Yes! Our premium human hair extensions can be colored, but we recommend having this done at the salon by one of our stylists to ensure the best results and maintain the integrity of the hair."
  },
  {
    question: "What maintenance is required?",
    answer: "We recommend maintenance appointments every 6-8 weeks to move up the rows as your natural hair grows. Daily care includes gentle brushing with a loop brush, using sulfate-free products, and braiding hair before bed."
  },
  {
    question: "Do I need a consultation before getting extensions?",
    answer: "Yes, a consultation is required for all new extension clients. This allows us to assess your hair health, discuss your goals, color match, and create a customized plan for your perfect look."
  },
  {
    question: "What is our signature method?",
    answer: "Our signature method is a proprietary hidden beaded row technique. It's the most versatile and comfortable extension method available, featuring invisible rows that lay completely flat against your scalp with zero tension or damage."
  },
  {
    question: "How much do extensions cost?",
    answer: "Extension pricing varies based on the amount of hair needed, desired length, and your specific goals. After your consultation, we'll provide a detailed quote. Investment typically ranges from $800-$2500 for a full install."
  }
];

// Animated Social Proof Section Component
function SocialProofSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });
  
  const rating = useCounterAnimation({ end: 4.9, duration: 2200, decimals: 1 });
  const reviews = useCounterAnimation({ end: 500, duration: 2600 });
  const transformations = useCounterAnimation({ end: 2000, duration: 3000 });
  const years = useCounterAnimation({ end: 10, duration: 1800 });

  return (
    <section ref={sectionRef} className="py-8 border-b border-border bg-background">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm"
        >
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={isInView ? { opacity: 1 } : { opacity: 0.3 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.3 + i * 0.15,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={isInView ? { scale: 1 } : { scale: 0.5 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: 0.3 + i * 0.15,
                      ease: [0.34, 1.56, 0.64, 1]
                    }}
                  >
                    <Star className="w-4 h-4 fill-foreground text-foreground" />
                  </motion.div>
                </motion.div>
              ))}
            </div>
            <span ref={rating.ref} className="text-foreground font-medium tabular-nums">
              {rating.count}
            </span>
            <span className="text-muted-foreground">
              (<span ref={reviews.ref} className="tabular-nums">{reviews.count}</span>+ reviews)
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span ref={transformations.ref} className="font-medium text-foreground tabular-nums">
              {transformations.count}+
            </span>
            <span>transformations</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span ref={years.ref} className="font-medium text-foreground tabular-nums">
              {years.count}+
            </span>
            <span>years experience</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className="font-medium text-foreground">Certified</span>
            <span>Certified Method</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// Extension Specialists Carousel Component
function ExtensionSpecialistsCarousel() {
  const extensionSpecialists = getExtensionSpecialists();
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % extensionSpecialists.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + extensionSpecialists.length) % extensionSpecialists.length);
  };

  return (
    <Section className="bg-oat/10 overflow-hidden">
      <div className="text-center mb-12">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display block mb-4"
        >
          Our Team
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground"
        >
          Extension Specialists
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-muted-foreground max-w-xl mx-auto"
        >
          Our certified stylists have mastered the extension method with years of specialized training.
        </motion.p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-8">
        {extensionSpecialists.map((stylist, index) => (
          <motion.div
            key={stylist.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group"
          >
            <div className="aspect-[3/4] overflow-hidden bg-secondary mb-4 relative">
              <img 
                src={stylist.imageUrl} 
                alt={stylist.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {stylist.specialties.filter(s => s === "EXTENSIONS").map((specialty) => (
                  <span key={specialty} className="text-xs bg-oat text-oat-foreground px-2 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs tracking-[0.15em] text-muted-foreground">{stylist.level}</span>
            </div>
            <h3 className="font-serif text-xl mb-1">{stylist.name}</h3>
            <a 
              href={`https://instagram.com/${stylist.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {stylist.instagram}
            </a>
            <div className="flex flex-wrap gap-2 mt-3">
              {stylist.specialties.slice(0, 3).map((specialty) => (
                <span key={specialty} className="text-xs bg-secondary px-2 py-1">
                  {specialty}
                </span>
              ))}
            </div>
            <Link
              to="/booking"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors group/btn"
            >
              <span>Book Consultation</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Mobile/Tablet Carousel */}
      <div className="lg:hidden relative">
        <div className="overflow-hidden" ref={carouselRef}>
          <motion.div 
            className="flex"
            animate={{ x: `-${currentIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {extensionSpecialists.map((stylist) => (
              <div key={stylist.id} className="w-full flex-shrink-0 px-4">
                <div className="max-w-sm mx-auto">
                  <div className="aspect-[3/4] overflow-hidden bg-secondary mb-4 relative">
                    <img 
                      src={stylist.imageUrl} 
                      alt={stylist.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className="text-xs bg-oat text-oat-foreground px-2 py-1 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        EXTENSIONS
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs tracking-[0.15em] text-muted-foreground">{stylist.level}</span>
                  </div>
                  <h3 className="font-serif text-xl mb-1">{stylist.name}</h3>
                  <a 
                    href={`https://instagram.com/${stylist.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {stylist.instagram}
                  </a>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {stylist.specialties.slice(0, 3).map((specialty) => (
                      <span key={specialty} className="text-xs bg-secondary px-2 py-1">
                        {specialty}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/booking"
                    className="mt-4 inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
                  >
                    <span>Book Consultation</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prevSlide}
            className="w-12 h-12 border border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
            aria-label="Previous stylist"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {extensionSpecialists.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-foreground' : 'bg-foreground/30'
                }`}
                aria-label={`Go to stylist ${index + 1}`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            className="w-12 h-12 border border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
            aria-label="Next stylist"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Section>
  );
}

export default function Extensions() {
  const heroRef = useRef(null);
  const benefitsRef = useRef(null);
  const specialtyRef = useRef(null);
  const faqRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-100px" });
  const specialtyInView = useInView(specialtyRef, { once: true, margin: "-100px" });
  const faqInView = useInView(faqRef, { once: true, margin: "-100px" });
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return extensionFaqs;
    const query = searchQuery.toLowerCase();
    return extensionFaqs.filter(
      faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-oat text-foreground px-1 py-0.5 rounded font-medium animate-pulse">
          {part}
        </mark>
      ) : part
    );
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % transformations.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + transformations.length) % transformations.length);
  };

  return (
    <Layout>
      <SEO 
        title="Hair Extensions - Luxury Extension Services"
        description="Experience luxury hair extensions with our signature method. Instant volume, instant length, damage-free extensions. Book your consultation today."
      />

      {/* Hero Section - Full Width Parallax */}
      <section ref={heroRef} className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden">
        {/* Parallax Background Image */}
        <motion.div 
          className="absolute inset-0 w-full h-[120%] -top-[10%]"
          style={{
            y: useTransform(useScroll().scrollY, [0, 1000], [0, 300])
          }}
        >
          <img 
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&h=1200&fit=crop"
            alt="Luxury hair extensions"
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Centered Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-6 lg:px-12 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal tracking-tight text-white leading-[1.1] max-w-4xl mx-auto"
            >
              Luxury extension services
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="mt-6 text-base md:text-lg text-white/80 font-sans font-light max-w-xl mx-auto leading-relaxed"
            >
              Our salon built its foundations upon our hair extension knowledge and proprietary extension products, delivering incredible results with a quality guarantee.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/booking"
                className="group inline-flex items-center gap-3 bg-white text-foreground px-8 py-4 text-sm font-sans font-normal hover:bg-white/90 transition-all duration-300"
              >
                <span>Book your consultation</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="#packages"
                className="group inline-flex items-center gap-3 border border-white text-white px-8 py-4 text-sm font-sans font-normal hover:bg-white hover:text-foreground transition-all duration-300"
              >
                <span>View packages</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof - Minimal Inline with Animated Counters */}
      <SocialProofSection />

      <section className="py-5 border-y border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <p className="text-foreground font-medium text-center">
              New clients can save 15% off their first extension install service! Present code <span className="font-medium">NEWCLIENT15</span> at checkout.
            </p>
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>New Client Discount Code</title>
                        <style>
                          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                          .coupon { background: white; border: 3px dashed #333; padding: 40px 60px; text-align: center; max-width: 400px; }
                          .logo { font-size: 24px; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 20px; }
                          .discount { font-size: 32px; font-weight: bold; color: #333; margin: 20px 0; }
                          .code { font-size: 28px; font-weight: bold; background: #f0f0f0; padding: 15px 30px; border-radius: 8px; letter-spacing: 0.15em; margin: 20px 0; display: inline-block; }
                          .details { font-size: 14px; color: #666; margin-top: 20px; line-height: 1.6; }
                          .valid { font-size: 12px; color: #999; margin-top: 15px; }
                        </style>
                      </head>
                      <body>
                        <div class="coupon">
                          <div class="logo">INDIGO HAIR CO.</div>
                          <div class="discount">15% OFF</div>
                          <p>Your First Extension Install Service</p>
                          <div class="code">NEWCLIENT15</div>
                          <div class="details">Present this coupon at checkout to redeem your new client discount.</div>
                          <div class="valid">Valid for first-time extension clients only. Cannot be combined with other offers.</div>
                        </div>
                        <script>window.onload = function() { window.print(); }</script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              className="inline-flex items-center px-6 py-2.5 border border-foreground text-foreground text-sm font-sans font-normal hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Print code here
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Cards Section */}
      <Section sectionRef={benefitsRef} className="bg-background">
        {/* Header - moved from We Specialize section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-[1.1] mb-6">
            We specialize in dream hair...
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Looking for the best hair extensions? Our certified stylists use our signature method to deliver seamless results that look and feel 100% natural.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {extensionBenefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 40 }}
              animate={benefitsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="group relative overflow-hidden cursor-pointer"
            >
              {/* Full Background Image */}
              <div className="aspect-[16/9] relative">
                <img 
                  src={benefit.image}
                  alt={benefit.title}
                  className="absolute inset-0 w-full h-full object-cover object-right transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Gradient Overlay - stronger on left for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent transition-opacity duration-500" />
                
                {/* Content - aligned to top for consistent positioning */}
                <div className="absolute inset-0 p-6 flex flex-col justify-start text-white">
                  {/* Number + Title - full width */}
                  <motion.div 
                    className="flex items-center gap-3 mb-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={benefitsInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                  >
                    <div className="w-8 h-8 rounded-full border border-white/50 flex items-center justify-center flex-shrink-0 backdrop-blur-sm bg-white/10">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl font-medium">
                      {benefit.title}
                    </h3>
                  </motion.div>
                  
                  {/* Description - left side weighted */}
                  <motion.p 
                    className="text-sm text-white/80 leading-relaxed w-[55%]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={benefitsInView ? { opacity: 0.8, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.15 }}
                  >
                    {benefit.description}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>


      {/* Maintenance Timeline Section */}
      <Section className="bg-secondary/30 overflow-hidden">
        <div className="text-center mb-16 lg:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground"
          >
            Your Extension Journey
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-muted-foreground max-w-xl mx-auto"
          >
            From installation to maintenance, here's what to expect.
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line - desktop */}
          <div className="hidden lg:block absolute top-6 left-[10%] right-[10%] h-px bg-border" />
          
          {/* Connecting line - mobile/tablet vertical */}
          <div className="lg:hidden absolute top-0 bottom-0 left-6 w-px bg-border" />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
            {/* Day 1 - Consultation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative pl-16 lg:pl-0 py-8 lg:py-0 lg:text-center"
            >
              {/* Timeline dot */}
              <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-8 lg:top-0 w-5 h-5 rounded-full bg-foreground border-4 border-background shadow-sm z-10" />
              
              <div className="lg:pt-12">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">Day 1</span>
                <h3 className="font-serif text-lg mb-2">Consultation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Initial extension consultation to assess your hair and discuss your goals.
                </p>
              </div>
            </motion.div>

            {/* Next Week - Installation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative pl-16 lg:pl-0 py-8 lg:py-0 lg:text-center"
            >
              {/* Timeline dot */}
              <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-8 lg:top-0 w-5 h-5 rounded-full bg-foreground border-4 border-background shadow-sm z-10" />
              
              <div className="lg:pt-12">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">Next Week</span>
                <h3 className="font-serif text-lg mb-2">Installation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Full installation with custom color matching, toning, and blending.
                </p>
              </div>
            </motion.div>

            {/* Week 6 - First Maintenance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative pl-16 lg:pl-0 py-8 lg:py-0 lg:text-center"
            >
              {/* Timeline dot - highlighted */}
              <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-8 lg:top-0 w-5 h-5 rounded-full bg-foreground border-4 border-background shadow-sm z-10 ring-4 ring-foreground/10" />
              
              <div className="lg:pt-12">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">Week 6</span>
                <h3 className="font-serif text-lg mb-2">First Maintenance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  We move up your rows as your natural hair grows.
                </p>
                <span className="text-xs font-medium text-foreground bg-oat/40 px-3 py-1 inline-block">
                  $150 – $300
                </span>
              </div>
            </motion.div>

            {/* 12+ Months - Fresh Set */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative pl-16 lg:pl-0 py-8 lg:py-0 lg:text-center"
            >
              {/* Timeline dot */}
              <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-8 lg:top-0 w-5 h-5 rounded-full bg-oat border-4 border-background shadow-sm z-10" />
              
              <div className="lg:pt-12">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">12+ Months</span>
                <h3 className="font-serif text-lg mb-2">Fresh Set</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  Hair lasts 12+ months with proper care, fully warrantied against defects.
                </p>
              </div>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-16 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-sm font-sans font-normal hover:bg-foreground/90 transition-all duration-300"
            >
              <span>Schedule consultation</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 border border-foreground text-foreground px-8 py-4 text-sm font-sans font-normal hover:bg-foreground hover:text-background transition-all duration-300"
            >
              <span>Book maintenance</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* Gallery Section - 4 Before/After Sliders */}
      <Section sectionRef={specialtyRef} className="bg-background">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={specialtyInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-[1.1] mb-6">
            You'll have to see it to believe it
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Real transformations from our salon. Hover over each image to compare the before and after results of our signature extension work.
          </p>
        </motion.div>

        {/* Mobile Carousel */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden">
            <motion.div 
              className="flex gap-4"
              drag="x"
              dragConstraints={{ left: -((transformations.length - 1) * 280), right: 0 }}
              style={{ cursor: 'grab' }}
            >
              {transformations.map((transformation, index) => (
                <motion.div
                  key={transformation.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={specialtyInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, delay: index * 0.1 }}
                  className="flex-shrink-0 w-[280px]"
                >
                  <BeforeAfterSlider
                    beforeImage={transformation.beforeImage}
                    afterImage={transformation.afterImage}
                    beforeLabel="BEFORE"
                    afterLabel="AFTER"
                    className="aspect-[3/4]"
                    hideDefaultVideoButton={true}
                    hoverMode={true}
                  />
                  <div className="mt-3 text-center">
                    <h3 className="font-serif text-lg font-medium text-foreground">
                      {transformation.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {transformation.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            <p className="text-center text-xs text-muted-foreground mt-4">← Swipe to see more →</p>
          </div>
        </div>

        {/* Desktop Grid - 4 Before/After Sliders */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {transformations.map((transformation, index) => (
            <motion.div
              key={transformation.id}
              initial={{ opacity: 0, y: 40 }}
              animate={specialtyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="group"
            >
              <BeforeAfterSlider
                beforeImage={transformation.beforeImage}
                afterImage={transformation.afterImage}
                beforeLabel="BEFORE"
                afterLabel="AFTER"
                className="aspect-[3/4]"
                hideDefaultVideoButton={true}
                hoverMode={true}
              />
              <div className="mt-3 text-center">
                <h3 className="font-serif text-lg font-medium text-foreground">
                  {transformation.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {transformation.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Are Extensions Right For You? Checklist */}
      <Section className="bg-oat/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans block mb-4"
            >
              Find Out
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground"
            >
              Are Extensions Right For You?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 text-muted-foreground max-w-xl mx-auto"
            >
              If you check off most of these, you're the perfect candidate for extensions.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "You want longer hair but don't want to wait years to grow it",
              "You have fine or thin hair and want more volume and fullness",
              "You're tired of hair that won't grow past a certain length",
              "You want to add dimension or color without damaging your natural hair",
              "You have a special event coming up and want a dramatic transformation",
              "You're ready to invest in yourself and feel confident every day",
              "You want versatile styling options—updos, ponytails, and braids",
              "You've tried other methods and want something more comfortable and natural"
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-start gap-4 bg-background p-4 border border-border"
              >
                <div className="w-6 h-6 border-2 border-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-foreground" />
                </div>
                <p className="text-sm leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-10"
          >
            <p className="text-muted-foreground mb-6">
              Sound like you? Let's make it happen.
            </p>
            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-sm font-sans font-normal hover:bg-foreground/90 transition-all duration-300"
            >
              <span>Book your consultation</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* Extension Pricing Section */}
      <Section className="bg-secondary/30">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans block mb-4"
          >
            Investment
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground"
          >
            Extension Packages
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-muted-foreground max-w-xl mx-auto"
          >
            Pricing varies based on desired length, volume, and hair type. A consultation is required for an accurate quote.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Volume Package */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-background border border-border p-8 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="font-serif text-2xl mb-2">Volume</h3>
              <p className="text-sm text-muted-foreground">Perfect for adding thickness and body without extra length</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-serif">$800</span>
              <span className="text-muted-foreground"> - $1,200</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>1-2 rows of extensions</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>Adds fullness & density</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>Custom color matching</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>2-hour appointment</span>
              </li>
            </ul>
            <Link
              to="/booking"
              className="w-full py-3.5 border border-foreground text-foreground text-sm font-sans text-center hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Book consultation
            </Link>
          </motion.div>

          {/* Length + Volume Package - Featured */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-foreground text-background p-8 flex flex-col relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-oat text-oat-foreground px-4 py-1.5 text-xs uppercase tracking-[0.15em] font-display">
              Most Popular
            </div>
            <div className="mb-6">
              <h3 className="font-serif text-2xl mb-2">Length + Volume</h3>
              <p className="text-sm text-background/70">Our most requested package for dramatic transformations</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-serif">$1,400</span>
              <span className="text-background/70"> - $2,000</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-oat rounded-full mt-1.5 flex-shrink-0" />
                <span>2-3 rows of extensions</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-oat rounded-full mt-1.5 flex-shrink-0" />
                <span>Up to 18" added length</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-oat rounded-full mt-1.5 flex-shrink-0" />
                <span>Maximum volume & fullness</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-oat rounded-full mt-1.5 flex-shrink-0" />
                <span>Custom color matching & blending</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-oat rounded-full mt-1.5 flex-shrink-0" />
                <span>3-hour appointment</span>
              </li>
            </ul>
            <Link
              to="/booking"
              className="w-full py-3.5 bg-oat text-oat-foreground text-sm font-sans text-center hover:bg-oat/90 transition-all duration-300"
            >
              Book consultation
            </Link>
          </motion.div>

          {/* Full Transformation Package */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-background border border-border p-8 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="font-serif text-2xl mb-2">Full Transformation</h3>
              <p className="text-sm text-muted-foreground">Complete hair makeover with color and extensions</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-serif">$2,000</span>
              <span className="text-muted-foreground"> - $3,000+</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>3-4 rows of extensions</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>Up to 22" added length</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>Includes color service</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>Custom blending & styling</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span>4-5 hour appointment</span>
              </li>
            </ul>
            <Link
              to="/booking"
              className="w-full py-3.5 border border-foreground text-foreground text-sm font-sans text-center hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Book consultation
            </Link>
          </motion.div>
        </div>

        {/* Maintenance Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-6 flex-wrap justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-oat rounded-full" />
              <span>Maintenance: $150-$300 every 6-8 weeks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-oat rounded-full" />
              <span>Hair lasts 12+ months with proper care, fully warrantied against defects</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Signature Method Benefits Section */}
      <Section className="bg-background">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans block mb-4"
          >
            Why Choose Us
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground"
          >
            The Difference
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-muted-foreground max-w-2xl mx-auto"
          >
            Our signature method delivers the best results with zero compromise.
          </motion.p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Zero Damage",
              description: "Our hidden beaded row technique uses no heat, glue, or chemicals—protecting your natural hair completely."
            },
            {
              title: "Completely Invisible",
              description: "Extensions lay flat against your scalp with hidden attachment points that are undetectable, even in updos."
            },
            {
              title: "Heat-Free Application",
              description: "No damaging heat tools are used during installation, preserving the integrity of your natural hair."
            },
            {
              title: "Wear Hair Up Freely",
              description: "Style your hair any way you like—ponytails, braids, updos—with complete confidence and no visible bonds."
            },
            {
              title: "6-8 Week Maintenance",
              description: "Longer time between appointments means less time in the chair and more time enjoying your beautiful hair."
            },
            {
              title: "Exceptional Comfort",
              description: "Lightweight construction and flat-laying rows mean all-day comfort without tension or headaches."
            }
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-secondary/30 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="bg-foreground text-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-background/60 font-sans block mb-4">
              The Process
            </span>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight leading-[1.1] mb-6">
              What's Included
            </h2>
            <p className="text-background/70 leading-relaxed mb-8">
              Every extension journey begins with a $15 consultation. Here's what you can expect when you book with us.
            </p>
            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 bg-oat text-oat-foreground px-8 py-4 text-sm font-sans font-normal hover:bg-oat/90 transition-all duration-300"
            >
              <span>Schedule consultation</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right - Process Steps */}
          <div className="space-y-0">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="border-b border-background/20 py-6 first:pt-0"
            >
              <div className="flex gap-6">
                <span className="text-oat font-serif text-2xl">01</span>
                <div>
                  <h3 className="font-medium text-lg mb-2">Hair Assessment</h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    We evaluate your hair's health, texture, and current condition to ensure extensions are right for you and determine the best method.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="border-b border-background/20 py-6"
            >
              <div className="flex gap-6">
                <span className="text-oat font-serif text-2xl">02</span>
                <div>
                  <h3 className="font-medium text-lg mb-2">Color Matching</h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    Our stylists custom match your hair color using our premium swatches, ensuring a seamless, natural blend.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border-b border-background/20 py-6"
            >
              <div className="flex gap-6">
                <span className="text-oat font-serif text-2xl">03</span>
                <div>
                  <h3 className="font-medium text-lg mb-2">Goal Setting</h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    We discuss your desired length, volume, and overall look. Together, we'll create a customized plan tailored to your lifestyle.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="border-b border-background/20 py-6"
            >
              <div className="flex gap-6">
                <span className="text-oat font-serif text-2xl">04</span>
                <div>
                  <h3 className="font-medium text-lg mb-2">Investment Quote</h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    You'll receive a detailed quote based on your specific needs, including hair cost, installation, and recommended maintenance schedule.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="py-6"
            >
              <div className="flex gap-6">
                <span className="text-oat font-serif text-2xl">05</span>
                <div>
                  <h3 className="font-medium text-lg mb-2">Care Education</h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    Before you leave, we'll walk you through proper care techniques, recommended products, and what to expect during your extension journey.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>
      {/* Extension Care Section */}
      <Section className="bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans block mb-4">
              Aftercare
            </span>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-[1.1] mb-6">
              Extension Care
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Proper care ensures your extensions last longer and look beautiful every day. Follow these essential tips to maintain your investment.
            </p>
            <div className="bg-oat/30 p-6">
              <h4 className="font-medium mb-3">Recommended Products</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We carry a curated selection of extension-safe products in our salon, including sulfate-free shampoos, nourishing conditioners, and heat protectants specifically formulated for extensions.
              </p>
            </div>
          </motion.div>

          {/* Right - Care Tips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tip 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">1</span>
              </div>
              <h3 className="font-medium mb-2">Brush Daily</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use a loop brush or wide-tooth comb, starting from the ends and working up. Brush 2-3 times daily to prevent tangling.
              </p>
            </motion.div>

            {/* Tip 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">2</span>
              </div>
              <h3 className="font-medium mb-2">Sulfate-Free Products</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Always use sulfate-free shampoo and conditioner. Sulfates strip the hair of moisture and can cause extensions to dry out and tangle.
              </p>
            </motion.div>

            {/* Tip 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">3</span>
              </div>
              <h3 className="font-medium mb-2">Braid Before Bed</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sleep with your hair in a loose braid or silk bonnet to prevent matting and tangling while you sleep.
              </p>
            </motion.div>

            {/* Tip 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">4</span>
              </div>
              <h3 className="font-medium mb-2">Heat Protection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Always apply heat protectant before styling. Keep heat tools below 350°F to preserve the integrity of your extensions.
              </p>
            </motion.div>

            {/* Tip 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">5</span>
              </div>
              <h3 className="font-medium mb-2">Wash Properly</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Wash in a downward motion, never scrubbing. Focus shampoo on the scalp and conditioner on the mid-lengths to ends.
              </p>
            </motion.div>

            {/* Tip 6 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="bg-secondary/50 p-6"
            >
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center mb-4">
                <span className="font-serif text-lg">6</span>
              </div>
              <h3 className="font-medium mb-2">Regular Maintenance</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Book move-up appointments every 6-8 weeks. This keeps extensions secure and your natural hair healthy.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Meet Our Extension Specialists - Carousel */}
      <ExtensionSpecialistsCarousel />

      {/* Recommended Products Section */}
      <Section className="bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-sans block mb-4">
              Extension Care
            </span>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-[1.1] mb-6">
              Recommended Products
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Extend the life of your extensions with our salon-exclusive, extension-safe products. Each product is specially formulated to nourish and protect both your natural hair and extensions.
            </p>
            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 border border-foreground text-foreground px-6 py-3 text-sm font-sans font-normal hover:bg-foreground hover:text-background transition-all duration-300"
            >
              <span>Shop in salon</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "Extension Shampoo", description: "Sulfate-free gentle cleanse", price: "$32" },
              { name: "Hydrating Conditioner", description: "Deep moisture treatment", price: "$34" },
              { name: "Detangling Spray", description: "Prevents matting & knots", price: "$28" },
              { name: "Heat Protectant", description: "Up to 450°F protection", price: "$26" }
            ].map((product, index) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-secondary/50 p-5 hover:bg-secondary transition-colors"
              >
                <div className="w-full aspect-square bg-oat/20 mb-3 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{product.description}</p>
                <p className="font-serif text-lg">{product.price}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* What to Expect - Appointment Walkthrough */}
      <Section className="bg-foreground text-background">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs uppercase tracking-[0.3em] text-background/60 font-sans block mb-4"
          >
            Your Visit
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight"
          >
            What to Expect
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-background/70 max-w-xl mx-auto"
          >
            A step-by-step walkthrough of your extension appointment from start to finish.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Arrive & Relax",
              description: "Enjoy a complimentary beverage while we prep your station and review your goals.",
              duration: "15 min"
            },
            {
              step: "02",
              title: "Color Matching",
              description: "We'll custom-blend your extensions to perfectly match your natural hair color.",
              duration: "30 min"
            },
            {
              step: "03",
              title: "Installation",
              description: "Precise placement of each row using our signature method.",
              duration: "2-3 hrs"
            },
            {
              step: "04",
              title: "Style & Educate",
              description: "Final styling, care instructions, and scheduling your first maintenance.",
              duration: "30 min"
            }
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="border border-background/20 p-6"
            >
              <span className="text-oat font-serif text-3xl block mb-4">{item.step}</span>
              <h3 className="font-medium text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-background/70 leading-relaxed mb-4">{item.description}</p>
              <span className="text-xs uppercase tracking-wider text-background/50">{item.duration}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            to="/booking"
            className="group inline-flex items-center gap-3 bg-oat text-oat-foreground px-8 py-4 text-sm font-sans font-normal hover:bg-oat/90 transition-all duration-300"
          >
            <span>Book your appointment</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </Section>

      {/* Extension Reviews Section */}
      <ExtensionReviewsSection />

      {/* FAQ Section */}
      <Section sectionRef={faqRef} className="bg-secondary/30">
        {/* Header Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-12">
          {/* Left Column - Intro */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-display block mb-4">
              Questions
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display mb-6">
              Extension FAQ
            </h2>
            
            <div className="space-y-4 text-foreground/80 mb-8">
              <p>
                Everything you need to know about hair extensions and our signature method. 
                Have more questions? Book a consultation and we'll answer them all.
              </p>
            </div>

            <Link
              to="/booking"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-sm font-sans font-normal hover:bg-foreground/90 transition-all duration-300"
            >
              <span>Book a consultation</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right Column - Search */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            className="flex items-start"
          >
            <div className="w-full">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search extension questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Results count */}
              {searchQuery && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground mt-4"
                >
                  {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
                </motion.p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Full Width FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={faqInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <AccordionItem
                    value={`item-${index}`}
                    className="bg-background border border-border px-6 data-[state=open]:border-foreground/20 transition-all duration-300 hover:bg-secondary hover:border-foreground/20"
                  >
                    <AccordionTrigger className="text-left text-base md:text-lg font-medium py-5 hover:no-underline">
                      {highlightText(faq.question, searchQuery)}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground/80 pb-5 leading-relaxed">
                      {highlightText(faq.answer, searchQuery)}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <p className="text-lg mb-2">No matching questions found</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </motion.div>
            )}
          </Accordion>
        </motion.div>
      </Section>
    </Layout>
  );
}
