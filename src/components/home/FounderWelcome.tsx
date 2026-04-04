import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { DEFAULT_ORG_LOGO_LIGHT } from "@/lib/platform-assets";

interface FounderWelcomeConfig {
  founder_name?: string;
  founder_title?: string;
  heading?: string;
  body_paragraphs?: string[];
  headshot_url?: string;
  signature_url?: string;
  visible?: boolean;
}

export function FounderWelcome() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { data: config } = useSiteSettings<FounderWelcomeConfig>('founder_welcome');
  const { data: businessSettings } = useBusinessSettings();

  // If explicitly hidden or no config exists, don't render
  if (config?.visible === false) return null;

  const founderName = config?.founder_name || "Our Founder";
  const founderTitle = config?.founder_title || "Founder & Lead Stylist";
  const heading = config?.heading || "Welcome to Our Studio";
  const bodyParagraphs = config?.body_paragraphs || [
    "We created this space where artistry meets authenticity — a place where you can walk in feeling like yourself and leave feeling like the best version of yourself.",
    "Thank you for trusting us. We can't wait to meet you.",
  ];
  const headshotUrl = config?.headshot_url;
  const signatureUrl = config?.signature_url;
  const businessName = businessSettings?.business_name || "Our Studio";

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl p-8 md:p-12 lg:p-16 border border-border"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 items-center">
            {/* Left Column - Founder Photo (1/3) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex justify-center md:justify-center"
            >
              {headshotUrl ? (
                <img
                  src={headshotUrl}
                  alt={`${founderName}, ${founderTitle}`}
                  className="w-36 h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-36 h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl bg-muted flex items-center justify-center">
                  <img
                    src={DEFAULT_ORG_LOGO_LIGHT}
                    alt={businessName}
                    className="w-20 h-20 object-contain opacity-30"
                  />
                </div>
              )}
            </motion.div>

            {/* Right Column - Welcome Message (2/3) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="md:col-span-2 text-center md:text-left"
            >
              <span className="inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 px-3 py-1.5 bg-background rounded-full">
                A Note From Our Founder
              </span>
              <h2 className="text-3xl md:text-4xl font-display mb-6">
                {heading}
              </h2>
              {bodyParagraphs.map((paragraph, i) => (
                <p key={i} className="text-foreground/70 text-lg leading-relaxed mb-6">
                  {paragraph}
                </p>
              ))}

              {/* Signature */}
              <div className="flex flex-col items-center md:items-start">
                {signatureUrl && (
                  <img
                    src={signatureUrl}
                    alt={`${founderName} signature`}
                    className="h-28 md:h-36 lg:h-44 w-auto mb-2"
                  />
                )}
                <p className="text-sm font-medium text-foreground">{founderName}</p>
                <p className="text-sm text-muted-foreground">
                  {founderTitle}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
