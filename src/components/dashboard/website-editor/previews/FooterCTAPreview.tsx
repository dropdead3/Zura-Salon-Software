import { ArrowRight, Phone } from 'lucide-react';
import type { FooterCTAConfig } from '@/hooks/useSectionConfig';

interface FooterCTAPreviewProps {
  config: FooterCTAConfig;
}

export function FooterCTAPreview({ config }: FooterCTAPreviewProps) {
  // Sample location data for preview
  const sampleLocations = [
    { name: 'Downtown', phone: '(555) 123-0001' },
    { name: 'Eastside', phone: '(555) 123-0002' },
  ];

  return (
    <section data-theme="light" className="bg-background py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-6">
          {config.eyebrow}
        </p>

        {/* Headlines */}
        <h2 className="font-display text-5xl md:text-6xl text-foreground leading-[0.95] mb-6">
          <span className="block">{config.headline_line1}</span>
          <span className="block text-muted-foreground">{config.headline_line2}</span>
        </h2>

        {/* Description */}
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 text-sm leading-relaxed">
          {config.description}
        </p>

        {/* CTA Button */}
        <button className="group px-8 py-4 bg-foreground text-background rounded-full text-base font-medium inline-flex items-center gap-2 hover:bg-foreground/90 transition-colors mb-8">
          {config.cta_text}
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Phone Numbers */}
        {config.show_phone_numbers && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 border-t border-border">
            {sampleLocations.map((location, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="font-medium">{location.name}:</span>
                <span>{location.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
