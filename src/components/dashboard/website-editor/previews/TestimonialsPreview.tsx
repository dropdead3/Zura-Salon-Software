import { Star, ExternalLink, Quote } from 'lucide-react';
import type { TestimonialsConfig } from '@/hooks/useSectionConfig';

interface TestimonialsPreviewProps {
  config: TestimonialsConfig;
}

function TestimonialCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 min-w-[280px]">
      {/* Stars */}
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      
      {/* Quote */}
      <Quote className="h-6 w-6 text-muted-foreground/30" />
      
      {/* Text */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        "Amazing experience! The stylist understood exactly what I wanted and exceeded my expectations."
      </p>
      
      {/* Author */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div>
          <p className="text-sm font-medium text-foreground">Sarah M.</p>
          <p className="text-xs text-muted-foreground">2 weeks ago</p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsPreview({ config }: TestimonialsPreviewProps) {
  return (
    <section data-theme="light" className="bg-background py-20 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Eyebrow */}
          <p className="text-sm font-display uppercase tracking-wider text-muted-foreground mb-4">
            {config.eyebrow}
          </p>

          {/* Headline */}
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-tight mb-6">
            {config.headline}
          </h2>

          {/* Verified Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{config.verified_badge_text}</span>
          </div>
        </div>

        {/* Sample Testimonial Cards */}
        <div className="flex gap-4 mb-10 overflow-hidden">
          <TestimonialCard />
          <TestimonialCard />
          <TestimonialCard />
        </div>

        {/* Google Review Link */}
        <div className="text-center">
          <a 
            href="#" 
            className="inline-flex items-center gap-2 text-sm text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
          >
            {config.link_text}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
