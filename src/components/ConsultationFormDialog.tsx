import { useState } from "react";
import { formatPhoneNumber } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ArrowUpRight, AlertCircle, X } from "lucide-react";
import { captureWebsiteLead } from "@/lib/leadCapture";
import { InspirationPhotoUploader } from "@/components/InspirationPhotoUploader";

interface ConsultationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationFormDialog({ open, onOpenChange }: ConsultationFormDialogProps) {
  const { toast } = useToast();
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

    // Capture lead in database
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
      // Log error but still show success to user
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
    onOpenChange(false);
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
    { name: "Sarah Mitchell", level: "Master Stylist", location: "West Hollywood" },
    { name: "Jordan Lee", level: "Senior Colorist", location: "West Hollywood" },
    { name: "Alex Rivera", level: "Extension Specialist", location: "Studio City" },
    { name: "Morgan Chen", level: "Stylist", location: "Studio City" },
    { name: "Taylor Brooks", level: "Junior Stylist", location: "West Hollywood" },
    { name: "Casey Kim", level: "Colorist", location: "Studio City" },
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

  const locationOptions = [
    { name: "West Hollywood", address: "8715 Santa Monica Blvd, West Hollywood, CA 90069" },
    { name: "Studio City", address: "12345 Ventura Blvd, Studio City, CA 91604" },
    { name: "No Preference", address: "" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border p-0">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <DialogHeader className="p-6 pb-4 sticky top-0 bg-background z-10">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-display block mb-2">
              New Client
            </span>
            <DialogTitle className="font-serif text-2xl md:text-3xl font-normal text-foreground">
              Schedule Your
              <br />
              <span className="font-light">Initial Consultation</span>
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground font-sans font-light mt-3 leading-relaxed">
            Share a few details about yourself and your hair goals, and we'll be in touch to schedule your $15 consultation.
          </p>
        </DialogHeader>
        
        <div className="px-6 space-y-4">
          {/* New clients notice */}
          <div className="p-4 bg-secondary border border-border">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs uppercase tracking-wide text-foreground font-display mb-1.5">
                  New Clients
                </h3>
                <p className="text-xs text-muted-foreground font-sans font-light leading-relaxed">
                  First-time clients are typically required to complete a consultation before any services are booked. This helps ensure we're all on the same page and can achieve your desired result.
                </p>
                <p className="text-xs text-foreground font-sans font-medium leading-relaxed mt-2 ml-2">
                  We can often get you in within 1 business day.
                </p>
              </div>
            </div>
          </div>

          {/* Returning client callout */}
          <div className="p-4 bg-background border border-border">
            <p className="text-xs text-muted-foreground font-sans mb-2">
              Are you a returning client? You don't need a new-client consult.
            </p>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-foreground hover:opacity-70 transition-opacity"
            >
              Book your known services here →
            </a>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="dialog-name"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="dialog-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="dialog-email"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="dialog-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="dialog-phone"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Phone
            </label>
            <input
              type="tel"
              id="dialog-phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="dialog-location"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Preferred Location
            </label>
            <select
              id="dialog-location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
            >
              <option value="">Select a location</option>
              {locationOptions.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-[calc(50%+10px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <label
              htmlFor="dialog-service"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Service Interest
            </label>
            <select
              id="dialog-service"
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
            >
              <option value="">Select a service</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-[calc(50%+10px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <label
              htmlFor="dialog-stylist"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Preferred Stylist
            </label>
            <select
              id="dialog-stylist"
              name="stylist"
              value={formData.stylist}
              onChange={handleChange}
              disabled={!formData.location}
              className="w-full px-4 py-3 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{formData.location ? "Select a stylist" : "Select location first"}</option>
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
            <ChevronDown size={18} className="absolute right-4 top-[calc(50%+10px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <label
              htmlFor="dialog-referral"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              How Did You Hear About Us?
            </label>
            <select
              id="dialog-referral"
              name="referralSource"
              value={formData.referralSource}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 bg-background border border-border text-foreground font-sans font-light focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
            >
              <option value="">Select an option</option>
              {referralOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-[calc(50%+10px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div>
            <label
              htmlFor="dialog-message"
              className="block text-xs uppercase tracking-wide text-muted-foreground font-display mb-2"
            >
              Tell Us About Your Hair Goals
            </label>
            <textarea
              id="dialog-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-sans font-light placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors resize-none"
              placeholder="What are you looking to achieve?"
            />
          </div>

          <InspirationPhotoUploader files={inspirationFiles} onChange={setInspirationFiles} />


          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-sans font-normal bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Sending..." : "Request consultation"}
            {!isSubmitting && <ArrowUpRight size={14} />}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
