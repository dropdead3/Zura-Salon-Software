import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Section } from "@/components/ui/section";
import { motion } from "framer-motion";
import { useState } from "react";
import { formatPhoneNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Mail, Phone, ArrowUpRight, ChevronDown, AlertCircle } from "lucide-react";
import { captureWebsiteLead } from "@/lib/leadCapture";
import { InspirationPhotoUploader } from "@/components/InspirationPhotoUploader";
import { useActiveLocations, formatHoursForDisplay, getClosedDays } from "@/hooks/useLocations";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export default function Booking() {
  const { toast } = useToast();
  const { data: dbLocations = [] } = useActiveLocations();
  const { data: businessSettings } = useBusinessSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    service: "",
    stylist: "",
    referralSource: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "location") {
      setFormData({ ...formData, location: value, stylist: "" });
    } else if (name === "phone") {
      setFormData({ ...formData, phone: formatPhoneNumber(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await captureWebsiteLead({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      service: formData.service,
      stylist: formData.stylist,
      referralSource: formData.referralSource,
      message: formData.message,
      inspirationFiles,
    });

    if (result.success) {
      toast({
        title: "Request Received",
        description: "We'll be in touch within 24 hours to confirm your appointment.",
      });
    } else {
      toast({
        title: "Request Received",
        description: "We'll be in touch within 24 hours to confirm your appointment.",
      });
      console.error('Lead capture failed:', result.error);
    }

    setFormData({
      name: "",
      email: "",
      phone: "",
      location: "",
      service: "",
      stylist: "",
      referralSource: "",
      message: "",
    });
    setInspirationFiles([]);
    setIsSubmitting(false);
  };

  const serviceOptions = [
    "Color & Blonding",
    "Extensions",
    "Cutting & Styling",
    "Treatments & Care",
    "Consultation",
    "Not sure yet",
  ];

  const stylistOptions = [
    { name: "Soonest Available", level: "", location: "all" },
    { name: "No Preference", level: "", location: "all" },
  ];

  const referralOptions = [
    "Instagram",
    "TikTok",
    "Google Search",
    "Friend or Family",
    "Yelp",
    "Another Stylist",
    "Walk-in",
    "Other",
  ];

  // Build location options from DB
  const locationOptions = [
    ...dbLocations.map(loc => ({
      name: loc.name,
      address: [loc.address, loc.city].filter(Boolean).join(", "),
    })),
    { name: "No Preference", address: "" },
  ];

  const businessEmail = businessSettings?.email || null;

  return (
    <Layout>
      <SEO 
        title="Schedule Your Initial Consultation"
        description="Schedule your initial consultation. New clients begin with a consultation to discuss your hair goals."
      />
      {/* Hero */}
      <section className="pt-32 lg:pt-40 pb-16 lg:pb-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-xs uppercase tracking-wide text-muted-foreground font-display block mb-6"
            >
              New Clients
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-[1.1]"
            >
              Schedule Your
              <br />
              <span className="font-light">Initial Consultation</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 text-base md:text-lg text-muted-foreground font-sans font-light max-w-lg"
            >
              Share a few details about yourself and your hair goals, and we'll be in touch to schedule your consultation.
            </motion.p>
            {/* New clients notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 p-5 bg-secondary border border-border"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm uppercase tracking-wide text-foreground font-display mb-2">
                    New Clients
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans font-light leading-relaxed">
                    First-time clients are typically required to complete a consultation before any services are booked. This helps ensure we're all on the same page and can achieve your desired result.
                  </p>
                  <p className="text-sm text-foreground font-sans font-medium leading-relaxed mt-2 ml-2">
                    We can often get you in within 1 business day.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Returning client callout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 p-5 bg-background border border-border inline-block"
            >
              <p className="text-sm text-muted-foreground font-sans">
                Are you a returning client? You don't need a new-client consult.
              </p>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-sans font-medium text-foreground hover:opacity-70 transition-opacity"
              >
                Book your known services here →
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form & Details */}
      <Section className="pt-0">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-4 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-4 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="location"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Which Location Do You Prefer?
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-4 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select a location</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}{loc.address ? ` — ${loc.address}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-[calc(50%+12px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <label
                  htmlFor="service"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Service Interest
                </label>
                <select
                  id="service"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-4 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select a service</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-[calc(50%+12px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <label
                  htmlFor="stylist"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Preferred Stylist
                </label>
                <select
                  id="stylist"
                  name="stylist"
                  value={formData.stylist}
                  onChange={handleChange}
                  disabled={!formData.location}
                  className="w-full px-4 py-4 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.location ? "Select a stylist" : "Please select a location first"}</option>
                  {stylistOptions
                    .filter(stylist => 
                      stylist.location === "all" || 
                      stylist.location === formData.location ||
                      formData.location === "No Preference"
                    )
                    .map((stylist) => (
                      <option key={stylist.name} value={stylist.name}>
                        {stylist.name}{stylist.level ? ` — ${stylist.level}` : ""}
                      </option>
                    ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-[calc(50%+12px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <label
                  htmlFor="referralSource"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  How Did You Hear About Us?
                </label>
                <select
                  id="referralSource"
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleChange}
                  className="w-full px-4 py-4 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select an option</option>
                  {referralOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-[calc(50%+12px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-3"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-4 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors resize-none"
                  placeholder="Tell us about your hair goals..."
                />
              </div>

              <InspirationPhotoUploader files={inspirationFiles} onChange={setInspirationFiles} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-sans font-normal bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Sending..." : "Request appointment"}
                {!isSubmitting && <ArrowUpRight size={14} />}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground font-sans font-light text-center">
              Not sure what to book?{" "}
              <span className="text-foreground">Start with a consultation.</span>
            </p>
          </motion.div>

          {/* Salon Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:pl-12 lg:border-l lg:border-border"
          >
            <h2 className="font-serif text-2xl font-normal text-foreground mb-8">
              Visit the Salon
            </h2>

            <div className="space-y-10">
              {/* Dynamic Locations */}
              {dbLocations.length > 0 ? (
                dbLocations.map((loc) => (
                  <div key={loc.id} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <MapPin size={20} className="text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm uppercase tracking-wide text-foreground font-display mb-2">
                          {loc.name}
                        </h3>
                        <p className="text-muted-foreground font-sans font-light">
                          {loc.address}
                          {loc.city && (
                            <>
                              <br />
                              {loc.city}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {loc.phone && (
                      <div className="flex items-start gap-4 ml-9">
                        <Phone size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <a
                          href={`tel:${loc.phone.replace(/[^0-9+]/g, "")}`}
                          className="text-muted-foreground font-sans font-light hover:text-foreground transition-colors text-sm"
                        >
                          {loc.phone}
                        </a>
                      </div>
                    )}
                    {loc.hours_json && (
                      <div className="flex items-start gap-4 ml-9">
                        <Clock size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-muted-foreground font-sans font-light text-sm space-y-1">
                          <p>{formatHoursForDisplay(loc.hours_json)}</p>
                          {getClosedDays(loc.hours_json) && (
                            <p>{getClosedDays(loc.hours_json)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground font-sans font-light">
                  Contact us for location details.
                </p>
              )}

              {/* Email */}
              {businessEmail && (
                <div className="flex items-start gap-4">
                  <Mail size={20} className="text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm uppercase tracking-wide text-foreground font-display mb-2">
                      Email
                    </h3>
                    <a
                      href={`mailto:${businessEmail}`}
                      className="text-muted-foreground font-sans font-light hover:text-foreground transition-colors"
                    >
                      {businessEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </div>
      </Section>
    </Layout>
  );
}
