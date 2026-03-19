import { useState, useRef } from "react";
import { formatPhoneNumber } from "@/lib/utils";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X, CheckCircle, Calendar, GraduationCap, Heart, Users, Camera, Settings, Award, UsersRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ApplicationForm({ onClose }: { onClose: () => void }) {
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
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

export function JoinTeamSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-secondary">
      <div className="container mx-auto px-6">
        <AnimatePresence mode="wait">
          {!isFormOpen ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-7xl mx-auto text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-foreground/50" />
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-display">
                  Join Our Team
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display mb-6">
                Work With Us
              </h2>
              <p className="text-lg text-foreground/60 mb-8 max-w-xl mx-auto">
                Are you a passionate stylist looking for your next opportunity? 
                We're always looking for talented artists who share our vision for excellence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-full px-8 py-3.5 text-sm font-medium hover:bg-foreground/90 transition-colors group"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
              
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left w-full">
              {[
                { icon: Calendar, title: "Flexible Schedule", desc: "Build your ideal work-life balance with flexible booking options." },
                { icon: GraduationCap, title: "Education & Growth", desc: "Access ongoing training, workshops, and industry certifications." },
                { icon: Heart, title: "Supportive Culture", desc: "Join a collaborative team that celebrates your success." },
                { icon: Users, title: "Client Leads", desc: "We bring clients to you through marketing and referrals." },
                { icon: Camera, title: "Pro Photo Equipment", desc: "Access professional lighting and equipment for stunning content." },
                { icon: Settings, title: "Advanced Systems", desc: "Streamlined booking, payments, and client management tools." },
                { icon: Award, title: "Industry Events", desc: "Attend shows, competitions, and networking opportunities." },
                { icon: UsersRound, title: "Monthly Team Meetings", desc: "Stay connected with regular team gatherings and updates." },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="bg-background rounded-2xl p-10 md:p-12 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-6">
                    <benefit.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-display text-xl mb-3">{benefit.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-2xl mx-auto relative"
            >
              <button
                onClick={() => setIsFormOpen(false)}
                className="absolute -top-2 right-0 rounded-full p-2 bg-foreground/5 hover:bg-foreground/10 transition-colors"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
              
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-foreground/50" />
                  <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-display">
                    Join Our Team
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display mb-3">
                  Apply Now
                </h2>
                <p className="text-foreground/60 text-sm">
                  Fill out the form below and we'll be in touch soon.
                </p>
              </div>
              
              <ApplicationForm onClose={() => setIsFormOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
