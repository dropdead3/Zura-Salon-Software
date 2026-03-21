import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, X, ArrowRight, ChevronUp } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do the salons accept walk-ins?",
    answer: "At this time, we do not accept walk-ins. All appointments must be scheduled in advance, and an initial consultation is required or must be waived by the stylist matched to you. This ensures you're paired with the right artist and receive the personalized service you deserve."
  },
  {
    question: "Will I need a consultation?",
    answer: "For most color services, extensions, and major transformations, yes. Consultations help us understand your hair history, assess its current condition, and create a personalized plan. Some services like trims or blowouts may not require one—your stylist will let you know."
  },
  {
    question: "Does it matter which location I arrive at for my appointment?",
    answer: "Yes! Please arrive at the specific location where your appointment is booked. Our stylists work at designated locations, so showing up at the correct salon ensures you're seen on time by your scheduled artist."
  },
  {
    question: "What's the vibe like at each salon?",
    answer: "Both locations share the same commitment to quality and creativity, but each has its own unique atmosphere. Val Vista Lakes has a more intimate, boutique feel, while North Mesa offers a larger, energetic space. We recommend visiting both to see which vibe resonates with you!"
  },
  {
    question: "What is your cancellation policy?",
    answer: "We require 48 hours notice for cancellations or rescheduling. Late cancellations or no-shows may result in a fee equal to 50% of the scheduled service. We understand life happens—just communicate with us as early as possible."
  },
  {
    question: "How do I book an appointment?",
    answer: "You can book directly through our website by visiting the booking page, or reach out to us via email or phone. New clients should fill out our consultation form first so we can match you with the perfect stylist."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, Apple Pay, Google Pay, and cash. A deposit may be required for certain services at the time of booking."
  }
];

const rotatingWords = ["Asked", "Answered"];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [searchQuery, setSearchQuery] = useState("");
  const [openItem, setOpenItem] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect with natural variation
  useEffect(() => {
    const currentWord = rotatingWords[currentWordIndex];
    const baseTypingSpeed = 100;
    const baseDeletingSpeed = 60;
    const pauseDuration = 2500;

    // Add random variation for natural feel
    const getTypingSpeed = () => baseTypingSpeed + Math.random() * 80 - 40;
    const getDeletingSpeed = () => baseDeletingSpeed + Math.random() * 30 - 15;

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, getTypingSpeed());
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, getDeletingSpeed());
      } else {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentWordIndex]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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

  return (
    <section 
      ref={sectionRef}
      data-theme="light"
      className="py-20 lg:py-32"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Column - Intro */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display mb-6">
              Frequently<br />
              <span className="font-light">{displayText}</span>
              <br />
              Questions
            </h2>
            
            <div className="space-y-4 text-foreground/80 mb-8">
              <p>
                At our studio, it's simple—Death to Bad Hair is more than a motto; it's our mission.
              </p>
              <p>
                We're here to deliver bold transformations and flawless results with every visit. Our policies help keep things smooth, respectful of everyone's time, and ensure you always leave loving your hair. Take a moment to review our FAQs and policies—because great hair days shouldn't come with surprises, just killer confidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/faq"
                className="group/faq inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-all duration-300 overflow-hidden"
              >
                <span>See All FAQ's</span>
                <ArrowRight className="w-0 h-4 opacity-0 group-hover/faq:w-4 group-hover/faq:ml-2 group-hover/faq:opacity-100 transition-all duration-300" />
              </Link>
              <Link
                to="/policies"
                className="group/policies inline-flex items-center justify-center px-6 py-3 border border-border bg-background text-foreground text-sm font-medium rounded-full hover:border-foreground transition-all duration-300 overflow-hidden"
              >
                <span>Salon Policies</span>
                <ArrowRight className="w-0 h-4 opacity-0 group-hover/policies:w-4 group-hover/policies:ml-2 group-hover/policies:opacity-100 transition-all duration-300" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Search & Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            className="overflow-hidden"
          >
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
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
                className="text-sm text-muted-foreground mb-4"
              >
                {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'} found
              </motion.p>
            )}

            {/* FAQ Accordion */}
            <Accordion type="single" collapsible className="space-y-3" value={openItem} onValueChange={setOpenItem}>
              <AnimatePresence mode="popLayout">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <motion.div
                      key={faq.question}
                      initial={{ opacity: 0, x: 100 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ 
                        duration: 0.9, 
                        delay: 0.4 + index * 0.18,
                        ease: [0.25, 0.1, 0.25, 1]
                      }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="cursor-pointer"
                    >
                      <AccordionItem
                        value={faq.question}
                        className="bg-background border border-border rounded-xl px-6 data-[state=open]:border-foreground/20 transition-all duration-300 hover:bg-secondary hover:border-foreground/20 hover:shadow-md"
                      >
                        <AccordionTrigger className="text-left text-base md:text-lg font-sans font-medium py-5 hover:no-underline group">
                          {highlightText(faq.question, searchQuery)}
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
                              {highlightText(faq.answer, searchQuery)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 group-hover/content:opacity-100 transition-opacity">
                              <ChevronUp className="w-3 h-3" />
                              <span>Click to close</span>
                            </div>
                          </div>
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
              </AnimatePresence>
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
