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
import { useFAQConfig } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { useVisibleFAQItems } from "@/hooks/useFAQItems";
import { InlineEditableText } from "@/components/home/InlineEditableText";

type FAQRow = { id: string; question: string; answer: string; category?: string | null; sort_order?: number };

// Empty fallback — when an org has no FAQ items configured, the section
// silently hides the accordion (chrome remains so editors can still see it
// in the live preview while drafting their first questions).
const EMPTY_FAQS: FAQRow[] = [];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [searchQuery, setSearchQuery] = useState("");
  const [openItem, setOpenItem] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Config-driven chrome with live-edit bridge override
  const { data: dbConfig } = useFAQConfig();
  const config = useLiveOverride('section_faq', dbConfig) ?? dbConfig;

  // Items come from website_faq_items, with a live-edit override so the
  // FAQItemsManager can stream unsaved drafts into the preview iframe.
  const { data: dbItems } = useVisibleFAQItems();
  const items = useLiveOverride<FAQRow[]>('faq_items', dbItems ?? EMPTY_FAQS) ?? dbItems ?? EMPTY_FAQS;

  const rotatingWords = config.show_rotating_words && config.rotating_words.length > 0
    ? config.rotating_words
    : [""];
  const faqs = items;

  // Reset typewriter index if rotating-words list shrinks while editing
  useEffect(() => {
    if (currentWordIndex >= rotatingWords.length) {
      setCurrentWordIndex(0);
      setDisplayText("");
      setIsDeleting(false);
    }
  }, [rotatingWords.length, currentWordIndex]);

  // Typewriter effect with natural variation
  useEffect(() => {
    const currentWord = rotatingWords[currentWordIndex] ?? "";
    const baseTypingSpeed = 100;
    const baseDeletingSpeed = 60;
    const pauseDuration = 2500;

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
  }, [displayText, isDeleting, currentWordIndex, rotatingWords]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;

    const query = searchQuery.toLowerCase();
    return faqs.filter(
      faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, faqs]);

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
              {config.show_rotating_words && (
                <>
                  <span className="font-light">{displayText}</span>
                  <br />
                </>
              )}
              Questions
            </h2>

            {config.show_intro_paragraphs && config.intro_paragraphs.length > 0 && (
              <div className="space-y-4 text-foreground/80 mb-8">
                {config.intro_paragraphs.map((paragraph, i) => (
                  <p key={i}>
                    <InlineEditableText
                      value={paragraph}
                      sectionKey="section_faq"
                      fieldPath={`intro_paragraphs.${i}`}
                      placeholder="Paragraph text"
                      multiline
                    />
                  </p>
                ))}
              </div>
            )}

            {(config.show_primary_cta || config.show_secondary_cta) && (
              <div className="flex flex-wrap gap-4">
                {config.show_primary_cta && config.cta_primary_text && (
                  <Link
                    to={config.cta_primary_url || "/faq"}
                    className="group/faq inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-all duration-300 overflow-hidden"
                  >
                    <span>
                      <InlineEditableText
                        value={config.cta_primary_text}
                        sectionKey="section_faq"
                        fieldPath="cta_primary_text"
                        placeholder="Button text"
                      />
                    </span>
                    <ArrowRight className="w-0 h-4 opacity-0 group-hover/faq:w-4 group-hover/faq:ml-2 group-hover/faq:opacity-100 transition-all duration-300" />
                  </Link>
                )}
                {config.show_secondary_cta && config.cta_secondary_text && (
                  <Link
                    to={config.cta_secondary_url || "/policies"}
                    className="group/policies inline-flex items-center justify-center px-6 py-3 border border-border bg-background text-foreground text-sm font-medium rounded-full hover:border-foreground transition-all duration-300 overflow-hidden"
                  >
                    <span>{config.cta_secondary_text}</span>
                    <ArrowRight className="w-0 h-4 opacity-0 group-hover/policies:w-4 group-hover/policies:ml-2 group-hover/policies:opacity-100 transition-all duration-300" />
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* Right Column - Search & Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            className="overflow-hidden"
          >
            {/* Search Input */}
            {config.show_search_bar && (
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={config.search_placeholder || "Search questions..."}
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
            )}

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
