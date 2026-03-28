import { Star, Award, MapPin } from 'lucide-react';
import type { ExtensionsConfig, ExtensionsFeature } from '@/hooks/useSectionConfig';

interface ExtensionsPreviewProps {
  config: ExtensionsConfig;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Award,
  MapPin,
};

function FeatureCard({ feature }: { feature: ExtensionsFeature }) {
  const Icon = iconMap[feature.icon] || Star;
  
  return (
    <div className="bg-background/10 rounded-xl p-4 space-y-2">
      <Icon className="h-5 w-5 text-background" />
      <h4 className="font-display text-sm text-background">{feature.title}</h4>
      <p className="text-xs text-background/70 leading-relaxed">{feature.description}</p>
    </div>
  );
}

export function ExtensionsPreview({ config }: ExtensionsPreviewProps) {
  return (
    <section data-theme="light" className="bg-foreground text-background py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="px-4 py-1.5 bg-background/10 rounded-full text-xs font-display uppercase tracking-wider text-background/80">
            {config.badge_text}
          </span>
        </div>

        {/* Eyebrow */}
        <p className="text-center text-sm font-display uppercase tracking-wider text-background/60 mb-4">
          {config.eyebrow}
        </p>

        {/* Headlines */}
        <h2 className="font-display text-4xl md:text-5xl text-center text-background leading-tight mb-6">
          <span className="block">{config.headline_line1}</span>
          <span className="block text-background/60">{config.headline_line2}</span>
        </h2>

        {/* Description */}
        <p className="text-center text-background/70 max-w-xl mx-auto mb-10 text-sm leading-relaxed">
          {config.description}
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {config.features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button className="px-6 py-3 bg-background text-foreground rounded-full text-sm font-medium hover:bg-background/90 transition-colors">
            {config.cta_primary}
          </button>
          <button className="px-6 py-3 border border-background/30 text-background rounded-full text-sm font-medium hover:bg-background/10 transition-colors">
            {config.cta_secondary}
          </button>
        </div>

        {/* Education Link */}
        <p className="text-center mt-6 text-xs text-background/50 underline underline-offset-4">
          {config.education_link_text}
        </p>
      </div>
    </section>
  );
}
