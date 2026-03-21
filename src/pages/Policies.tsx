import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, X, ArrowLeft, ChevronUp } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";

interface Policy {
  question: string;
  answer: string | string[];
  category: string;
}

const policies: Policy[] = [
  // Consultations
  {
    category: "Consultations & Service Agreements",
    question: "Do I need a consultation before booking?",
    answer: [
      "All new clients must complete an in-person consultation prior to booking select services.",
      "Consultations include discussion of goals and expectations, review of inspiration photos, professional assessment and strand testing when needed, and honest guidance regarding realistic timelines and possibilities.",
      "Consultations last 15 to 20 minutes. If a stylist is not the best fit for your needs, you will be referred to another stylist with notes documented for continuity."
    ]
  },
  {
    category: "Consultations & Service Agreements",
    question: "Is there a consultation fee?",
    answer: "A $15 fee is required to secure the consultation appointment and collect card information. This fee is not applied to future services. At the stylist's discretion, the fee may be waived."
  },
  {
    category: "Consultations & Service Agreements",
    question: "What is the New-Client Service Agreement?",
    answer: "Before scheduling services, clients must sign a New-Client Service Agreement acknowledging all salon policies, valid card on file requirements, and cancellation, reschedule and no-show fees."
  },
  // Bookings
  {
    category: "Bookings & Appointments",
    question: "What do I need to book an appointment?",
    answer: [
      "A valid card on file is required for all bookings.",
      "Non-refundable deposits may be required for extensions, blonding transformations, color corrections and creative color services.",
      "Age requirements: extension services for ages 16+; color services for ages 13+."
    ]
  },
  // Cancellation
  {
    category: "Cancellation & No-Show Policy",
    question: "What is your cancellation policy?",
    answer: [
      "To ensure fairness to stylists and clients:",
      "• 72 hours or more: No fee",
      "• 24 to 72 hours: 50 percent of the scheduled service total",
      "• Less than 24 hours or no-show: 100 percent of the scheduled service total",
      "• Color correction cancellations within 24 hours: $250 fee",
      "Fees are not applied to future services. Rebooking after a fee requires a new deposit."
    ]
  },
  // Rescheduling
  {
    category: "Rescheduling Policy",
    question: "What happens if I need to reschedule?",
    answer: [
      "• 72 hours or more: No fee",
      "• 24 to 72 hours: 50 percent fee",
      "• Under 24 hours: 100 percent fee",
      "Repeated rescheduling (two or more consecutive reschedules) may result in a booking hold or refusal of future services."
    ]
  },
  // Late Arrival
  {
    category: "Late Arrival Policy",
    question: "What happens if I'm late to my appointment?",
    answer: "Arriving more than 15 minutes late may result in the appointment being cancelled at stylist discretion and a 50 percent fee applied."
  },
  // Service Adjustments
  {
    category: "Service Adjustments & Refunds",
    question: "What if I'm not satisfied with my service?",
    answer: [
      "Adjustment requests must be made within 72 hours and performed within 2 weeks.",
      "Complimentary adjustments cover minor refinements only, not changes of mind.",
      "Additional service time or additional product will incur charges.",
      "All service sales are final."
    ]
  },
  // Product Returns
  {
    category: "Product Returns & Exchanges",
    question: "What is your product return policy?",
    answer: [
      "• Unopened products: Refund within 7 days",
      "• Opened products: Store credit within 7 days if 90 percent of product remains",
      "• Hair extensions: Final sale unless unopened and returned within 30 days",
      "All returns require a receipt or proof of purchase."
    ]
  },
  // Payment
  {
    category: "Payment & Cards on File",
    question: "How does payment authorization work?",
    answer: "By booking an appointment, clients authorize the salon to securely store their card and charge applicable fees in accordance with policy."
  },
  // Creative Color
  {
    category: "Creative & Custom Color Policy",
    question: "What should I know about creative and vivid colors?",
    answer: [
      "Creative and vivid colors require more frequent maintenance, strict adherence to professional at-home care, and understanding that results are not guaranteed beyond the initial appointment.",
      "Multiple sessions may be required.",
      "No color services will be performed on clients under the age of 13."
    ]
  },
  // Extensions
  {
    category: "Hair Extensions Policy",
    question: "What are the extension deposit requirements?",
    answer: [
      "A non-refundable deposit is required for all new hair extension installations. This deposit secures your appointment, covers the cost of purchasing your custom-ordered hair, and is applied toward your installation service.",
      "Deposits are non-refundable and non-transferable for any reason, including cancellations or reschedules outside of policy windows.",
      "A new deposit is required if your appointment is rescheduled and falls outside approved policy guidelines."
    ]
  },
  {
    category: "Hair Extensions Policy",
    question: "What is the Extension Installation Agreement?",
    answer: [
      "All extension clients must sign a Hair Extension Installation Agreement & Liability Waiver before hair may be ordered or installed.",
      "This agreement confirms that the client understands required maintenance schedule, at-home care responsibilities, product usage guidelines, heat and styling restrictions, warranty limitations, deposit and cancellation policies, and risks associated with extension services.",
      "Extensions cannot be installed until this agreement has been completed and signed."
    ]
  },
  {
    category: "Hair Extensions Policy",
    question: "What voids the extension warranty?",
    answer: [
      "To maintain the integrity and longevity of your extensions, you must follow all at-home care guidelines, use only professional extension-safe products recommended by your stylist, brush gently and consistently using an approved extension brush, avoid excessive heat or tension, and keep up with required maintenance appointments.",
      "Warranty is voided by improper brushing, incorrect or non-recommended product use, excessive heat misuse, missed move-up/maintenance appointments, failure to follow styling or washing guidelines, and normal wear and tear.",
      "Adjustments or replacements due to improper care, client-caused damage or regular wear and tear are not covered under any warranty.",
      "No extension services will be performed on clients under the age of 16."
    ]
  },
  // Corrective Color
  {
    category: "Corrective Color Policy",
    question: "What should I expect with corrective color?",
    answer: [
      "Corrective color may require multiple sessions.",
      "Results are not guaranteed.",
      "Pricing is based on the time and product required per session.",
      "A plan and estimate will be reviewed during consultation."
    ]
  },
  // Photo Consent
  {
    category: "Social Media & Photo Consent",
    question: "Do you take photos for social media?",
    answer: [
      "With client consent, the salon may take photos or videos for marketing or portfolio use.",
      "Photos may include hair only or full face (depending on guest preference).",
      "Clients may decline photography at any time without explanation."
    ]
  },
  // Guests
  {
    category: "Guest & Children Policy",
    question: "Can I bring guests or children to my appointment?",
    answer: "No additional guests or children are permitted unless they are receiving a service."
  },
  // Health
  {
    category: "Health & Wellness Policy",
    question: "What if I'm feeling ill?",
    answer: "Clients who are ill must reschedule their appointment. Standard cancellation fees apply."
  },
  // Pricing
  {
    category: "Pricing & Transparency",
    question: "How is pricing determined?",
    answer: [
      "Pricing reflects time, product used, stylist experience, and service complexity.",
      "If services require more time or product than estimated, the final cost may exceed the original estimate. Clients are informed of adjustments as needed.",
      "By booking, clients agree to pricing discussed during consultation."
    ]
  },
  // Conduct
  {
    category: "Professional Conduct",
    question: "What behavior is expected in the salon?",
    answer: [
      "The salon maintains a respectful, inclusive and positive environment.",
      "Disrespectful, harassing or aggressive behavior will result in refusal of service.",
      "We reserve the right to deny service to any client for any lawful reason."
    ]
  },
  // Right to Refuse
  {
    category: "Right to Refuse Service",
    question: "Can the salon refuse service?",
    answer: "The salon reserves the right to refuse service for any lawful reason to protect the safety, culture and environment of the business."
  }
];

// Get unique categories
const categories = [...new Set(policies.map(p => p.category))];

export default function Policies() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [searchQuery, setSearchQuery] = useState("");
  const [openItem, setOpenItem] = useState<string>("");

  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return policies;
    
    const query = searchQuery.toLowerCase();
    return policies.filter(
      policy => 
        policy.question.toLowerCase().includes(query) ||
        (Array.isArray(policy.answer) 
          ? policy.answer.some(a => a.toLowerCase().includes(query))
          : policy.answer.toLowerCase().includes(query)) ||
        policy.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered policies by category
  const groupedPolicies = useMemo(() => {
    const groups: Record<string, Policy[]> = {};
    filteredPolicies.forEach(policy => {
      if (!groups[policy.category]) {
        groups[policy.category] = [];
      }
      groups[policy.category].push(policy);
    });
    return groups;
  }, [filteredPolicies]);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-oat/50 text-foreground px-0.5 rounded-sm">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderAnswer = (answer: string | string[], query: string) => {
    if (Array.isArray(answer)) {
      return (
        <div className="space-y-2">
          {answer.map((paragraph, idx) => (
            <p key={idx}>{highlightText(paragraph, query)}</p>
          ))}
        </div>
      );
    }
    return <p>{highlightText(answer, query)}</p>;
  };

  return (
    <Layout>
      <SEO 
        title="Salon Policies"
        description="Review our client policies including booking requirements, cancellation fees, extension warranties, and service agreements."
      />
      
      <section 
        ref={sectionRef}
        data-theme="light"
        className="py-20 lg:py-32 min-h-screen"
      >
        <div className="container mx-auto px-6">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left Column - Intro */}
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
              className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display mb-6">
                Salon<br />
                Policies
              </h1>
              
              <div className="space-y-4 text-foreground/80 mb-8">
                <p>
                  The following policies reflect our commitment to elevated hospitality, transparent communication and a seamless luxury guest experience.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please review these policies before your appointment. By booking with us, you agree to these terms.
                </p>
              </div>

              {/* Category Quick Links - Desktop */}
              <div className="hidden lg:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Jump to</p>
                <div className="flex flex-col gap-1">
                  {categories.slice(0, 8).map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        const element = document.getElementById(category.replace(/\s+/g, '-').toLowerCase());
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right Column - Search & Accordion */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
              className="lg:col-span-8 overflow-hidden"
            >
              {/* Search Input */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
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
                  className="text-sm text-muted-foreground mb-6"
                >
                  {filteredPolicies.length} {filteredPolicies.length === 1 ? 'result' : 'results'} found
                </motion.p>
              )}

              {/* Grouped Policy Accordions */}
              <div className="space-y-10">
                <AnimatePresence mode="popLayout">
                  {Object.keys(groupedPolicies).length > 0 ? (
                    Object.entries(groupedPolicies).map(([category, categoryPolicies], categoryIndex) => (
                      <motion.div
                        key={category}
                        id={category.replace(/\s+/g, '-').toLowerCase()}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                        className="scroll-mt-32"
                      >
                        <h2 className="text-lg font-display mb-4 text-foreground/90">
                          {highlightText(category, searchQuery)}
                        </h2>
                        
                        <Accordion 
                          type="single" 
                          collapsible 
                          className="space-y-3" 
                          value={openItem} 
                          onValueChange={setOpenItem}
                        >
                          {categoryPolicies.map((policy, index) => (
                            <motion.div
                              key={policy.question}
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                duration: 0.5, 
                                delay: 0.2 + index * 0.08,
                                ease: [0.25, 0.1, 0.25, 1]
                              }}
                              whileHover={{ scale: 1.005, x: 2 }}
                            >
                              <AccordionItem
                                value={policy.question}
                                className="bg-background border border-border rounded-xl px-6 data-[state=open]:border-foreground/20 transition-all duration-300 hover:bg-secondary hover:border-foreground/20 hover:shadow-md"
                              >
                                <AccordionTrigger className="text-left text-base font-sans font-medium py-5 hover:no-underline">
                                  {highlightText(policy.question, searchQuery)}
                                </AccordionTrigger>
                                <AccordionContent className="text-base text-foreground/80 font-sans font-normal pb-5 leading-relaxed">
                                  <div 
                                    className="cursor-pointer group/content"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenItem("");
                                    }}
                                  >
                                    <div className="mb-4">
                                      {renderAnswer(policy.answer, searchQuery)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 group-hover/content:opacity-100 transition-opacity">
                                      <ChevronUp className="w-3 h-3" />
                                      <span>Click to close</span>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </motion.div>
                          ))}
                        </Accordion>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <p className="text-lg mb-2">No matching policies found</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
